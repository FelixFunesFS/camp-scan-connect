import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType, type Result } from '@zxing/library';
import {
  Camera,
  Flashlight,
  FlashlightOff,
  Keyboard,
  RefreshCw,
  ScanLine,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { isValidCredentialFormat, normalizeCredential } from '@/lib/credentialFormat';

/** Formats printed on wristbands, badges and confirmation emails. */
export const LENS_SUPPORTED_FORMATS = [
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

interface LensScannerProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called with a normalized, format-validated payload. */
  onScan: (code: string) => void;
  title?: string;
  /** Shown under the frame while the caller resolves a scan. */
  busy?: boolean;
  /** Error text from the caller (e.g. "tag not found"). */
  errorMessage?: string;
  /** Result card rendered over the live camera. */
  children?: React.ReactNode;
}

/**
 * Full-screen, Google Lens style scanner. Decodes continuously — no shutter —
 * and keeps the camera alive behind the result card so the next person can be
 * scanned immediately.
 */
export const LensScanner: React.FC<LensScannerProps> = ({
  isOpen,
  onClose,
  onScan,
  title = 'Scan code',
  busy = false,
  errorMessage,
  children,
}) => {
  const [readError, setReadError] = useState('');
  const [flash, setFlash] = useState<'hit' | 'miss' | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [manualCode, setManualCode] = useState('');

  const pulse = useCallback((kind: 'hit' | 'miss') => {
    setFlash(kind);
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(kind === 'hit' ? 40 : [20, 40, 20]);
    }
    setTimeout(() => setFlash(null), 320);
  }, []);

  const {
    videoRef,
    torchOn,
    torchSupported,
    toggleTorch,
    switchCamera,
    isStarting,
    cameraError,
  } = useBarcodeCamera({
    active: isOpen,
    onScan: (code) => {
      setReadError('');
      pulse('hit');
      onScan(code);
    },
    onInvalidRead: (code) => {
      setReadError(`Read "${code}" but it is not a valid credential code.`);
      pulse('miss');
    },
  });

  // Offer manual entry as soon as the camera cannot be used.
  useEffect(() => {
    if (cameraError) setShowManual(true);
  }, [cameraError]);

  // Escape closes the overlay.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);


  const submitManual = () => {
    const code = normalizeCredential(manualCode);
    if (!code) return;
    if (!isValidCredentialFormat(code)) {
      setReadError('That code does not look valid. Check it and try again.');
      return;
    }
    setReadError('');
    setManualCode('');
    onScan(code);
  };

  if (!isOpen) return null;

  const visibleError = readError || errorMessage;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-primary-foreground">
      {/* Live camera */}
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        muted
        playsInline
        autoPlay
      />

      {/* Scrim so controls stay legible over any scene */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/80" />

      {/* Hit / miss flash */}
      {flash && (
        <div
          className={cn(
            'pointer-events-none absolute inset-0 transition-opacity',
            flash === 'hit' ? 'bg-emerald-400/30' : 'bg-destructive/30'
          )}
        />
      )}

      {/* Header */}
      <div
        className="relative flex items-center justify-between px-4 pb-3"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)' }}
      >
        <div className="flex items-center gap-2 text-sm font-medium">
          <ScanLine className="h-4 w-4" />
          {title}
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={onClose}
          aria-label="Close scanner"
          className="text-primary-foreground hover:bg-white/15 hover:text-primary-foreground"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Aiming frame */}
      <div className="pointer-events-none relative flex flex-1 items-center justify-center px-6">
        <div
          className={cn(
            'relative h-40 w-full max-w-sm rounded-2xl border-2 transition-colors',
            flash === 'hit'
              ? 'border-emerald-400'
              : flash === 'miss'
                ? 'border-destructive'
                : 'border-white/80'
          )}
        >
          <div className="absolute inset-x-6 top-1/2 h-px animate-pulse bg-white/90" />
        </div>
      </div>

      {/* Bottom sheet: status, result, controls */}
      <div
        className="relative space-y-3 px-4 pt-3"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
      >
        {isStarting && (
          <div className="flex items-center justify-center gap-2 text-sm">
            <Camera className="h-4 w-4 animate-pulse" />
            Starting camera…
          </div>
        )}

        {!isStarting && !cameraError && !children && (
          <p className="text-center text-sm text-white/80">
            {busy ? 'Looking up…' : 'Point at a wristband, badge or QR code — it scans automatically.'}
          </p>
        )}

        {cameraError && (
          <div className="rounded-xl bg-destructive/90 p-3 text-sm text-destructive-foreground">
            {cameraError}
          </div>
        )}

        {visibleError && (
          <div className="rounded-xl bg-destructive/90 p-3 text-sm text-destructive-foreground">
            {visibleError}
          </div>
        )}

        {/* Caller-rendered result card, floating over the live camera */}
        {children && (
          <div className="max-h-[52vh] overflow-y-auto rounded-2xl bg-background p-4 text-foreground shadow-2xl">
            {children}
          </div>
        )}

        {showManual ? (
          <div className="flex gap-2">
            <Input
              autoFocus
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitManual()}
              placeholder="Type the printed code"
              className="bg-background font-mono text-foreground"
              data-exclude-rfid="true"
            />
            <Button onClick={submitManual} disabled={!manualCode.trim()}>
              Use
            </Button>
          </div>
        ) : null}

        <div className="flex items-center justify-center gap-2">
          {torchSupported && (
            <Button
              size="icon"
              variant="secondary"
              onClick={toggleTorch}
              aria-label="Toggle flashlight"
            >
              {torchOn ? <FlashlightOff className="h-4 w-4" /> : <Flashlight className="h-4 w-4" />}
            </Button>
          )}
          <Button
            size="icon"
            variant="secondary"
            onClick={() => setFacingMode((m) => (m === 'environment' ? 'user' : 'environment'))}
            aria-label="Switch camera"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="secondary" onClick={() => setShowManual((s) => !s)}>
            <Keyboard className="mr-2 h-4 w-4" />
            {showManual ? 'Hide manual entry' : 'Enter code manually'}
          </Button>
        </div>
      </div>
    </div>
  );
};