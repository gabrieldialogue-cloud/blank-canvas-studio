import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Loader2, Send, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AudioWaveform } from "./AudioWaveform";
import { Card } from "@/components/ui/card";

interface AudioRecorderProps {
  onAudioRecorded: (audioBlob: Blob) => Promise<void>;
  disabled?: boolean;
}

export function AudioRecorder({ onAudioRecorded, disabled }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [audioPreview, setAudioPreview] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());

        if (audioBlob.size > 0) {
          // Show preview instead of sending immediately
          setAudioPreview(audioBlob);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
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
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleSend = async () => {
    if (!audioPreview) return;
    
    setIsSending(true);
    try {
      await onAudioRecorded(audioPreview);
      setAudioPreview(null);
    } catch (error) {
      console.error("Erro ao enviar áudio:", error);
      toast({
        title: "Erro ao enviar áudio",
        description: "Não foi possível enviar o áudio gravado.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleCancel = () => {
    setAudioPreview(null);
  };

  // Show preview with waveform
  if (audioPreview) {
    return (
      <div className="fixed inset-x-0 bottom-0 z-[100] flex justify-center pb-20 px-4 pointer-events-none animate-in slide-in-from-bottom-5 duration-300">
        <div className="w-full max-w-lg pointer-events-auto">
          <div className="bg-gradient-to-br from-background via-card to-background/95 backdrop-blur-xl rounded-3xl shadow-2xl border-2 border-primary/30 overflow-hidden">
            {/* Header */}
            <div className="px-5 pt-4 pb-3 border-b border-border/40 bg-gradient-to-r from-primary/5 to-transparent">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 rounded-full blur-md animate-pulse"></div>
                    <div className="relative h-11 w-11 rounded-full bg-gradient-to-br from-primary via-primary/90 to-primary/70 flex items-center justify-center shadow-lg">
                      <Mic className="h-5 w-5 text-primary-foreground" />
                    </div>
                  </div>
                  <div>
                    <p className="text-base font-bold text-foreground">Áudio Gravado</p>
                    <p className="text-xs text-muted-foreground">Revise antes de enviar</p>
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleCancel}
                  className="h-9 w-9 rounded-full hover:bg-destructive/10 hover:text-destructive transition-all hover:rotate-90 duration-300"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Audio Content */}
            <div className="px-5 py-4">
              <div className="space-y-3">
                {/* Waveform */}
                <div className="relative p-3 rounded-2xl bg-gradient-to-br from-muted/50 to-muted/30 border border-border/40 shadow-inner">
                  <AudioWaveform audioBlob={audioPreview} className="bg-background/60 rounded-xl p-2 border border-border/20 shadow-sm" />
                </div>

                {/* Audio Player */}
                <div className="relative p-3 rounded-2xl bg-gradient-to-br from-card to-muted/30 border border-border/40 shadow-md">
                  <audio controls className="w-full h-9 audio-player-styled rounded-xl">
                    <source src={URL.createObjectURL(audioPreview)} type="audio/webm" />
                  </audio>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="px-5 pb-5">
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleCancel}
                  className="flex-1 rounded-2xl border-2 hover:bg-muted hover:border-destructive/40 hover:text-destructive transition-all duration-300 h-12 font-semibold"
                >
                  <X className="h-4 w-4 mr-2" />
                  Descartar
                </Button>
                <Button
                  size="lg"
                  onClick={handleSend}
                  disabled={isSending}
                  className="flex-1 rounded-2xl bg-gradient-to-r from-success via-success/90 to-success/80 hover:from-success/90 hover:to-success/70 text-white shadow-xl shadow-success/30 transition-all duration-300 h-12 font-bold disabled:opacity-50"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Enviar Áudio
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

  if (isSending) {
    return (
      <Button
        size="icon"
        variant="ghost"
        disabled
        className="h-[80px] w-12"
      >
        <Loader2 className="h-5 w-5 animate-spin" />
      </Button>
    );
  }

  return (
    <Button
      size="icon"
      variant={isRecording ? "destructive" : "ghost"}
      onClick={isRecording ? stopRecording : startRecording}
      disabled={disabled}
      className="h-[80px] w-12"
      title={isRecording ? "Parar gravação" : "Gravar áudio"}
    >
      {isRecording ? (
        <Square className="h-5 w-5 animate-pulse" />
      ) : (
        <Mic className="h-5 w-5" />
      )}
    </Button>
  );
}