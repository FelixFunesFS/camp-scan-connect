import { useCallback, useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType, type Result } from '@zxing/library';
import {
  isValidCredentialFormat,
  looksLikeRetailBarcode,
  normalizeCredential,
} from '@/lib/credentialFormat';

/**
 * Formats actually printed on our wristbands, badges and confirmation emails.
 * Retail symbologies (EAN/UPC/ITF) are deliberately excluded: they produce
 * checksum-valid numeric ghost reads from blurry pre-autofocus frames.
 */
export const CAMERA_SUPPORTED_FORMATS = [
  BarcodeFormat.QR_CODE,
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.DATA_MATRIX,
];

/** Wide format set — diagnostics only (Scan Tester). */
export const CAMERA_DIAGNOSTIC_FORMATS = [
  ...CAMERA_SUPPORTED_FORMATS,
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.ITF,
  BarcodeFormat.PDF_417,
];

/** Same symbologies expressed for the native Shape Detection API. */
const NATIVE_SUPPORTED_FORMATS = ['qr_code', 'code_128', 'code_39', 'data_matrix'];
const NATIVE_DIAGNOSTIC_FORMATS = [
  ...NATIVE_SUPPORTED_FORMATS,
  'ean_13',
  'ean_8',
  'upc_a',
  'upc_e',
  'itf',
  'pdf417',
];

interface NativeDetectedBarcode {
  rawValue: string;
  format?: string;
}

interface NativeBarcodeDetectorCtor {
  new (options?: { formats?: string[] }): {
    detect: (source: CanvasImageSource) => Promise<NativeDetectedBarcode[]>;
  };
  getSupportedFormats?: () => Promise<string[]>;
}

/** Which decoding engine is currently driving the camera. */
export type ScanEngine = 'native' | 'zxing' | null;

/** Ignore repeat reads of the same code inside this window. */
const DUPLICATE_WINDOW_MS = 2500;
/** A payload must decode twice inside this window before we trust it. */
const CONFIRM_WINDOW_MS = 1500;
/** Ignore everything decoded while the camera is still focusing. */
const WARMUP_MS = 300;


export type DiscardReason = 'warmup' | 'unconfirmed' | 'retail-shape' | 'invalid-format';

interface UseBarcodeCameraOptions {
  /** Camera runs only while this is true. */
  active: boolean;
  /** Called with a normalized, format-validated payload. */
  onScan: (code: string) => void;
  /** Called when a code decoded but failed credential validation. */
  onInvalidRead?: (code: string) => void;
  /** Skip credential validation (diagnostics: report whatever was decoded). */
  acceptAnyPayload?: boolean;
  /** Enable the wide symbology set (diagnostics pages only). */
  diagnostics?: boolean;
  /** Observe reads that were decoded but thrown away, with the reason. */
  onDiscarded?: (code: string, reason: DiscardReason) => void;
}

/**
 * Shared ZXing continuous-decode camera controller: stream lifecycle, torch,
 * front/back switching, duplicate suppression and cleanup. Used by both the
 * full-screen LensScanner and the inline camera panel.
 */
export const useBarcodeCamera = ({
  active,
  onScan,
  onInvalidRead,
  acceptAnyPayload = false,
  diagnostics = false,
  onDiscarded,
}: UseBarcodeCameraOptions) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const lastReadRef = useRef<{ code: string; at: number } | null>(null);
  const pendingRef = useRef<{ code: string; at: number } | null>(null);
  const startedAtRef = useRef<number>(0);
  const nativeLoopRef = useRef<number | null>(null);

  const onScanRef = useRef(onScan);
  const onInvalidReadRef = useRef(onInvalidRead);
  const onDiscardedRef = useRef(onDiscarded);
  onScanRef.current = onScan;
  onInvalidReadRef.current = onInvalidRead;
  onDiscardedRef.current = onDiscarded;

  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [engine, setEngine] = useState<ScanEngine>(null);

  const handleDetected = useCallback(
    (raw: string) => {
      const code = normalizeCredential(raw);
      if (!code) return;

      const now = Date.now();

      // 1. Warm-up: autofocus has not settled yet, decodes are unreliable.
      if (startedAtRef.current && now - startedAtRef.current < WARMUP_MS) {
        onDiscardedRef.current?.(code, 'warmup');
        return;
      }

      // 2. Already handled this code very recently.
      const previous = lastReadRef.current;
      if (previous && previous.code === code && now - previous.at < DUPLICATE_WINDOW_MS) {
        return;
      }

      // 3. Confirmation: ambiguous payloads must decode twice in quick
      //    succession. A read that already matches our credential shape is
      //    high-confidence and fires immediately.
      const highConfidence = !looksLikeRetailBarcode(code) && isValidCredentialFormat(code);
      if (!highConfidence) {
        const pending = pendingRef.current;
        if (!pending || pending.code !== code || now - pending.at > CONFIRM_WINDOW_MS) {
          pendingRef.current = { code, at: now };
          onDiscardedRef.current?.(code, 'unconfirmed');
          return;
        }
      }
      pendingRef.current = null;
      lastReadRef.current = { code, at: now };


      if (!acceptAnyPayload) {
        // 4. Shape check — retail barcodes are never our credentials.
        if (looksLikeRetailBarcode(code)) {
          onDiscardedRef.current?.(code, 'retail-shape');
          onInvalidReadRef.current?.(code);
          return;
        }
        if (!isValidCredentialFormat(code)) {
          onDiscardedRef.current?.(code, 'invalid-format');
          onInvalidReadRef.current?.(code);
          return;
        }
      }

      onScanRef.current(acceptAnyPayload ? raw : code);
    },
    [acceptAnyPayload]
  );

  const stopCamera = useCallback(() => {
    if (nativeLoopRef.current) {
      cancelAnimationFrame(nativeLoopRef.current);
      nativeLoopRef.current = null;
    }
    controlsRef.current?.stop();
    controlsRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    startedAtRef.current = 0;
    pendingRef.current = null;
    setTorchOn(false);
    setTorchSupported(false);
    setEngine(null);
  }, []);

  useEffect(() => {
    if (!active) return;

    let cancelled = false;
    setIsStarting(true);
    setCameraError('');
    pendingRef.current = null;
    lastReadRef.current = null;

    const hints = new Map();
    hints.set(
      DecodeHintType.POSSIBLE_FORMATS,
      diagnostics ? CAMERA_DIAGNOSTIC_FORMATS : CAMERA_SUPPORTED_FORMATS
    );
    hints.set(DecodeHintType.TRY_HARDER, true);
    const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 60 });

    /**
     * Layer 1 — the browser's hardware-accelerated Shape Detection API.
     * On iOS 17+ (Apple Vision) and Android Chrome (MLKit) this runs the OS
     * vision model on the GPU/NPU. Those models are trained on real-world
     * curved, glossy and partly damaged labels, so they recover 1D codes
     * wrapped around a wrist that ZXing's straight scan-lines never see.
     * Also fully omnidirectional: rotation of the band does not matter.
     */
    const startNativeDetector = async (): Promise<boolean> => {
      const Detector = (window as unknown as { BarcodeDetector?: NativeBarcodeDetectorCtor })
        .BarcodeDetector;
      if (!Detector) return false;

      try {
        const supported = (await Detector.getSupportedFormats?.()) ?? [];
        const wanted = (diagnostics ? NATIVE_DIAGNOSTIC_FORMATS : NATIVE_SUPPORTED_FORMATS).filter(
          (f) => supported.includes(f)
        );
        // Without our linear symbologies the native path buys us nothing.
        if (!wanted.includes('code_128') && !wanted.includes('code_39')) return false;

        const detector = new Detector({ formats: wanted });
        const video = videoRef.current;
        if (!video) return false;

        let stopped = false;
        let inFlight = false;
        const tick = async () => {
          if (stopped || cancelled) return;
          if (!inFlight && video.readyState >= 2 && video.videoWidth > 0) {
            inFlight = true;
            try {
              const codes = await detector.detect(video);
              for (const c of codes) {
                if (c?.rawValue) handleDetected(c.rawValue);
              }
            } catch {
              /* transient frame errors are normal; keep scanning */
            } finally {
              inFlight = false;
            }
          }
          nativeLoopRef.current = requestAnimationFrame(tick);
        };
        nativeLoopRef.current = requestAnimationFrame(tick);
        controlsRef.current = {
          stop: () => {
            stopped = true;
            if (nativeLoopRef.current) cancelAnimationFrame(nativeLoopRef.current);
            nativeLoopRef.current = null;
          },
        };
        setEngine('native');
        return true;
      } catch (err) {
        console.warn('Native BarcodeDetector unavailable, falling back to ZXing:', err);
        return false;
      }
    };

    const start = async () => {
      try {
        // Layer 3 — high resolution keeps the narrow bars resolvable where the
        // band curves away from the lens; continuous focus stops the phone
        // parking at infinity when held 6-8in from a wrist.
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode,
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 30 },
            advanced: [{ focusMode: 'continuous' }],
          } as MediaTrackConstraints,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;

        const track = stream.getVideoTracks()[0];
        const capabilities = (track?.getCapabilities?.() ?? {}) as MediaTrackCapabilities & {
          torch?: boolean;
          focusMode?: string[];
        };
        setTorchSupported(Boolean(capabilities.torch));

        // Best-effort continuous autofocus on devices that only accept it
        // through applyConstraints rather than at getUserMedia time.
        if (capabilities.focusMode?.includes('continuous')) {
          try {
            await track.applyConstraints({
              advanced: [{ focusMode: 'continuous' }],
            } as unknown as MediaTrackConstraints);
          } catch {
            /* ignore — not fatal */
          }
        }

        if (!videoRef.current) return;
        startedAtRef.current = Date.now();

        // Native engine needs the stream attached to the <video> itself.
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch {
          /* autoplay retry happens via the element's autoPlay attribute */
        }

        if (await startNativeDetector()) return;

        // Layer 2 — ZXing fallback for browsers without Shape Detection.
        setEngine('zxing');
        const controls = await reader.decodeFromStream(
          stream,
          videoRef.current,
          (result: Result | undefined) => {
            if (result) handleDetected(result.getText());
          }
        );
        if (cancelled) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;
      } catch (err) {
        console.error('Camera scanner error:', err);
        if (!cancelled) {
          const errorName = err instanceof DOMException ? err.name : '';
          if (errorName === 'NotAllowedError' || errorName === 'SecurityError') {
            setCameraError('Camera access is blocked. Allow camera access for this site in browser settings, then tap Start camera.');
          } else if (errorName === 'NotFoundError' || errorName === 'DevicesNotFoundError') {
            setCameraError('No camera was found on this device. Use the USB reader backup or type the printed code.');
          } else if (errorName === 'NotReadableError' || errorName === 'TrackStartError') {
            setCameraError('The camera is being used by another app or tab. Close it there, then tap Start camera.');
          } else {
            setCameraError('Camera unavailable. Check browser permission, then tap Start camera or use the backup method.');
          }
        }
      } finally {
        if (!cancelled) setIsStarting(false);
      }
    };

    start();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [active, facingMode, handleDetected, stopCamera, diagnostics]);

  // Release the camera when the tab is hidden so it never stays hot.
  useEffect(() => {
    if (!active) return;
    const onHide = () => {
      if (document.visibilityState === 'hidden') stopCamera();
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [active, stopCamera]);

  const toggleTorch = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      await track.applyConstraints({
        advanced: [{ torch: !torchOn }],
      } as unknown as MediaTrackConstraints);
      setTorchOn((on) => !on);
    } catch (err) {
      console.error('Torch toggle failed:', err);
      setTorchSupported(false);
    }
  }, [torchOn]);

  const switchCamera = useCallback(
    () => setFacingMode((m) => (m === 'environment' ? 'user' : 'environment')),
    []
  );

  return {
    videoRef,
    facingMode,
    switchCamera,
    torchOn,
    torchSupported,
    toggleTorch,
    isStarting,
    cameraError,
    setCameraError,
    stopCamera,
  };
};
