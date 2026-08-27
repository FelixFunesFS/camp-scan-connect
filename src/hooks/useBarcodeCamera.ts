import { useCallback, useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType, type Result } from '@zxing/library';
import { isValidCredentialFormat, normalizeCredential } from '@/lib/credentialFormat';

/** Formats printed on wristbands, badges and confirmation emails. */
export const CAMERA_SUPPORTED_FORMATS = [
  BarcodeFormat.QR_CODE,
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.ITF,
  BarcodeFormat.DATA_MATRIX,
  BarcodeFormat.PDF_417,
];

/** Ignore repeat reads of the same code inside this window. */
const DUPLICATE_WINDOW_MS = 2500;

interface UseBarcodeCameraOptions {
  /** Camera runs only while this is true. */
  active: boolean;
  /** Called with a normalized, format-validated payload. */
  onScan: (code: string) => void;
  /** Called when a code decoded but failed credential validation. */
  onInvalidRead?: (code: string) => void;
  /** Skip credential validation (diagnostics: report whatever was decoded). */
  acceptAnyPayload?: boolean;
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
}: UseBarcodeCameraOptions) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const lastReadRef = useRef<{ code: string; at: number } | null>(null);

  const onScanRef = useRef(onScan);
  const onInvalidReadRef = useRef(onInvalidRead);
  onScanRef.current = onScan;
  onInvalidReadRef.current = onInvalidRead;

  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [cameraError, setCameraError] = useState('');

  const handleDetected = useCallback(
    (raw: string) => {
      const code = normalizeCredential(raw);
      if (!code) return;

      const previous = lastReadRef.current;
      if (previous && previous.code === code && Date.now() - previous.at < DUPLICATE_WINDOW_MS) {
        return;
      }
      lastReadRef.current = { code, at: Date.now() };

      if (!acceptAnyPayload && !isValidCredentialFormat(code)) {
        onInvalidReadRef.current?.(code);
        return;
      }

      onScanRef.current(acceptAnyPayload ? raw : code);
    },
    [acceptAnyPayload]
  );

  const stopCamera = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setTorchOn(false);
    setTorchSupported(false);
  }, []);

  useEffect(() => {
    if (!active) return;

    let cancelled = false;
    setIsStarting(true);
    setCameraError('');

    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, CAMERA_SUPPORTED_FORMATS);
    hints.set(DecodeHintType.TRY_HARDER, true);
    const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 120 });

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;

        const track = stream.getVideoTracks()[0];
        const capabilities = (track?.getCapabilities?.() ?? {}) as MediaTrackCapabilities & {
          torch?: boolean;
        };
        setTorchSupported(Boolean(capabilities.torch));

        if (!videoRef.current) return;
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
          setCameraError(
            'Camera unavailable. Allow camera access for this site in your browser settings, then start the camera again.'
          );
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
  }, [active, facingMode, handleDetected, stopCamera]);

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
