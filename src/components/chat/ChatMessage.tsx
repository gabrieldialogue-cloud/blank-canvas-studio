import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bot, User, Headphones, UserCircle, File, Download, FileText, FileSpreadsheet, FileImage, Archive, Check, CheckCheck, Clock, Mic, FileType, Play, Pause, Volume2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ClientAvatar } from "@/components/ui/client-avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ChatMessageProps {
  remetenteTipo: "ia" | "cliente" | "vendedor" | "supervisor";
  conteudo: string;
  createdAt: string;
  attachmentUrl?: string | null;
  attachmentType?: string | null;
  attachmentFilename?: string | null;
  searchTerm?: string;
  isHighlighted?: boolean;
  readAt?: string | null;
  deliveredAt?: string | null;
  showSenderName?: boolean;
  clientePushName?: string | null;
  clienteProfilePicture?: string | null;
  status?: "enviando" | "enviada" | "entregue" | "lida";
  transcription?: string | null;
  messageId?: string;
}

const remetenteConfig = {
  ia: {
    icon: Bot,
    bubbleTone: "bg-primary text-primary-foreground border-primary/40 shadow-primary/30",
    label: "IA",
    align: "left" as const,
  },
  cliente: {
    icon: User,
    bubbleTone: "bg-card text-card-foreground border-border shadow-sm",
    label: "Cliente",
    align: "left" as const,
  },
  vendedor: {
    icon: Headphones,
    bubbleTone: "bg-altese-orange text-accent-foreground border-altese-orange/40 shadow-altese-orange/30",
    label: "Você",
    align: "right" as const,
  },
  supervisor: {
    icon: UserCircle,
    bubbleTone: "bg-accent text-accent-foreground border-accent/40 shadow-accent/30",
    label: "Supervisor",
    align: "right" as const,
  },
};

export function ChatMessage({ 
  remetenteTipo, 
  conteudo, 
  createdAt, 
  attachmentUrl, 
  attachmentType, 
  attachmentFilename,
  searchTerm = "",
  isHighlighted = false,
  readAt,
  deliveredAt,
  showSenderName = true,
  clientePushName,
  clienteProfilePicture,
  status,
  transcription,
  messageId
}: ChatMessageProps) {
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [localTranscription, setLocalTranscription] = useState(transcription);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { toast } = useToast();
  const config = remetenteConfig[remetenteTipo];
  const Icon = config.icon;

  const isImage = attachmentType === 'image';
  const isDocument = attachmentType === 'document';
  const isAudio = attachmentType === 'audio';

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  useEffect(() => {
    setLocalTranscription(transcription);
  }, [transcription]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const handleSpeedChange = () => {
    const speeds = [1, 1.5, 2];
    const currentIndex = speeds.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % speeds.length;
    setPlaybackRate(speeds[nextIndex]);
  };

  const togglePlayPause = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;
    
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleTranscribe = async () => {
    if (!attachmentUrl || !messageId) return;

    setIsTranscribing(true);
    try {
      // Fetch audio file and convert to base64
      const response = await fetch(attachmentUrl);
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

      // Call transcription function
      const { data, error } = await supabase.functions.invoke('transcribe-audio', {
        body: { audio: base64Audio },
      });

      if (error) throw error;

      if (data?.text) {
        // Update message with transcription
        const { error: updateError } = await supabase
          .from('mensagens')
          .update({ conteudo: data.text })
          .eq('id', messageId);

        if (updateError) throw updateError;

        setLocalTranscription(data.text);
        toast({
          title: "Áudio transcrito",
          description: "A transcrição foi adicionada com sucesso.",
        });
      }
    } catch (error) {
      console.error('Error transcribing audio:', error);
      toast({
        title: "Erro na transcrição",
        description: "Não foi possível transcrever o áudio.",
        variant: "destructive",
      });
    } finally {
      setIsTranscribing(false);
    }
  };

  // Highlight text function
  const highlightText = (text: string, search: string) => {
    if (!search.trim()) return text;
    
    const regex = new RegExp(`(${search})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-300 dark:bg-yellow-600 px-1 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  // Extract file name and extension from filename or URL
  const getFileInfo = (url: string, filename?: string | null) => {
    // Use the actual filename from WhatsApp if available
    const actualFileName = filename || url.split('/').pop() || 'documento';
    const decodedName = decodeURIComponent(actualFileName);
    const nameParts = decodedName.split('.');
    const extension = nameParts.length > 1 ? nameParts[nameParts.length - 1].toUpperCase() : 'FILE';
    const displayName = nameParts.length > 1 ? nameParts.slice(0, -1).join('.') : decodedName;
    
    return { fileName: decodedName, extension, displayName };
  };

  // Get appropriate icon for file type
  const getDocumentIcon = (url: string) => {
    const ext = url.toLowerCase();
    if (ext.includes('.pdf')) return FileText;
    if (ext.includes('.doc') || ext.includes('.docx')) return FileText;
    if (ext.includes('.xls') || ext.includes('.xlsx')) return FileSpreadsheet;
    if (ext.includes('.zip') || ext.includes('.rar') || ext.includes('.7z')) return Archive;
    if (ext.includes('.jpg') || ext.includes('.jpeg') || ext.includes('.png')) return FileImage;
    return File;
  };

  const fileInfo = attachmentUrl && isDocument ? getFileInfo(attachmentUrl, attachmentFilename) : null;
  const DocumentIcon = attachmentUrl && isDocument ? getDocumentIcon(attachmentFilename || attachmentUrl) : File;

  return (
    <>
      <div className={cn(
        "flex gap-2 sm:gap-3 animate-fade-in",
        showSenderName ? "mb-3 sm:mb-4" : "mb-1.5 sm:mb-2",
        config.align === "right" && "flex-row-reverse",
        isHighlighted && "bg-yellow-100 dark:bg-yellow-900/20 p-2 rounded-lg -mx-2"
      )}>
      {showSenderName ? (
        remetenteTipo === "cliente" ? (
          <ClientAvatar
            name={clientePushName || "Cliente"}
            imageUrl={clienteProfilePicture}
            className="h-8 w-8 sm:h-10 sm:w-10 shrink-0 self-center"
          />
        ) : (
          <div className={cn("flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full self-center bg-primary text-primary-foreground")}>
            <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground" />
          </div>
        )
      ) : (
        <div className="w-8 sm:w-10 shrink-0" />
      )}

      <div className={cn("flex flex-col gap-1 max-w-[85%] sm:max-w-[75%] md:max-w-[70%]", config.align === "right" && "items-end")}>
        {showSenderName && (
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm sm:text-base font-semibold text-foreground">
              {remetenteTipo === "cliente" && clientePushName ? clientePushName : config.label}
            </span>
          </div>
        )}
        
        {attachmentUrl && isImage && (
          <div 
            className="rounded-xl overflow-hidden border border-border max-w-[280px] sm:max-w-[320px] mb-2 cursor-pointer group relative shadow-lg hover:shadow-xl transition-all"
            onClick={() => setShowImageDialog(true)}
          >
            <img 
              src={attachmentUrl} 
              alt="Anexo"
              className="w-full h-auto max-h-[400px] object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
              <div className="bg-white/90 dark:bg-black/90 p-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                <Download className="h-6 w-6 text-foreground" />
              </div>
            </div>
          </div>
        )}

        {attachmentUrl && isAudio && (
          <div className="mb-2 max-w-[480px]">
            <div className="relative w-full overflow-hidden rounded-3xl bg-gradient-to-br from-card via-card/95 to-muted/40 border-2 border-border/50 shadow-xl transition-all hover:shadow-2xl hover:border-primary/30">
              {/* Decorative gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none"></div>
              
              <div className="relative p-4 space-y-3">
                {/* Header with icon and timestamp */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="absolute inset-0 bg-primary/20 rounded-xl blur-md"></div>
                      <div className={cn(
                        "relative h-11 w-11 rounded-xl shadow-lg flex items-center justify-center",
                        remetenteTipo === "cliente" && "bg-gradient-to-br from-primary via-primary/90 to-primary/70",
                        remetenteTipo === "ia" && "bg-gradient-to-br from-primary via-primary/80 to-primary/60",
                        remetenteTipo === "vendedor" && "bg-gradient-to-br from-success via-success/90 to-success/70",
                        remetenteTipo === "supervisor" && "bg-gradient-to-br from-accent via-accent/90 to-accent/70"
                      )}>
                        <Mic className="h-5 w-5 text-white drop-shadow-sm" />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">Mensagem de Áudio</p>
                      <p className="text-xs text-muted-foreground font-medium">
                        {format(new Date(createdAt), "dd/MM/yyyy • HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Audio Player Container */}
                <div className="relative p-4 rounded-2xl bg-gradient-to-br from-background/80 to-muted/30 border border-border/40 shadow-inner backdrop-blur-sm">
                  {/* Hidden native audio element */}
                  <audio 
                    ref={audioRef}
                    className="hidden"
                  >
                    <source src={attachmentUrl} type="audio/ogg" />
                    <source src={attachmentUrl} type="audio/webm" />
                    <source src={attachmentUrl} type="audio/mpeg" />
                  </audio>

                  {/* Custom Player Controls */}
                  <div className="space-y-3">
                    {/* Play/Pause and Progress */}
                    <div className="flex items-center gap-3">
                      <Button
                        size="icon"
                        onClick={togglePlayPause}
                        className={cn(
                          "h-11 w-11 rounded-full shadow-lg transition-all hover:scale-110",
                          remetenteTipo === "cliente" && "bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70",
                          remetenteTipo === "ia" && "bg-gradient-to-br from-primary to-primary/70 hover:from-primary/80 hover:to-primary/60",
                          remetenteTipo === "vendedor" && "bg-gradient-to-br from-success to-success/80 hover:from-success/90 hover:to-success/70",
                          remetenteTipo === "supervisor" && "bg-gradient-to-br from-accent to-accent/80 hover:from-accent/90 hover:to-accent/70"
                        )}
                      >
                        {isPlaying ? (
                          <Pause className="h-5 w-5 text-white fill-white" />
                        ) : (
                          <Play className="h-5 w-5 text-white fill-white ml-0.5" />
                        )}
                      </Button>

                      <div className="flex-1 space-y-1.5">
                        {/* Progress Bar */}
                        <div 
                          className="relative h-2 bg-muted rounded-full cursor-pointer group overflow-hidden"
                          onClick={handleProgressClick}
                        >
                          <div 
                            className={cn(
                              "absolute inset-y-0 left-0 rounded-full transition-all",
                              remetenteTipo === "cliente" && "bg-gradient-to-r from-primary to-primary/80",
                              remetenteTipo === "ia" && "bg-gradient-to-r from-primary to-primary/70",
                              remetenteTipo === "vendedor" && "bg-gradient-to-r from-success to-success/80",
                              remetenteTipo === "supervisor" && "bg-gradient-to-r from-accent to-accent/80"
                            )}
                            style={{ width: `${(currentTime / duration) * 100 || 0}%` }}
                          >
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 h-3 w-3 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"></div>
                          </div>
                        </div>

                        {/* Time Display */}
                        <div className="flex items-center justify-between text-[10px] font-medium text-muted-foreground px-0.5">
                          <span>{formatTime(currentTime)}</span>
                          <span>{formatTime(duration)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Volume Control */}
                    <div className="flex items-center gap-2">
                      <Volume2 className="h-4 w-4 text-muted-foreground" />
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={volume}
                        onChange={handleVolumeChange}
                        className="flex-1 h-1.5 bg-muted rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md"
                      />
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleSpeedChange}
                    className="h-8 px-3 text-xs font-bold rounded-xl shadow-sm hover:shadow-md transition-all"
                  >
                    <span className="mr-1">⚡</span>
                    {playbackRate}x
                  </Button>
                  {!localTranscription && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleTranscribe}
                      disabled={isTranscribing}
                      className="h-8 px-3 text-xs font-semibold rounded-xl shadow-sm hover:shadow-md transition-all border-2"
                    >
                      {isTranscribing ? (
                        <>
                          <Clock className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                          Transcrevendo...
                        </>
                      ) : (
                        <>
                          <FileType className="h-3.5 w-3.5 mr-1.5" />
                          Transcrever
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
            {localTranscription && localTranscription !== '[Áudio]' && localTranscription !== '[Audio]' && (
              <div
                className={cn(
                  "rounded-xl px-3 py-2.5 text-sm w-full border-2 bg-gradient-to-br shadow-sm mt-3",
                  remetenteTipo === "cliente" && "from-card to-card/50 text-card-foreground border-border",
                  remetenteTipo === "ia" && "from-primary/10 to-primary/5 text-primary border-primary/30",
                  remetenteTipo === "vendedor" && "from-success/10 to-success/5 text-success-foreground border-success/30",
                  remetenteTipo === "supervisor" && "from-accent/10 to-accent/5 text-accent-foreground border-accent/30"
                )}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <Badge variant="outline" className="text-[10px] font-medium">Transcrição</Badge>
                </div>
                <p className="text-xs leading-relaxed whitespace-pre-wrap">{localTranscription}</p>
              </div>
            )}
          </div>
        )}

        {attachmentUrl && isDocument && fileInfo && (
          <div
            className={cn(
              "flex items-center gap-3 rounded-xl px-4 py-3.5 border-2 transition-all mb-2 cursor-pointer hover:scale-[1.02] hover:shadow-lg max-w-[320px]",
              remetenteTipo === "cliente" && "bg-card/80 text-card-foreground border-border hover:border-primary/50",
              remetenteTipo === "ia" && "bg-primary/10 text-primary border-primary/40 hover:border-primary",
              remetenteTipo === "vendedor" && "bg-success/10 text-success border-success/40 hover:border-success",
              remetenteTipo === "supervisor" && "bg-accent/10 text-accent border-accent/40 hover:border-accent"
            )}
            onClick={() => {
              // Create a temporary link to download the file
              const link = document.createElement("a");
              link.href = attachmentUrl;
              link.download = fileInfo.fileName;
              link.target = "_blank";
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-background/30">
              <DocumentIcon className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{fileInfo.displayName}</p>
              <p className="text-xs opacity-80 flex items-center gap-1 mt-0.5">
                <Download className="h-3 w-3" />
                Clique para baixar • {fileInfo.extension}
              </p>
            </div>
          </div>
        )}
        
        {conteudo && !(isAudio && (conteudo === '[Áudio]' || conteudo === '[Audio]' || localTranscription)) && (
          <div
            className={cn(
              "rounded-2xl px-3 py-2 sm:px-4 sm:py-2.5 relative border shadow-md",
              config.bubbleTone
            )}
          >
            <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap break-words">
              {highlightText(conteudo, searchTerm)}
            </p>
            <div className="flex items-center justify-between gap-3 mt-1.5">
              <span className="text-[10px] sm:text-[11px] opacity-80">
                {format(new Date(createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
              </span>
              {(remetenteTipo === "vendedor" || remetenteTipo === "supervisor" || remetenteTipo === "ia") && (
                <span className="flex items-center gap-0.5">
                  {status === "enviando" ? (
                    <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 opacity-60 animate-pulse" />
                  ) : status === "lida" || readAt ? (
                    <CheckCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-success" />
                  ) : status === "entregue" || deliveredAt ? (
                    <CheckCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4 opacity-60" />
                  ) : (
                    <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 opacity-60" />
                  )}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>

    {/* Image Preview Dialog */}
    {attachmentUrl && isImage && (
      <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <DialogContent className="max-w-4xl p-0">
          <div className="relative">
            <img
              src={attachmentUrl}
              alt="Visualização completa"
              className="w-full h-auto max-h-[85vh] object-contain"
            />
            <div className="p-4 border-t bg-background">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    {remetenteTipo === "cliente" && clientePushName ? clientePushName : config.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <Button
                  variant="default"
                  size="sm"
                  onClick={async () => {
                    try {
                      const response = await fetch(attachmentUrl);
                      const blob = await response.blob();
                      const url = window.URL.createObjectURL(blob);
                      const link = document.createElement("a");
                      link.href = url;
                      link.download = `imagem-${format(new Date(createdAt), "ddMMyyyy-HHmmss")}.jpg`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      window.URL.revokeObjectURL(url);
                    } catch (error) {
                      console.error("Erro ao baixar imagem:", error);
                    }
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Baixar Imagem
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )}
  </>
  );
}
