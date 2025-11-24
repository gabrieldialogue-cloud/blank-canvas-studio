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
import { ImagePreviewDialog } from "./ImagePreviewDialog";
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
  const [previewImage, setPreviewImage] = useState<{ url: string; file: File } | null>(null);
  const [showImagePreview, setShowImagePreview] = useState(false);
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
    // Se for imagem, mostrar preview
    if (file.type.startsWith('image/')) {
      const imageUrl = URL.createObjectURL(file);
      setPreviewImage({ url: imageUrl, file });
      setShowImagePreview(true);
    } else {
      // Se for documento, enviar direto
      await sendFile(file);
    }
  };

  const handleConfirmImageSend = async () => {
    if (!previewImage) return;
    await sendFile(previewImage.file);
    setShowImagePreview(false);
    URL.revokeObjectURL(previewImage.url);
    setPreviewImage(null);
  };

  const sendFile = async (file: File) => {
    setIsSending(true);
    try {
      let fileToUpload: File | Blob = file;
      let contentType = file.type;
      let finalFileName = file.name;

      // Comprimir imagens se necessário
      if (file.type.startsWith('image/') && shouldCompress(file)) {
        toast({
          title: "Comprimindo imagem...",
          description: "Aguarde enquanto otimizamos a imagem.",
        });
        fileToUpload = await compressImage(file);
        contentType = 'image/jpeg';
        // Manter o nome original mas trocar extensão para .jpg
        const nameParts = file.name.split('.');
        nameParts[nameParts.length - 1] = 'jpg';
        finalFileName = nameParts.join('.');
      }

      const timestamp = Date.now();
      const fileName = `${timestamp}-${finalFileName}`;
      const filePath = `${atendimentoId}/${fileName}`;

      console.log('Uploading file:', fileName, 'Type:', contentType);

      // Upload para o Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('chat-files')
        .upload(filePath, fileToUpload, {
          contentType: contentType,
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('chat-files')
        .getPublicUrl(filePath);

      console.log('File uploaded, public URL:', publicUrl);

      // Determinar tipo de mídia para WhatsApp
      const isImage = file.type.startsWith('image/');
      const mediaType = isImage ? 'image' : 'document';

      console.log('Sending to WhatsApp:', { mediaType, to: clienteTelefone, mediaUrl: publicUrl });

      // Send via WhatsApp
      const { data, error } = await supabase.functions.invoke('whatsapp-send', {
        body: {
          to: clienteTelefone,
          mediaType: mediaType,
          mediaUrl: publicUrl,
          filename: finalFileName,
          caption: isImage ? undefined : finalFileName,
        },
      });

      console.log('WhatsApp send response (files):', { data, error });

      if (error) {
        console.error('WhatsApp send error:', error);
        throw error;
      }

      // Save message to database
      const messageData = {
        atendimento_id: atendimentoId,
        conteudo: isImage ? '[Imagem]' : `[Documento: ${finalFileName}]`,
        remetente_tipo: 'vendedor',
        remetente_id: vendedorId,
        attachment_url: publicUrl,
        attachment_type: mediaType,
        attachment_filename: finalFileName,
        whatsapp_message_id: data?.messageId,
      };

      console.log('Saving to database:', messageData);

      const { error: dbError } = await supabase
        .from('mensagens')
        .insert(messageData);

      if (dbError) {
        console.error('Database error:', dbError);
        throw dbError;
      }

      toast({
        title: `${isImage ? 'Imagem' : 'Documento'} enviado`,
        description: `Seu ${isImage ? 'imagem' : 'documento'} foi enviado com sucesso!`,
      });
    } catch (error) {
      console.error("Erro ao enviar arquivo:", error);
      toast({
        title: "Erro ao enviar arquivo",
        description: error instanceof Error ? error.message : "Não foi possível enviar o arquivo.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <ImagePreviewDialog
        open={showImagePreview}
        onOpenChange={setShowImagePreview}
        imageUrl={previewImage?.url || ''}
        fileName={previewImage?.file.name || ''}
        onConfirm={handleConfirmImageSend}
        isSending={isSending}
      />
      
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
    </>
  );
}
