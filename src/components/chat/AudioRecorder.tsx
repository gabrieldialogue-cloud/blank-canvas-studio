import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Loader2, Send, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LiveAudioVisualizer } from "./LiveAudioVisualizer";
import { Card } from "@/components/ui/card";
import Recorder from "opus-recorder";

interface AudioRecorderProps {
  onAudioRecorded: (audioBlob: Blob) => Promise<void>;
  disabled?: boolean;
}

export function AudioRecorder({ onAudioRecorded, disabled }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const recorderRef = useRef<any>(null);
  const recordTimeoutRef = useRef<number | null>(null);
  const recordingIntervalRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  // Timer para atualizar tempo de gravação
  useEffect(() => {
    if (isRecording) {
      setRecordingTime(0);
      recordingIntervalRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, [isRecording]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });

      streamRef.current = stream;

      console.log('Gravando com opus-recorder em formato OGG/Opus (WhatsApp compatível)');

      const recorder = new Recorder({
        encoderPath: 'https://cdn.jsdelivr.net/npm/opus-recorder@8.0.3/dist/encoderWorker.min.js',
        mediaTrackConstraints: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      recorderRef.current = recorder;

      recorder.ondataavailable = async (typedArray: Uint8Array) => {
        const audioBlob = new Blob([new Uint8Array(typedArray)], { type: 'audio/ogg' });
        
        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
        
        // Enviar automaticamente após parar a gravação
        setIsSending(true);
        try {
          await onAudioRecorded(audioBlob);
          setIsRecording(false);
        } catch (error) {
          console.error("Erro ao enviar áudio:", error);
          toast({
            title: "Erro ao enviar áudio",
            description: "Não foi possível enviar o áudio gravado.",
            variant: "destructive",
          });
          setIsRecording(false);
        } finally {
          setIsSending(false);
        }
      };

      await recorder.start();
      setIsRecording(true);

      // Limite de duração para reduzir tamanho do arquivo (ex: 60s)
      const MAX_DURATION_MS = 60_000;
      if (recordTimeoutRef.current) {
        clearTimeout(recordTimeoutRef.current);
      }
      recordTimeoutRef.current = window.setTimeout(() => {
        if (recorderRef.current) {
          console.log("Tempo máximo de gravação atingido, parando automaticamente");
          stopRecording();
          toast({
            title: "Limite de gravação atingido",
            description: "O áudio foi limitado a 60 segundos para reduzir o tamanho do arquivo.",
          });
        }
      }, MAX_DURATION_MS);
    } catch (error) {
      console.error("Erro ao acessar microfone:", error);
      toast({
        title: "Erro ao acessar microfone",
        description: "Verifique as permissões do navegador.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (recorderRef.current) {
      recorderRef.current.stop();
      if (recordTimeoutRef.current) {
        clearTimeout(recordTimeoutRef.current);
      }
      // O ondataavailable vai processar e enviar automaticamente
    }
  };

  const handleCancel = () => {
    if (recorderRef.current) {
      recorderRef.current.stop();
      if (recordTimeoutRef.current) {
        clearTimeout(recordTimeoutRef.current);
      }
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setIsRecording(false);
    setIsSending(false);
  };

  // Show recording UI
  if (isRecording || isSending) {
    
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
    
    return (
      <div className="fixed inset-x-0 bottom-0 z-[100] flex justify-center pb-20 px-4 pointer-events-none animate-in slide-in-from-bottom-5 duration-300">
        <div className="w-full max-w-lg pointer-events-auto">
          <div className="bg-gradient-to-br from-background via-card to-background/95 backdrop-blur-xl rounded-3xl shadow-2xl border-2 border-green-500/30 overflow-hidden">
            {/* Header */}
            <div className="px-5 pt-4 pb-3 border-b border-border/40 bg-gradient-to-r from-green-500/10 to-transparent">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="absolute inset-0 bg-green-500/30 rounded-full blur-md animate-pulse"></div>
                    <div className="relative h-11 w-11 rounded-full flex items-center justify-center shadow-lg bg-gradient-to-br from-green-500 via-green-500/90 to-green-500/70">
                      {isSending ? (
                        <Loader2 className="h-5 w-5 text-white animate-spin" />
                      ) : (
                        <Mic className="h-5 w-5 text-white" />
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-base font-bold text-foreground">
                      {isSending ? 'Enviando...' : 'Gravando...'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {isSending ? 'Aguarde' : formatTime(recordingTime)}
                    </p>
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleCancel}
                  disabled={isSending}
                  className="h-9 w-9 rounded-full hover:bg-destructive/10 hover:text-destructive transition-all hover:rotate-90 duration-300"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Audio Visualization */}
            <div className="px-5 py-6">
              <div className="relative p-4 rounded-2xl bg-gradient-to-br from-card to-card/50 border border-border/40 shadow-inner">
                {isSending ? (
                  <div className="flex items-center justify-center h-24">
                    <Loader2 className="h-8 w-8 text-green-500 animate-spin" />
                  </div>
                ) : (
                  <>
                    <LiveAudioVisualizer stream={streamRef.current} isRecording={isRecording} />
                    <p className="text-center text-sm text-muted-foreground mt-4">
                      Fale agora... Suas ondas aparecem em tempo real
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="px-5 pb-5">
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleCancel}
                  disabled={isSending}
                  className="flex-1 rounded-2xl border-2 hover:bg-muted hover:border-destructive/40 hover:text-destructive transition-all duration-300 h-12 font-semibold"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button
                  size="lg"
                  onClick={stopRecording}
                  disabled={isSending}
                  className="flex-1 rounded-2xl bg-gradient-to-r from-green-500 via-green-500/90 to-green-500/80 hover:from-green-600 hover:to-green-600/80 text-white shadow-xl shadow-green-500/30 transition-all duration-300 h-12 font-bold disabled:opacity-50"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Parar e Enviar
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Button
      size="icon"
      variant="ghost"
      onClick={startRecording}
      disabled={disabled}
      className="h-[80px] w-12"
      title="Gravar áudio"
    >
      <Mic className="h-5 w-5" />
    </Button>
  );
}