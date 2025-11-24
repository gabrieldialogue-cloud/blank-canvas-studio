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

    const draw = () => {
      if (!analyserRef.current || !dataArrayRef.current || !canvasContext) return;

      animationRef.current = requestAnimationFrame(draw);

      const frequencyData = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(frequencyData);

      // Clear canvas with darker background
      canvasContext.fillStyle = 'rgba(0, 0, 0, 0.05)';
      canvasContext.fillRect(0, 0, canvas.width, canvas.height);

      const barCount = 20;
      const barWidth = canvas.width / barCount;
      const barSpacing = 4;

      for (let i = 0; i < barCount; i++) {
        // Average multiple frequency bins for smoother animation
        const dataIndex = Math.floor((i * frequencyData.length) / barCount);
        const barHeight = (frequencyData[dataIndex] / 255) * canvas.height * 0.8;
        
        // Create gradient with blue 60%, orange 30%, green 10%
        const barGradient = canvasContext.createLinearGradient(
          0, 
          canvas.height - barHeight, 
          0, 
          canvas.height
        );
        barGradient.addColorStop(0, 'rgba(34, 197, 94, 1)');    // Green 10% (top)
        barGradient.addColorStop(0.1, 'rgba(249, 115, 22, 1)'); // Orange 30%
        barGradient.addColorStop(0.4, 'rgba(59, 130, 246, 1)'); // Blue 60% (bottom)
        
        canvasContext.fillStyle = barGradient;
        
        // Draw rounded rectangle
        const x = i * barWidth + barSpacing / 2;
        const y = canvas.height - barHeight;
        const width = barWidth - barSpacing;
        const height = Math.max(barHeight, 4); // Minimum height
        const radius = 3;
        
        canvasContext.beginPath();
        canvasContext.roundRect(x, y, width, height, radius);
        canvasContext.fill();
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
      className="w-full h-full rounded-xl"
      style={{ minHeight: '96px' }}
    />
  );
}
