import { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';

export interface ScreenshotSettings {
  bgType: 'solid' | 'gradient';
  bgColor: string;
  gradientStart: string;
  gradientEnd: string;
  gradientAngle: number;
  padding: number;
  borderRadius: number;
  scale: number;
  aspectRatio: 'auto' | '1:1' | '9:16' | '16:9';
}

export interface ScreenshotPreviewHandle {
  downloadPng: (filename: string) => void;
  copyToClipboard: () => Promise<void>;
}

interface Props {
  imageData: string;
  settings: ScreenshotSettings;
}

export const ScreenshotPreview = forwardRef<ScreenshotPreviewHandle, Props>(
  ({ imageData, settings }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imgRef = useRef<HTMLImageElement | null>(null);

    useImperativeHandle(ref, () => ({
      downloadPng(filename: string) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.toBlob((blob) => {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
        }, 'image/png');
      },
      async copyToClipboard() {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, 'image/png'),
        );
        if (!blob) return;
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      },
    }));

    useEffect(() => {
      const img = new Image();
      img.onload = () => {
        imgRef.current = img;
        render();
      };
      img.src = imageData;
    }, [imageData]);

    useEffect(() => {
      if (imgRef.current) render();
    }, [settings]);

    function render() {
      const canvas = canvasRef.current;
      const img = imgRef.current;
      if (!canvas || !img) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const { padding, borderRadius, scale, bgType, bgColor, gradientStart, gradientEnd, gradientAngle, aspectRatio } = settings;

      const imgW = img.naturalWidth * scale;
      const imgH = img.naturalHeight * scale;
      let canvasW = imgW + padding * 2;
      let canvasH = imgH + padding * 2;

      if (aspectRatio !== 'auto') {
        const [rw, rh] = aspectRatio.split(':').map(Number);
        const ratio = rw / rh;
        const currentRatio = canvasW / canvasH;
        if (currentRatio > ratio) {
          canvasH = canvasW / ratio;
        } else {
          canvasW = canvasH * ratio;
        }
      }

      canvas.width = canvasW;
      canvas.height = canvasH;

      // Background
      if (bgType === 'gradient') {
        const rad = (gradientAngle * Math.PI) / 180;
        const cx = canvasW / 2;
        const cy = canvasH / 2;
        const len = Math.max(canvasW, canvasH);
        const x1 = cx - Math.cos(rad) * len / 2;
        const y1 = cy - Math.sin(rad) * len / 2;
        const x2 = cx + Math.cos(rad) * len / 2;
        const y2 = cy + Math.sin(rad) * len / 2;
        const grad = ctx.createLinearGradient(x1, y1, x2, y2);
        grad.addColorStop(0, gradientStart);
        grad.addColorStop(1, gradientEnd);
        ctx.fillStyle = grad;
      } else {
        ctx.fillStyle = bgColor;
      }
      ctx.fillRect(0, 0, canvasW, canvasH);

      // Draw image centered with rounded corners
      const x = (canvasW - imgW) / 2;
      const y = (canvasH - imgH) / 2;

      if (borderRadius > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(x, y, imgW, imgH, borderRadius);
        ctx.clip();
        ctx.drawImage(img, x, y, imgW, imgH);
        ctx.restore();
      } else {
        ctx.drawImage(img, x, y, imgW, imgH);
      }
    }

    return (
      <div className="screenshot-preview">
        <canvas ref={canvasRef} />
      </div>
    );
  },
);
