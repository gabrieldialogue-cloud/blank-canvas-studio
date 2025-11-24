import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface AudioWaveformProps {
  audioBlob: Blob;
  className?: string;
}

export function AudioWaveform({ audioBlob, className }: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const drawWaveform = async () => {
      if (!canvasRef.current) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Create audio context
      const audioContext = new AudioContext();
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      // Get audio data
      const rawData = audioBuffer.getChannelData(0);
      const samples = 100; // Number of bars to display
      const blockSize = Math.floor(rawData.length / samples);
      const filteredData = [];

      for (let i = 0; i < samples; i++) {
        const blockStart = blockSize * i;
        let sum = 0;
        for (let j = 0; j < blockSize; j++) {
          sum += Math.abs(rawData[blockStart + j]);
        }
        filteredData.push(sum / blockSize);
      }

      // Normalize data
      const multiplier = Math.max(...filteredData) ** -1;
      const normalizedData = filteredData.map(n => n * multiplier);

      // Draw waveform
      const dpr = window.devicePixelRatio || 1;
      const padding = 2;
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = (canvas.offsetHeight || 40) * dpr;
      ctx.scale(dpr, dpr);
      ctx.translate(0, canvas.offsetHeight / 2);

      const width = canvas.offsetWidth / normalizedData.length;
      
      // Use gradient for bars
      const gradient = ctx.createLinearGradient(0, -canvas.offsetHeight / 2, 0, canvas.offsetHeight / 2);
      gradient.addColorStop(0, 'hsl(var(--success))');
      gradient.addColorStop(1, 'hsl(var(--success) / 0.5)');

      for (let i = 0; i < normalizedData.length; i++) {
        const x = width * i;
        let height = normalizedData[i] * (canvas.offsetHeight / 2) - padding;
        if (height < 0) {
          height = 0;
        } else if (height > canvas.offsetHeight / 2) {
          height = canvas.offsetHeight / 2;
        }

        ctx.fillStyle = gradient;
        ctx.fillRect(x, -height, width - padding, height * 2);
      }

      audioContext.close();
    };

    drawWaveform();
  }, [audioBlob]);

  return (
    <canvas
      ref={canvasRef}
      className={cn("w-full h-12 rounded-lg", className)}
    />
  );
}