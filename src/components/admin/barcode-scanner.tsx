"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Camera, CameraOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  disabled?: boolean;
}

export function BarcodeScanner({ onScan, disabled }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const scanBuffer = useRef("");
  const lastKeyTime = useRef(0);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const startCamera = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch {
      setError("Camera access denied or unavailable");
    }
  };

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled) return;
      const now = Date.now();
      if (now - lastKeyTime.current > 100) {
        scanBuffer.current = "";
      }
      lastKeyTime.current = now;

      if (e.key === "Enter" && scanBuffer.current.length > 2) {
        e.preventDefault();
        onScan(scanBuffer.current.trim());
        scanBuffer.current = "";
        return;
      }

      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        scanBuffer.current += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onScan, disabled]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      onScan(manualInput.trim());
      setManualInput("");
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleManualSubmit} className="flex gap-2">
        <Input
          ref={inputRef}
          value={manualInput}
          onChange={(e) => setManualInput(e.target.value)}
          placeholder="Scan barcode or type manually..."
          className="bg-white/5 font-mono"
          disabled={disabled}
          autoFocus
        />
        <Button type="submit" disabled={disabled || !manualInput.trim()}>
          Add
        </Button>
      </form>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant={cameraActive ? "destructive" : "outline"}
          size="sm"
          onClick={cameraActive ? stopCamera : startCamera}
          disabled={disabled}
        >
          {cameraActive ? (
            <>
              <CameraOff className="mr-2 h-4 w-4" />
              Stop Camera
            </>
          ) : (
            <>
              <Camera className="mr-2 h-4 w-4" />
              Start Camera
            </>
          )}
        </Button>
        <span className="text-xs text-muted-foreground">
          USB scanner works automatically — scan into the input field
        </span>
      </div>

      {cameraActive && (
        <div className="relative overflow-hidden rounded-lg border border-white/10">
          <video ref={videoRef} className="h-48 w-full object-cover" playsInline muted />
          <p className="absolute bottom-2 left-0 right-0 text-center text-xs text-white/80">
            Point camera at barcode, then enter value manually above
          </p>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
