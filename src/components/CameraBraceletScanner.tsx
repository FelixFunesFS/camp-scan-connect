import React, { useRef, useEffect, useState, useCallback } from 'react';
import { createWorker } from 'tesseract.js';
import { Camera, X, Scan, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface CameraBraceletScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
}

export const CameraBraceletScanner: React.FC<CameraBraceletScannerProps> = ({
  isOpen,
  onClose,
  onScan
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workerRef = useRef<Tesseract.Worker | null>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [confidence, setConfidence] = useState<number>(0);
  const [lastResult, setLastResult] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Initialize Tesseract worker
  useEffect(() => {
    const initWorker = async () => {
      if (!workerRef.current) {
        const worker = await createWorker('eng');
        await worker.setParameters({
          tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        });
        workerRef.current = worker;
      }
    };

    if (isOpen) {
      initWorker();
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, [isOpen]);

  // Camera access
  useEffect(() => {
    if (!isOpen) return;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment', // Use back camera on mobile
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });
        
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setError('');
      } catch (err) {
        setError('Unable to access camera. Please check permissions.');
        console.error('Camera access error:', err);
      }
    };

    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [isOpen]);

  const captureAndProcess = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !workerRef.current || isProcessing) {
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (!ctx) throw new Error('Canvas context not available');

      // Set canvas size to video size
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw current video frame to canvas
      ctx.drawImage(video, 0, 0);

      // Crop to bottom region for bracelet ID (second row)
      const cropX = canvas.width * 0.05;
      const cropY = canvas.height * 0.4; // Focus on bottom area
      const cropWidth = canvas.width * 0.9;
      const cropHeight = canvas.height * 0.5;

      const imageData = ctx.getImageData(cropX, cropY, cropWidth, cropHeight);
      
      // Create a new canvas with cropped data
      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = cropWidth;
      cropCanvas.height = cropHeight;
      const cropCtx = cropCanvas.getContext('2d');
      if (cropCtx) {
        cropCtx.putImageData(imageData, 0, 0);
        
        // Enhance contrast for better OCR
        cropCtx.filter = 'contrast(150%) brightness(110%)';
        cropCtx.drawImage(cropCanvas, 0, 0);
      }

      // Perform OCR
      const { data: { text, confidence: ocrConfidence } } = await workerRef.current.recognize(cropCanvas);
      
      // Split text by lines to get individual rows
      const lines = text.trim().split('\n').map(line => line.trim()).filter(line => line.length > 0);
      
      // Extract bracelet ID (second row) - filter out order numbers
      let braceletId = '';
      let extractedFromRow = '';
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].replace(/\s+/g, ''); // Remove spaces
        
        // Skip order numbers (short alphanumeric like SR16238)
        if (line.length < 10 || /^[A-Z]{1,3}\d{3,6}$/.test(line)) {
          continue;
        }
        
        // Look for bracelet ID pattern (12-15 digit number)
        if (/^\d{10,15}$/.test(line)) {
          braceletId = line;
          extractedFromRow = `Row ${i + 1}`;
          break;
        }
      }
      
      // If no perfect match, try second row regardless
      if (!braceletId && lines.length >= 2) {
        const secondRow = lines[1].replace(/\s+/g, '');
        if (secondRow.length >= 8) {
          braceletId = secondRow;
          extractedFromRow = 'Row 2 (fallback)';
        }
      }
      
      setLastResult(braceletId || lines.join(' | '));
      setConfidence(ocrConfidence);

      // Only accept bracelet ID results
      if (ocrConfidence > 60 && braceletId && braceletId.length >= 10) {
        console.log(`Bracelet ID extracted from ${extractedFromRow}:`, braceletId);
        onScan(braceletId);
        onClose();
      } else if (braceletId) {
        setError(`Low confidence (${Math.round(ocrConfidence)}%). Try repositioning bracelet.`);
      } else if (lines.length > 0) {
        setError(`No bracelet ID found. Detected: ${lines.join(', ')}`);
      }
    } catch (err) {
      setError('Failed to process image. Please try again.');
      console.error('OCR processing error:', err);
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, onScan, onClose]);

  const handleClose = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Scan Bracelet Code
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Card className="relative overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-64 object-cover"
            />
            
            {/* Viewfinder overlay */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4/5 h-1/3 border-2 border-primary rounded-lg">
                <div className="absolute -top-2 -left-2 w-4 h-4 border-l-2 border-t-2 border-primary"></div>
                <div className="absolute -top-2 -right-2 w-4 h-4 border-r-2 border-t-2 border-primary"></div>
                <div className="absolute -bottom-2 -left-2 w-4 h-4 border-l-2 border-b-2 border-primary"></div>
                <div className="absolute -bottom-2 -right-2 w-4 h-4 border-r-2 border-b-2 border-primary"></div>
              </div>
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-sm bg-black/50 px-2 py-1 rounded">
                Position BOTTOM number (longer code) in frame
              </div>
            </div>

            <canvas ref={canvasRef} className="hidden" />
          </Card>

          {/* Status display */}
          {lastResult && (
            <div className="text-center space-y-2">
              <Badge variant={confidence > 70 ? "default" : "secondary"}>
                Confidence: {Math.round(confidence)}%
              </Badge>
              <p className="text-sm text-muted-foreground">
                Last read: <code className="bg-muted px-1 rounded">{lastResult}</code>
              </p>
            </div>
          )}

          {error && (
            <div className="text-center text-sm text-destructive bg-destructive/10 p-2 rounded">
              {error}
            </div>
          )}

          {/* Controls */}
          <div className="flex gap-2 justify-center">
            <Button
              onClick={captureAndProcess}
              disabled={isProcessing}
              className="flex-1"
            >
              {isProcessing ? (
                <>
                  <RotateCcw className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Scan className="h-4 w-4 mr-2" />
                  Capture
                </>
              )}
            </Button>

            <Button variant="outline" onClick={handleClose}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};