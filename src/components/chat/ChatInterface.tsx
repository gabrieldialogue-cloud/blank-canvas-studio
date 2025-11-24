import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, X } from "lucide-react";
import { ChatMessage } from "./ChatMessage";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { AudioRecorder } from "./AudioRecorder";
import { FileUpload } from "./FileUpload";
import { useToast } from "@/hooks/use-toast";
import { compressImage, shouldCompress } from "@/lib/imageCompression";

interface Message {
  id: string;
  remetente_tipo: "ia" | "cliente" | "vendedor" | "supervisor";
  conteudo: string;
  created_at: string;
}

interface ChatInterfaceProps {
  atendimentoId: string;
  clienteNome: string;
  clienteTelefone: string;
  mensagens: Message[];
  onClose: () => void;
  onSendMessage: (message: string) => Promise<void>;
  vendedorId?: string;
}

export function ChatInterface({
  atendimentoId,
  clienteNome,
  clienteTelefone,
  mensagens,
  onClose,
  onSendMessage,
  vendedorId,
}: ChatInterfaceProps) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  // Track typing indicator
  const isTyping = message.length > 0 && !isSending;
  useTypingIndicator(vendedorId || null, isTyping);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [mensagens]);

  const handleSend = async () => {
    if (!message.trim() || isSending) return;

    setIsSending(true);
    try {
      await onSendMessage(message);
      setMessage("");
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAudioRecorded = async (audioBlob: Blob) => {
    try {
      // Only OGG format should reach here (WebM is blocked by AudioRecorder)
      const fileName = `${Date.now()}-audio.ogg`;
      const filePath = `${atendimentoId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-audios')
        .upload(filePath, audioBlob, {
          contentType: 'audio/ogg',
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('chat-audios')
        .getPublicUrl(filePath);

      const finalAudioUrl = publicUrl;

      // Send audio via WhatsApp
      const { data, error } = await supabase.functions.invoke('whatsapp-send', {
        body: {
          to: clienteTelefone,
          audioUrl: finalAudioUrl,
        },
      });

      if (error) throw error;

      // Save message to database without transcription
      const { error: dbError } = await supabase
        .from('mensagens')
        .insert({
          atendimento_id: atendimentoId,
          conteudo: '[Áudio]',
          remetente_tipo: 'vendedor',
          remetente_id: vendedorId,
          attachment_url: finalAudioUrl,
          attachment_type: 'audio',
          attachment_filename: fileName,
          whatsapp_message_id: data?.messageId,
        });

      if (dbError) throw dbError;

      toast({
        title: "Áudio enviado",
        description: "Seu áudio foi enviado com sucesso!",
      });
    } catch (error) {
      console.error("Erro ao enviar áudio:", error);
      toast({
        title: "Erro ao enviar áudio",
        description: "Não foi possível enviar o áudio.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleFileSelected = async (file: File) => {
    setIsSending(true);
    try {
      let fileToUpload: File | Blob = file;
      let contentType = file.type;

      // Comprimir imagens se necessário
      if (file.type.startsWith('image/') && shouldCompress(file)) {
        toast({
          title: "Comprimindo imagem...",
          description: "Aguarde enquanto otimizamos a imagem.",
        });
        fileToUpload = await compressImage(file);
        contentType = 'image/jpeg'; // Após compressão sempre JPEG
      }

      const fileName = `${Date.now()}-${file.name}`;
      const filePath = `${atendimentoId}/${fileName}`;

      // Upload para o Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('chat-files')
        .upload(filePath, fileToUpload, {
          contentType: contentType,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('chat-files')
        .getPublicUrl(filePath);

      // Determinar tipo de mídia para WhatsApp
      const isImage = file.type.startsWith('image/');
      const mediaType = isImage ? 'image' : 'document';

      // Send via WhatsApp
      const { data, error } = await supabase.functions.invoke('whatsapp-send', {
        body: {
          to: clienteTelefone,
          mediaType: mediaType,
          mediaUrl: publicUrl,
          filename: file.name,
          caption: isImage ? undefined : file.name,
        },
      });

      if (error) throw error;

      // Save message to database
      const { error: dbError } = await supabase
        .from('mensagens')
        .insert({
          atendimento_id: atendimentoId,
          conteudo: isImage ? '[Imagem]' : `[Documento: ${file.name}]`,
          remetente_tipo: 'vendedor',
          remetente_id: vendedorId,
          attachment_url: publicUrl,
          attachment_type: mediaType,
          attachment_filename: file.name,
          whatsapp_message_id: data?.messageId,
        });

      if (dbError) throw dbError;

      toast({
        title: `${isImage ? 'Imagem' : 'Documento'} enviado`,
        description: `Seu ${isImage ? 'imagem' : 'documento'} foi enviado com sucesso!`,
      });
    } catch (error) {
      console.error("Erro ao enviar arquivo:", error);
      toast({
        title: "Erro ao enviar arquivo",
        description: "Não foi possível enviar o arquivo.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className="fixed right-0 top-0 h-full w-full md:w-[600px] bg-card shadow-2xl">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border bg-primary px-6 py-4">
            <h2 className="text-lg font-semibold text-primary-foreground">
              Conversa com {clienteNome}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-primary-foreground hover:bg-primary/90"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 px-6 py-4" ref={scrollRef}>
            <div className="space-y-4">
              {mensagens.map((msg: any) => (
                <ChatMessage
                  key={msg.id}
                  messageId={msg.id}
                  remetenteTipo={msg.remetente_tipo}
                  conteudo={msg.conteudo}
                  createdAt={msg.created_at}
                  attachmentUrl={msg.attachment_url}
                  attachmentType={msg.attachment_type}
                  attachmentFilename={msg.attachment_filename}
                  transcription={msg.attachment_type === 'audio' && msg.conteudo !== '[Áudio]' && msg.conteudo !== '[Audio]' ? msg.conteudo : null}
                />
              ))}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="border-t border-border/40 bg-gradient-to-br from-background to-muted/20 p-6 shadow-[inset_0_8px_12px_-8px_rgba(0,0,0,0.1)]">
            <div className="flex gap-3 items-end bg-card/60 backdrop-blur-sm p-3 rounded-3xl shadow-lg border border-border/50">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Digite sua mensagem..."
                className="min-h-[60px] max-h-[120px] resize-none flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/60"
                disabled={isSending}
              />
              <div className="flex gap-2">
                <FileUpload 
                  onFileSelected={handleFileSelected}
                  disabled={isSending}
                />
                <AudioRecorder 
                  onAudioRecorded={handleAudioRecorded}
                  disabled={isSending}
                />
                <Button
                  onClick={handleSend}
                  disabled={!message.trim() || isSending}
                  size="icon"
                  className="h-14 w-14 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg shadow-green-500/30 transition-all duration-300 hover:scale-105 shrink-0 disabled:opacity-50 disabled:hover:scale-100"
                >
                  <Send className="h-5 w-5 text-white" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
