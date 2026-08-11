import React, { useRef, useEffect, useState, useCallback } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import {
  BarcodeFormat,
  DecodeHintType,
  type Result,
} from '@zxing/library';
import { Camera, Flashlight, FlashlightOff, Keyboard, RotateCcw, ScanLine, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  inferCredentialType,
  isValidCredentialFormat,
  normalizeCredential,
  CREDENTIAL_TYPE_LABELS,
} from '@/lib/credentialFormat';

interface CameraBraceletScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
}

/** Formats printed on wristbands, badges and confirmation emails. */
const SUPPORTED_FORMATS = [
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

export const CameraBraceletScanner: React.FC<CameraBraceletScannerProps> = ({
  isOpen,
  onClose,
  onScan,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const lastReadRef = useRef<{ code: string; at: number } | null>(null);

  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [lastResult, setLastResult] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isStarting, setIsStarting] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [showManual, setShowManual] = useState(false);

  const handleDetected = useCallback(
    (raw: string) => {
      const code = normalizeCredential(raw);
      if (!code) return;

      // Suppress duplicate frames of the same credential.
      const previous = lastReadRef.current;
      if (previous && previous.code === code && Date.now() - previous.at < DUPLICATE_WINDOW_MS) {
        return;
      }
      lastReadRef.current = { code, at: Date.now() };

      if (!isValidCredentialFormat(code)) {
        setError(`Read "${code}" but it is not a valid credential code.`);
        return;
      }

      setError('');
      setLastResult(code);
      onScan(code);
    },
    [onScan]
  );

  const stopCamera = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setTorchOn(false);
    setTorchSupported(false);
  }, []);

  // Start / restart continuous decoding whenever the dialog or camera changes.
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    setIsStarting(true);
    setError('');

    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, SUPPORTED_FORMATS);
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
          setError(
            'Camera unavailable. Allow camera access in your browser, or enter the code manually.'
          );
          setShowManual(true);
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
  }, [isOpen, facingMode, handleDetected, stopCamera]);

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: !torchOn }] } as MediaTrackConstraints);
      setTorchOn((on) => !on);
    } catch (err) {
      console.error('Torch toggle failed:', err);
      setTorchSupported(false);
    }
  };

  const submitManual = () => {
    const code = normalizeCredential(manualCode);
    if (!code) return;
    if (!isValidCredentialFormat(code)) {
      setError('That code does not look valid. Check it and try again.');
      return;
    }
    setError('');
    setManualCode('');
    onScan(code);
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 pb-3">
          <DialogTitle className="flex items-center gap-2 text-base">
            <ScanLine className="h-4 w-4" />
            Scan barcode or QR code
          </DialogTitle>
        </DialogHeader>

        <div className="relative bg-black aspect-[4/3] w-full">
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            muted
            playsInline
            autoPlay
          />

          {/* Aiming guide */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="relative h-28 w-4/5 rounded-lg border-2 border-primary/80">
              <div className="absolute inset-x-0 top-1/2 h-px animate-pulse bg-primary" />
            </div>
          </div>

          {isStarting && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-sm text-white">
              <Camera className="mr-2 h-4 w-4 animate-pulse" />
              Starting camera…
            </div>
          )}

          <div className="absolute bottom-3 right-3 flex gap-2">
            {torchSupported && (
              <Button size="icon" variant="secondary" onClick={toggleTorch} aria-label="Toggle flashlight">
                {torchOn ? <FlashlightOff className="h-4 w-4" /> : <Flashlight className="h-4 w-4" />}
              </Button>
            )}
            <Button
              size="icon"
              variant="secondary"
              onClick={() => setFacingMode((m) => (m === 'environment' ? 'user' : 'environment'))}
              aria-label="Switch camera"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-3 p-4">
          <p className="text-sm text-muted-foreground">
            Hold the code inside the frame. It scans automatically — no button needed.
          </p>

          {lastResult && (
            <div className="flex items-center gap-2 rounded-lg bg-muted p-3">
              <Badge variant="secondary" className="text-xs">
                {CREDENTIAL_TYPE_LABELS[inferCredentialType(lastResult)]}
              </Badge>
              <span className="truncate font-mono text-sm">{lastResult}</span>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          )}

          {showManual ? (
            <div className="flex gap-2">
              <Input
                autoFocus
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitManual()}
                placeholder="Type the printed code"
                className="font-mono"
                data-exclude-rfid="true"
              />
              <Button onClick={submitManual} disabled={!manualCode.trim()}>
                Use
              </Button>
            </div>
          ) : (
            <Button variant="outline" className="w-full" onClick={() => setShowManual(true)}>
              <Keyboard className="mr-2 h-4 w-4" />
              Code won't scan? Enter it manually
            </Button>
          )}

          <Button variant="ghost" className="w-full" onClick={onClose}>
            <X className="mr-2 h-4 w-4" />
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
