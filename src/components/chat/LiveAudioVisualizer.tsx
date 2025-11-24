import { useEffect, useRef } from "react";

interface LiveAudioVisualizerProps {
  stream: MediaStream | null;
  isRecording: boolean;
}

export function LiveAudioVisualizer({ stream, isRecording }: LiveAudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const analyserRef = useRef<AnalyserNode>();
  const dataArrayRef = useRef<Uint8Array>();
  const smoothedHeightsRef = useRef<number[]>([]);

  useEffect(() => {
    if (!stream || !isRecording || !canvasRef.current) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const canvas = canvasRef.current;
    const canvasContext = canvas.getContext('2d');
    if (!canvasContext) return;

    // Setup Web Audio API
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    
    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    source.connect(analyser);
    
    analyserRef.current = analyser;
    dataArrayRef.current = dataArray;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const barCount = 20;
    smoothedHeightsRef.current = new Array(barCount).fill(0);

    const draw = () => {
      if (!analyserRef.current || !dataArrayRef.current || !canvasContext) return;

      animationRef.current = requestAnimationFrame(draw);

      const frequencyData = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(frequencyData);

      // Clear canvas with light gray background
      canvasContext.fillStyle = 'rgba(240, 240, 245, 0.3)';
      canvasContext.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = canvas.width / barCount;
      const barSpacing = 4;

      // Calculate average volume for glow effect
      const avgVolume = frequencyData.reduce((sum, val) => sum + val, 0) / frequencyData.length;
      const volumeNormalized = avgVolume / 255; // 0 to 1

      for (let i = 0; i < barCount; i++) {
        // Average multiple frequency bins for smoother animation
        const dataIndex = Math.floor((i * frequencyData.length) / barCount);
        const targetHeight = (frequencyData[dataIndex] / 255) * canvas.height; // 100% height
        
        // Smooth transition
        const smoothing = 0.3;
        smoothedHeightsRef.current[i] = smoothedHeightsRef.current[i] * (1 - smoothing) + targetHeight * smoothing;
        const barHeight = smoothedHeightsRef.current[i];
        
        // Dynamic colors based on volume
        const barGradient = canvasContext.createLinearGradient(
          0, 
          canvas.height - barHeight, 
          0, 
          canvas.height
        );
        
        // Volume-based color intensity
        const intensity = Math.min(1, volumeNormalized * 1.5);
        
        // Green (10% - top)
        barGradient.addColorStop(0, `rgba(34, 197, 94, ${0.6 + intensity * 0.4})`);
        // Orange (30% - middle)
        barGradient.addColorStop(0.1, `rgba(249, 115, 22, ${0.7 + intensity * 0.3})`);
        // Blue (60% - bottom)
        barGradient.addColorStop(0.4, `rgba(59, 130, 246, ${0.8 + intensity * 0.2})`);
        
        canvasContext.fillStyle = barGradient;
        
        // Draw rounded rectangle
        const x = i * barWidth + barSpacing / 2;
        const y = canvas.height - barHeight;
        const width = barWidth - barSpacing;
        const height = Math.max(barHeight, 8); // Minimum height increased
        const radius = 4;
        
        // Add glow effect when volume is high
        if (volumeNormalized > 0.3) {
          canvasContext.shadowBlur = 15 * volumeNormalized;
          canvasContext.shadowColor = volumeNormalized > 0.6 
            ? `rgba(34, 197, 94, ${volumeNormalized})` 
            : `rgba(59, 130, 246, ${volumeNormalized})`;
        }
        
        canvasContext.beginPath();
        canvasContext.roundRect(x, y, width, height, radius);
        canvasContext.fill();
        
        // Reset shadow for next bar
        canvasContext.shadowBlur = 0;
      }
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (audioContext.state !== 'closed') {
        audioContext.close();
      }
    };
  }, [stream, isRecording]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full block"
      style={{ height: '180px', display: 'block', width: '100%' }}
    />
  );
}
