import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { MediaGallery } from "@/components/chat/MediaGallery";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Send, MessageSquare, Image as ImageIcon } from "lucide-react";
import { AudioRecorder } from "@/components/chat/AudioRecorder";
import { FileUpload } from "@/components/chat/FileUpload";
import { ImagePreviewDialog } from "@/components/chat/ImagePreviewDialog";
import { useToast } from "@/hooks/use-toast";
import { compressImage, shouldCompress } from "@/lib/imageCompression";

interface Message {
  id: string;
  remetente_tipo: "ia" | "cliente" | "vendedor" | "supervisor";
  conteudo: string;
  created_at: string;
  attachment_url?: string;
  attachment_type?: string;
  attachment_filename?: string;
}

interface Cliente {
  telefone: string;
}

interface AtendimentoChatModalProps {
  atendimentoId: string | null;
  clienteNome: string;
  veiculoInfo: string;
  status: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  embedded?: boolean;
}

export function AtendimentoChatModal({
  atendimentoId,
  clienteNome,
  veiculoInfo,
  status,
  open,
  onOpenChange,
  embedded = false,
}: AtendimentoChatModalProps) {
  const [mensagens, setMensagens] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; file: File } | null>(null);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [supervisorInfo, setSupervisorInfo] = useState<{ id: string; nome: string } | null>(null);
  const [clienteTelefone, setClienteTelefone] = useState<string>("");
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const MESSAGES_PER_PAGE = 10;
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [mensagens]);

  useEffect(() => {
    const fetchSupervisorInfo = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('usuarios')
          .select('id, nome')
          .eq('user_id', user.id)
          .single();
        
        if (data) {
          setSupervisorInfo(data);
        }
      }
    };

    fetchSupervisorInfo();
  }, []);

  useEffect(() => {
    if (atendimentoId && (open || embedded)) {
      fetchMensagens();
      fetchClienteTelefone();

      // Setup realtime subscription with optimized settings
      const channel = supabase
        .channel(`atendimento-chat-modal-${atendimentoId}`, {
          config: {
            broadcast: { self: false }
          }
        })
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'mensagens',
            filter: `atendimento_id=eq.${atendimentoId}`
          },
          (payload) => {
            const newMessage = payload.new as Message;
            
            setMensagens((prev) => {
              const exists = prev.some(msg => msg.id === newMessage.id);
              if (exists) return prev;
              // Ensure the new message matches the Message type
              const typedMessage: Message = {
                id: newMessage.id,
                remetente_tipo: newMessage.remetente_tipo as "ia" | "cliente" | "vendedor" | "supervisor",
                conteudo: newMessage.conteudo,
                created_at: newMessage.created_at,
                attachment_url: (newMessage as any).attachment_url,
                attachment_type: (newMessage as any).attachment_type,
                attachment_filename: (newMessage as any).attachment_filename,
              };
              return [...prev, typedMessage];
            });
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'mensagens',
            filter: `atendimento_id=eq.${atendimentoId}`
          },
          (payload) => {
            const updatedMessage = payload.new;
            const typedMessage: Message = {
              id: updatedMessage.id,
              remetente_tipo: updatedMessage.remetente_tipo as "ia" | "cliente" | "vendedor" | "supervisor",
              conteudo: updatedMessage.conteudo,
              created_at: updatedMessage.created_at,
              attachment_url: (updatedMessage as any).attachment_url,
              attachment_type: (updatedMessage as any).attachment_type,
              attachment_filename: (updatedMessage as any).attachment_filename,
            };
            
            setMensagens((prev) => 
              prev.map(msg => msg.id === typedMessage.id ? typedMessage : msg)
            );
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [atendimentoId, open, embedded]);

  const fetchMensagens = async (isLoadMore = false) => {
    if (!atendimentoId) return;

    if (isLoadMore) {
      setIsLoadingMore(true);
    } else {
      setLoading(true);
    }

    const offset = isLoadMore ? mensagens.length : 0;
    const limit = MESSAGES_PER_PAGE;

    const { data, count } = await supabase
      .from("mensagens")
      .select("*", { count: 'exact' })
      .eq('atendimento_id', atendimentoId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (data) {
      const reversedData = [...data].reverse() as Message[];
      if (isLoadMore) {
        setMensagens(prev => [...reversedData, ...prev]);
      } else {
        setMensagens(reversedData);
      }
      
      // Check if there are more messages
      if (count !== null) {
        setHasMore((offset + data.length) < count);
      }
    }

    if (isLoadMore) {
      setIsLoadingMore(false);
    } else {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    fetchMensagens(true);
  };

  const fetchClienteTelefone = async () => {
    if (!atendimentoId) return;

    const { data } = await supabase
      .from("atendimentos")
      .select("clientes(telefone)")
      .eq('id', atendimentoId)
      .single();

    if (data && (data.clientes as any)?.telefone) {
      setClienteTelefone((data.clientes as any).telefone);
    }
  };

  const handleSend = async () => {
    if (!message.trim() || isSending || !supervisorInfo) return;

    setIsSending(true);
    try {
      // Enviar mensagem via WhatsApp com nome do supervisor
      const { data, error: whatsappError } = await supabase.functions.invoke('whatsapp-send', {
        body: {
          to: clienteTelefone,
          text: `*${supervisorInfo.nome}*: ${message}`,
        },
      });

      if (whatsappError) throw whatsappError;

      // Salvar no banco com remetente_tipo supervisor
      const { error: dbError } = await supabase
        .from('mensagens')
        .insert({
          atendimento_id: atendimentoId,
          conteudo: message,
          remetente_tipo: 'supervisor',
          remetente_id: supervisorInfo.id,
          whatsapp_message_id: data?.messageId,
        });

      if (dbError) throw dbError;

      setMessage("");
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      toast({
        title: "Erro ao enviar mensagem",
        description: "Não foi possível enviar a mensagem.",
        variant: "destructive",
      });
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
    if (!supervisorInfo) return;

    try {
      const fileName = `${Date.now()}-audio.ogg`;
      const filePath = `${atendimentoId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-audios')
        .upload(filePath, audioBlob, {
          contentType: 'audio/ogg',
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-audios')
        .getPublicUrl(filePath);

      // Enviar via WhatsApp com identificação do supervisor
      const { data, error } = await supabase.functions.invoke('whatsapp-send', {
        body: {
          to: clienteTelefone,
          audioUrl: publicUrl,
          caption: `Áudio de ${supervisorInfo.nome}`,
        },
      });

      if (error) throw error;

      // Salvar no banco
      const { error: dbError } = await supabase
        .from('mensagens')
        .insert({
          atendimento_id: atendimentoId,
          conteudo: '[Áudio]',
          remetente_tipo: 'supervisor',
          remetente_id: supervisorInfo.id,
          attachment_url: publicUrl,
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
    if (file.type.startsWith('image/')) {
      const imageUrl = URL.createObjectURL(file);
      setPreviewImage({ url: imageUrl, file });
      setShowImagePreview(true);
    } else {
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
    if (!supervisorInfo) return;

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
        const nameParts = file.name.split('.');
        nameParts[nameParts.length - 1] = 'jpg';
        finalFileName = nameParts.join('.');
      }

      const timestamp = Date.now();
      const fileName = `${timestamp}-${finalFileName}`;
      const filePath = `${atendimentoId}/${fileName}`;

      // Upload para Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('chat-files')
        .upload(filePath, fileToUpload, {
          contentType: contentType,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-files')
        .getPublicUrl(filePath);

      const isImage = file.type.startsWith('image/');
      const mediaType = isImage ? 'image' : 'document';

      // Enviar via WhatsApp com identificação do supervisor
      const { data, error } = await supabase.functions.invoke('whatsapp-send', {
        body: {
          to: clienteTelefone,
          mediaType: mediaType,
          mediaUrl: publicUrl,
          filename: finalFileName,
          caption: isImage ? `Imagem de ${supervisorInfo.nome}` : `Documento de ${supervisorInfo.nome}: ${finalFileName}`,
        },
      });

      if (error) throw error;

      // Salvar no banco
      const messageData = {
        atendimento_id: atendimentoId,
        conteudo: isImage ? '[Imagem]' : `[Documento: ${finalFileName}]`,
        remetente_tipo: 'supervisor',
        remetente_id: supervisorInfo.id,
        attachment_url: publicUrl,
        attachment_type: mediaType,
        attachment_filename: finalFileName,
        whatsapp_message_id: data?.messageId,
      };

      const { error: dbError } = await supabase
        .from('mensagens')
        .insert(messageData);

      if (dbError) throw dbError;

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

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      aguardando_orcamento: "bg-accent/10 text-accent border-accent",
      aguardando_fechamento: "bg-success/10 text-success border-success",
      solicitacao_reembolso: "bg-destructive/10 text-destructive border-destructive",
      solicitacao_garantia: "bg-primary/10 text-primary border-primary",
      solicitacao_troca: "bg-secondary/10 text-secondary border-secondary",
      resolvido: "bg-success/10 text-success border-success",
    };
    return colors[status] || "bg-muted text-muted-foreground";
  };

  const content = (
    <>
      <ImagePreviewDialog
        open={showImagePreview}
        onOpenChange={setShowImagePreview}
        imageUrl={previewImage?.url || ''}
        fileName={previewImage?.file.name || ''}
        onConfirm={handleConfirmImageSend}
        isSending={isSending}
      />

      <div className="flex items-center justify-between border-b pb-3 px-4 pt-4">
        <div>
          <p className="text-lg font-semibold">{clienteNome}</p>
          <p className="text-sm text-muted-foreground font-normal">{veiculoInfo}</p>
        </div>
        <Badge variant="outline" className={getStatusColor(status)}>
          {status.replace(/_/g, ' ')}
        </Badge>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <Tabs defaultValue="chat" className="flex-1 flex flex-col">
            <TabsList className="mx-4 mt-2">
              <TabsTrigger value="chat" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Chat
              </TabsTrigger>
              <TabsTrigger value="media" className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Mídias
              </TabsTrigger>
            </TabsList>

            <TabsContent value="chat" className="flex-1 flex flex-col mt-0">
              <ScrollArea className="flex-1 px-4 py-4" ref={scrollRef}>
                <div className="space-y-4">
                  {hasMore && (
                    <div className="flex justify-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleLoadMore}
                        disabled={isLoadingMore}
                        className="mb-4"
                      >
                        {isLoadingMore ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Carregando...
                          </>
                        ) : (
                          'Carregar mensagens anteriores'
                        )}
                      </Button>
                    </div>
                  )}
                  
                  {mensagens.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      Nenhuma mensagem ainda
                    </div>
                  ) : (
                    mensagens.map((mensagem: any) => (
                      <ChatMessage
                        key={mensagem.id}
                        messageId={mensagem.id}
                        remetenteTipo={mensagem.remetente_tipo}
                        conteudo={mensagem.conteudo}
                        createdAt={mensagem.created_at}
                        attachmentUrl={mensagem.attachment_url}
                        attachmentType={mensagem.attachment_type}
                        attachmentFilename={mensagem.attachment_filename}
                        transcription={mensagem.attachment_type === 'audio' && mensagem.conteudo !== '[Áudio]' && mensagem.conteudo !== '[Audio]' ? mensagem.conteudo : null}
                      />
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="media" className="flex-1 mt-0">
              <MediaGallery 
                mensagens={mensagens as any}
                hasMoreMedia={hasMore}
                onLoadMore={handleLoadMore}
              />
            </TabsContent>
          </Tabs>

          {/* Input de mensagem */}
          <div className="border-t border-border/40 bg-gradient-to-br from-background to-muted/20 p-4">
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
        </>
      )}
    </>
  );

  if (embedded) {
    return <div className="flex flex-col h-full">{content}</div>;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div>
              <p className="text-lg font-semibold">{clienteNome}</p>
              <p className="text-sm text-muted-foreground font-normal">{veiculoInfo}</p>
            </div>
            <Badge variant="outline" className={getStatusColor(status)}>
              {status.replace(/_/g, ' ')}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {content}
      </DialogContent>
    </Dialog>
  );
}
