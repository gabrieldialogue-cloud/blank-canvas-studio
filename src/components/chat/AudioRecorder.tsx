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
      <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center pb-4 px-4 pointer-events-none">
        <Card className="w-full max-w-md p-3 shadow-2xl bg-gradient-to-br from-card to-card/95 backdrop-blur-sm border-2 border-primary/20 pointer-events-auto animate-in slide-in-from-bottom-4 duration-300">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
                  <Mic className="h-4 w-4 text-primary-foreground animate-pulse" />
                </div>
                <p className="text-sm font-bold text-foreground">Preview do Áudio</p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={handleCancel}
                className="h-7 w-7 rounded-full hover:bg-destructive/10 hover:text-destructive transition-all"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            
            <div className="space-y-2 p-2 rounded-xl bg-muted/30 border border-border/50">
              <AudioWaveform audioBlob={audioPreview} className="bg-background/50 rounded-lg p-1.5 border border-border/30" />
              <audio controls className="w-full h-8 rounded-lg audio-player-styled">
                <source src={URL.createObjectURL(audioPreview)} type="audio/webm" />
              </audio>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                className="flex-1 hover:bg-muted border-2 hover:border-destructive/50 transition-all h-8"
              >
                <X className="h-3.5 w-3.5 mr-1.5" />
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleSend}
                disabled={isSending}
                className="flex-1 bg-gradient-to-r from-success to-success/90 hover:from-success/90 hover:to-success/80 text-white shadow-lg shadow-success/20 transition-all h-8"
              >
                {isSending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5 mr-1.5" />
                    Enviar
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>
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