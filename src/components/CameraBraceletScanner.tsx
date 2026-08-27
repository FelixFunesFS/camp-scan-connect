import React, { useEffect, useState } from 'react';
import { Camera, Flashlight, FlashlightOff, Keyboard, RotateCcw, ScanLine, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useBarcodeCamera } from '@/hooks/useBarcodeCamera';
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


export const CameraBraceletScanner: React.FC<CameraBraceletScannerProps> = ({
  isOpen,
  onClose,
  onScan,
}) => {
  const [lastResult, setLastResult] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [manualCode, setManualCode] = useState('');
  const [showManual, setShowManual] = useState(false);

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
      setError('');
      setLastResult(code);
      onScan(code);
    },
    onInvalidRead: (code) => {
      setError(`Read "${code}" but it is not a valid credential code.`);
    },
  });

  // Fall back to manual entry as soon as the camera cannot be used.
  useEffect(() => {
    if (cameraError) {
      setError(cameraError);
      setShowManual(true);
    }
  }, [cameraError]);


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
              onClick={switchCamera}
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
