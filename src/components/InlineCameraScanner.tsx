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
  /** Start the camera as soon as the panel mounts. */
  autoStart?: boolean;
  /** External pause switch (e.g. a full-screen scanner is open). */
  paused?: boolean;
  /** Short strip preview with icon-only controls (station pages). */
  compact?: boolean;
  /** Thin status bar only — camera keeps running but the preview is hidden. */
  collapsed?: boolean;
  /** Label shown in the collapsed bar. */
  collapsedLabel?: string;
  /** Called when the user taps the collapsed bar to show the preview again. */
  onExpandPreview?: () => void;
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
  autoStart = false,
  paused = false,
  compact = false,
  collapsed = false,
  collapsedLabel = 'Scanner ready',
  onExpandPreview,
  className,
}) => {

  const [running, setRunning] = useState(autoStart);
  const [tabHidden, setTabHidden] = useState(false);
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
    active: running && !paused && !tabHidden,
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

  // Release the camera while the tab is in the background.
  useEffect(() => {
    const onVisibility = () => setTabHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    onVisibility();
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  return (
    <div className={cn(compact ? 'space-y-2' : 'space-y-3', className)}>
      {collapsed && (
        <button
          type="button"
          onClick={onExpandPreview}
          className="flex w-full items-center gap-2 rounded-lg border bg-muted/60 px-3 py-2 text-left text-sm"
        >
          <span
            className={cn(
              'h-2 w-2 shrink-0 rounded-full',
              running && !paused ? 'animate-pulse bg-emerald-500' : 'bg-muted-foreground'
            )}
          />
          <span className="truncate text-muted-foreground">{collapsedLabel}</span>
          {onExpandPreview && (
            <span className="ml-auto shrink-0 text-xs text-primary">Show camera</span>
          )}
        </button>
      )}

      <div
        className={cn(
          'relative w-full overflow-hidden rounded-xl border bg-muted',
          collapsed ? 'h-0 border-0' : compact ? 'h-[150px] sm:h-[170px]' : 'aspect-video'
        )}
      >
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
                'relative w-4/5 rounded-xl border-2 transition-colors',
                compact ? 'h-16' : 'h-24',
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
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-3 text-center">
            <Camera className="h-6 w-6 text-muted-foreground" />
            {!compact && (
              <p className="text-sm text-muted-foreground">
                Camera is off. Start it to scan with this device.
              </p>
            )}
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

      {running && !collapsed && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size={compact ? 'icon' : 'sm'}
            onClick={() => setRunning(false)}
            aria-label="Stop camera"
            className={compact ? 'h-10 w-10' : undefined}
          >
            <CameraOff className={compact ? 'h-4 w-4' : 'mr-2 h-4 w-4'} />
            {!compact && 'Stop'}
          </Button>
          {torchSupported && (
            <Button
              variant="outline"
              size={compact ? 'icon' : 'sm'}
              onClick={toggleTorch}
              aria-label="Toggle flashlight"
              className={compact ? 'h-10 w-10' : undefined}
            >
              {torchOn ? <FlashlightOff className="h-4 w-4" /> : <Flashlight className="h-4 w-4" />}
            </Button>
          )}
          <Button
            variant="outline"
            size={compact ? 'icon' : 'sm'}
            onClick={switchCamera}
            aria-label="Switch camera"
            className={compact ? 'h-10 w-10' : undefined}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          {onExpand && (
            <Button
              variant="outline"
              size={compact ? 'icon' : 'sm'}
              aria-label="Full screen scanner"
              className={compact ? 'ml-auto h-10 w-10' : undefined}
              onClick={() => {
                setRunning(false);
                onExpand();
              }}
            >
              <Maximize2 className={compact ? 'h-4 w-4' : 'mr-2 h-4 w-4'} />
              {!compact && 'Full screen'}
            </Button>
          )}
        </div>
      )}

      {!running && !collapsed && onExpand && (
        <Button variant="outline" size="sm" onClick={onExpand}>
          <Maximize2 className="mr-2 h-4 w-4" />
          Open full-screen scanner
        </Button>
      )}

      {cameraError && !collapsed && (
        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{cameraError}</div>
      )}
      {readError && !collapsed && (
        <div className="rounded-lg bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
          {readError}
        </div>
      )}
    </div>
  );

};
