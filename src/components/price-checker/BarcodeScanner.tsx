"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";

type Props = { onDetected: (value: string) => void };

export default function BarcodeScanner({ onDetected }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [active, setActive] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!active || !videoRef.current) return;

    const reader = new BrowserMultiFormatReader();
    let cancelled = false;
    let stopScanner: (() => void) | undefined;

    reader.decodeFromVideoDevice(undefined, videoRef.current, (result, error, controls) => {
      stopScanner = () => controls.stop();
      if (cancelled) {
        controls.stop();
        return;
      }
      if (result) {
        onDetected(result.getText());
        setMessage("Barcode captured. You can now search marketplace listings.");
        setActive(false);
        controls.stop();
      } else if (error && error.name !== "NotFoundException") {
        setMessage("Camera scan had a problem. Try entering the barcode manually.");
      }
    }).catch(() => {
      if (!cancelled) {
        setMessage("Camera access was blocked or unavailable. Check browser permissions or enter the barcode manually.");
      }
    });

    return () => {
      cancelled = true;
      stopScanner?.();
    };
  }, [active, onDetected]);

  return (
    <div className="scanner">
      <button type="button" onClick={() => { setMessage(""); setActive((value) => !value); }}>
        {active ? "Stop barcode scanner" : "Scan with camera"}
      </button>
      {active && <video ref={videoRef} muted playsInline className="video" />}
      {message && <p role="status">{message}</p>}
      <style jsx>{`
        .scanner{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
        button{border:1px solid #deded8;border-radius:6px;padding:10px 12px;background:#fff;color:#51472f;font-size:12px;font-weight:700;cursor:pointer}
        .video{width:100%;max-width:420px;border-radius:8px;background:#171717}
        p{font-size:11px;color:#75613b;margin:0}
      `}</style>
    </div>
  );
}
