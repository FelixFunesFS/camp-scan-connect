import React, { useEffect, useState } from 'react';
import { Camera, CameraOff, Flashlight, FlashlightOff, Maximize2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useBarcodeCamera } from '@/hooks/useBarcodeCamera';

interface InlineCameraScannerProps {
  /** Called with the decoded payload. */
  onScan: (code: string) => void;
  /** Pass raw decoded text through without credential validation. */
  acceptAnyPayload?: boolean;
  /** Optional "expand" action that hands off to the full-screen scanner. */
  onExpand?: () => void;
  className?: string;
}

/**
 * Camera preview that lives inside the page (not full screen) so results stay
 * visible next to the live view. Decodes continuously while running.
 */
export const InlineCameraScanner: React.FC<InlineCameraScannerProps> = ({
  onScan,
  acceptAnyPayload = false,
  onExpand,
  className,
}) => {
  const [running, setRunning] = useState(false);
  const [flash, setFlash] = useState<'hit' | 'miss' | null>(null);
  const [readError, setReadError] = useState('');

  const pulse = (kind: 'hit' | 'miss') => {
    setFlash(kind);
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(kind === 'hit' ? 40 : [20, 40, 20]);
    }
    setTimeout(() => setFlash(null), 320);
  };

  const {
    videoRef,
    torchOn,
    torchSupported,
    toggleTorch,
    switchCamera,
    isStarting,
    cameraError,
  } = useBarcodeCamera({
    active: running,
    acceptAnyPayload,
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

  // Stop the camera when this panel unmounts / the route changes.
  useEffect(() => () => setRunning(false), []);

  return (
    <div className={cn('space-y-3', className)}>
      <div className="relative w-full overflow-hidden rounded-xl border bg-muted aspect-video">
        <video
          ref={videoRef}
          className={cn('h-full w-full object-cover', !running && 'invisible')}
          muted
          playsInline
          autoPlay
        />

        {running && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div
              className={cn(
                'relative h-24 w-4/5 rounded-xl border-2 transition-colors',
                flash === 'hit'
                  ? 'border-emerald-400'
                  : flash === 'miss'
                    ? 'border-destructive'
                    : 'border-primary/80'
              )}
            >
              <div className="absolute inset-x-4 top-1/2 h-px animate-pulse bg-primary" />
            </div>
          </div>
        )}

        {flash && (
          <div
            className={cn(
              'pointer-events-none absolute inset-0',
              flash === 'hit' ? 'bg-emerald-400/25' : 'bg-destructive/25'
            )}
          />
        )}

        {!running && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center">
            <Camera className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Camera is off. Start it to scan with this device.
            </p>
            <Button onClick={() => setRunning(true)} size="sm">
              <Camera className="mr-2 h-4 w-4" />
              Start camera
            </Button>
          </div>
        )}

        {running && isStarting && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-sm text-white">
            <Camera className="mr-2 h-4 w-4 animate-pulse" />
            Starting camera…
          </div>
        )}
      </div>

      {running && (
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setRunning(false)}>
            <CameraOff className="mr-2 h-4 w-4" />
            Stop
          </Button>
          {torchSupported && (
            <Button variant="outline" size="sm" onClick={toggleTorch} aria-label="Toggle flashlight">
              {torchOn ? <FlashlightOff className="h-4 w-4" /> : <Flashlight className="h-4 w-4" />}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={switchCamera} aria-label="Switch camera">
            <RefreshCw className="h-4 w-4" />
          </Button>
          {onExpand && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setRunning(false);
                onExpand();
              }}
            >
              <Maximize2 className="mr-2 h-4 w-4" />
              Full screen
            </Button>
          )}
        </div>
      )}

      {!running && onExpand && (
        <Button variant="outline" size="sm" onClick={onExpand}>
          <Maximize2 className="mr-2 h-4 w-4" />
          Open full-screen scanner
        </Button>
      )}

      {cameraError && (
        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{cameraError}</div>
      )}
      {readError && (
        <div className="rounded-lg bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
          {readError}
        </div>
      )}
    </div>
  );
};
