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
import { Loader2, Send, MessageSquare, Image as ImageIcon, Trash2, Sparkles } from "lucide-react";
import { AudioRecorder } from "@/components/chat/AudioRecorder";
import { FileUpload } from "@/components/chat/FileUpload";
import { ImagePreviewDialog } from "@/components/chat/ImagePreviewDialog";
import { useToast } from "@/hooks/use-toast";
import { compressImage, shouldCompress } from "@/lib/imageCompression";
import { useWhatsAppWindow } from "@/hooks/useWhatsAppWindow";
import { WhatsAppWindowAlert } from "@/components/chat/WhatsAppWindowAlert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isGeneratingSuggestion, setIsGeneratingSuggestion] = useState(false);

  // Verificar janela de 24h do WhatsApp
  const { isWindowClosed, lastClientMessageAt, hoursSinceLast } = useWhatsAppWindow({
    messages: mensagens,
    enabled: true,
  });

  useEffect(() => {
    if (scrollRef.current) {
      const scrollElement = scrollRef.current;
      // Rolar para o final imediatamente
      setTimeout(() => {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }, 100);
    }
  }, [mensagens, atendimentoId]);

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
      .select(`
        *,
        usuarios:remetente_id(nome),
        atendimentos!inner(
          clientes(push_name, profile_picture_url)
        )
      `, { count: 'exact' })
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
          message: `*${supervisorInfo.nome}*: ${message}`,
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

  const handleDeleteContact = async () => {
    if (!atendimentoId) return;
    
    setIsDeleting(true);
    try {
      // Buscar o cliente_id do atendimento
      const { data: atendimento } = await supabase
        .from('atendimentos')
        .select('cliente_id')
        .eq('id', atendimentoId)
        .single();

      if (!atendimento?.cliente_id) {
        throw new Error('Cliente não encontrado');
      }

      // Deletar o cliente (cascade vai deletar atendimentos e mensagens)
      const { error } = await supabase
        .from('clientes')
        .delete()
        .eq('id', atendimento.cliente_id);

      if (error) throw error;

      toast({
        title: "Contato excluído",
        description: "O contato e todo seu histórico foram removidos com sucesso.",
      });

      // Fechar modal e limpar seleção
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao excluir contato:', error);
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir o contato. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleGenerateSuggestion = async () => {
    if (!atendimentoId || isGeneratingSuggestion) return;
    
    setIsGeneratingSuggestion(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-chat-suggestion', {
        body: { atendimentoId }
      });

      if (error) {
        console.error('Erro ao gerar sugestão:', error);
        throw error;
      }

      if (data?.suggestion) {
        setMessage(data.suggestion);
        toast({
          title: "Sugestão gerada!",
          description: "A IA gerou uma sugestão de resposta baseada no contexto da conversa.",
        });
      }
    } catch (error) {
      console.error('Erro ao gerar sugestão:', error);
      
      let errorMessage = "Não foi possível gerar uma sugestão. Tente novamente.";
      
      if (error instanceof Error) {
        if (error.message.includes('429')) {
          errorMessage = "Limite de taxa excedido. Aguarde alguns instantes e tente novamente.";
        } else if (error.message.includes('402')) {
          errorMessage = "Créditos insuficientes. Adicione créditos à sua conta Lovable.";
        }
      }
      
      toast({
        title: "Erro ao gerar sugestão",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsGeneratingSuggestion(false);
    }
  };

  const content = embedded ? (
    // Layout para modo embedded (dentro da página do supervisor)
    <div className="flex flex-col h-full min-h-0 animate-fade-in">
      <ImagePreviewDialog
        open={showImagePreview}
        onOpenChange={setShowImagePreview}
        imageUrl={previewImage?.url || ''}
        fileName={previewImage?.file.name || ''}
        onConfirm={handleConfirmImageSend}
        isSending={isSending}
      />

      {loading ? (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Tabs defaultValue="chat" className="flex flex-col flex-1 min-h-0">
          <div className="shrink-0 mx-4 mt-2 flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="chat" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Chat
              </TabsTrigger>
              <TabsTrigger value="media" className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Mídias
              </TabsTrigger>
            </TabsList>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir
            </Button>
          </div>

          <TabsContent value="chat" className="flex-1 min-h-0 mt-2 flex flex-col">
            {/* Área de mensagens - ocupa todo espaço disponível */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <ScrollArea className="h-full px-4 bg-gradient-to-br from-muted/5 via-transparent to-muted/10 relative" ref={scrollRef}>
                <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{
                  backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, currentColor 10px, currentColor 11px)`
                }} />
                <div className="space-y-4 py-4 relative">
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
                      <div key={mensagem.id} className="animate-fade-in">
                        <ChatMessage
                          messageId={mensagem.id}
                          remetenteTipo={mensagem.remetente_tipo}
                          conteudo={mensagem.conteudo}
                          createdAt={mensagem.created_at}
                          attachmentUrl={mensagem.attachment_url}
                          attachmentType={mensagem.attachment_type}
                          attachmentFilename={mensagem.attachment_filename}
                          transcription={mensagem.attachment_type === 'audio' && mensagem.conteudo !== '[Áudio]' && mensagem.conteudo !== '[Audio]' ? mensagem.conteudo : null}
                          clientePushName={mensagem.atendimentos?.clientes?.push_name}
                          clienteProfilePicture={mensagem.atendimentos?.clientes?.profile_picture_url}
                          senderName={mensagem.usuarios?.nome}
                          currentUserId={supervisorInfo?.id}
                          remeteId={mensagem.remetente_id}
                        />
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Área de input - sempre no fundo */}
            {isWindowClosed ? (
              <WhatsAppWindowAlert 
                lastClientMessageAt={lastClientMessageAt}
                hoursSinceLast={hoursSinceLast}
              />
            ) : (
              <div className="shrink-0 border-t border-border/40 bg-gradient-to-br from-background to-muted/20 p-2 shadow-[inset_0_8px_12px_-8px_rgba(0,0,0,0.1)]">
                <div className="flex gap-2 items-end bg-card/60 backdrop-blur-sm p-2 rounded-2xl shadow-lg border border-border/50">
                  <FileUpload 
                    onFileSelected={handleFileSelected}
                    disabled={isSending}
                  />
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Digite sua mensagem..."
                    className="min-h-[32px] max-h-[70px] resize-none flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/60 py-1.5 text-sm"
                    disabled={isSending}
                  />
                  <div className="flex gap-2 items-end relative">
                    <AudioRecorder 
                      onAudioRecorded={handleAudioRecorded}
                      disabled={isSending}
                    />
                    <div className="relative">
                      <Button
                        onClick={handleGenerateSuggestion}
                        disabled={isGeneratingSuggestion || isSending}
                        size="icon"
                        className="absolute -top-8 right-0 h-7 w-7 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 shadow-lg shadow-purple-500/30 transition-all duration-300 hover:scale-105 z-10 disabled:opacity-50 disabled:hover:scale-100"
                        title="Gerar resposta com IA"
                      >
                        {isGeneratingSuggestion ? (
                          <Loader2 className="h-3 w-3 text-white animate-spin" />
                        ) : (
                          <Sparkles className="h-3 w-3 text-white" />
                        )}
                      </Button>
                      <Button
                        onClick={handleSend}
                        disabled={!message.trim() || isSending}
                        size="icon"
                        className="h-9 w-9 rounded-xl bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg shadow-green-500/30 transition-all duration-300 hover:scale-105 shrink-0 disabled:opacity-50 disabled:hover:scale-100"
                      >
                        <Send className="h-3.5 w-3.5 text-white" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="media" className="flex-1 mt-0 overflow-hidden px-4">
            <MediaGallery 
              mensagens={mensagens as any}
              hasMoreMedia={hasMore}
              onLoadMore={handleLoadMore}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  ) : (
    // Layout para modo modal (dialog)
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
        <div className="flex flex-col flex-1 min-h-0">
          <Tabs defaultValue="chat" className="flex flex-col flex-1 min-h-0">
            <div className="mx-4 mt-2 shrink-0 flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="chat" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Chat
                </TabsTrigger>
                <TabsTrigger value="media" className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Mídias
                </TabsTrigger>
              </TabsList>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </Button>
            </div>

            <TabsContent value="chat" className="flex flex-col flex-1 min-h-0 mt-0">
              <ScrollArea className="flex-1 px-4 py-4 bg-gradient-to-br from-muted/5 via-transparent to-muted/10 relative" ref={scrollRef} style={{ maxHeight: '500px' }}>
                <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{
                  backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, currentColor 10px, currentColor 11px)`
                }} />
                <div className="space-y-4 relative">
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
                      <div key={mensagem.id} className="animate-fade-in">
                        <ChatMessage
                          messageId={mensagem.id}
                          remetenteTipo={mensagem.remetente_tipo}
                          conteudo={mensagem.conteudo}
                          createdAt={mensagem.created_at}
                          attachmentUrl={mensagem.attachment_url}
                          attachmentType={mensagem.attachment_type}
                          attachmentFilename={mensagem.attachment_filename}
                          transcription={mensagem.attachment_type === 'audio' && mensagem.conteudo !== '[Áudio]' && mensagem.conteudo !== '[Audio]' ? mensagem.conteudo : null}
                          clientePushName={mensagem.atendimentos?.clientes?.push_name}
                          clienteProfilePicture={mensagem.atendimentos?.clientes?.profile_picture_url}
                          senderName={mensagem.usuarios?.nome}
                          currentUserId={supervisorInfo?.id}
                          remeteId={mensagem.remetente_id}
                        />
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>

              {isWindowClosed ? (
                <WhatsAppWindowAlert 
                  lastClientMessageAt={lastClientMessageAt}
                  hoursSinceLast={hoursSinceLast}
                />
              ) : (
                <div className="border-t border-border/40 bg-gradient-to-br from-background to-muted/20 p-4 shadow-[inset_0_8px_12px_-8px_rgba(0,0,0,0.1)] shrink-0">
                  <div className="flex gap-2 items-end bg-card/60 backdrop-blur-sm p-2 rounded-3xl shadow-lg border border-border/50">
                    <FileUpload 
                      onFileSelected={handleFileSelected}
                      disabled={isSending}
                    />
                    <Textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Digite sua mensagem..."
                      className="min-h-[40px] max-h-[100px] resize-none flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/60 py-2.5"
                      disabled={isSending}
                    />
                    <div className="flex gap-2 items-end relative">
                      <AudioRecorder 
                        onAudioRecorded={handleAudioRecorded}
                        disabled={isSending}
                      />
                      <div className="relative">
                        <Button
                          onClick={handleGenerateSuggestion}
                          disabled={isGeneratingSuggestion || isSending}
                          size="icon"
                          className="absolute -top-10 right-0 h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 shadow-lg shadow-purple-500/30 transition-all duration-300 hover:scale-105 z-10 disabled:opacity-50 disabled:hover:scale-100"
                          title="Gerar resposta com IA"
                        >
                          {isGeneratingSuggestion ? (
                            <Loader2 className="h-3.5 w-3.5 text-white animate-spin" />
                          ) : (
                            <Sparkles className="h-3.5 w-3.5 text-white" />
                          )}
                        </Button>
                        <Button
                          onClick={handleSend}
                          disabled={!message.trim() || isSending}
                          size="icon"
                          className="h-12 w-12 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg shadow-green-500/30 transition-all duration-300 hover:scale-105 shrink-0 disabled:opacity-50 disabled:hover:scale-100"
                        >
                          <Send className="h-4 w-4 text-white" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="media" className="flex-1 mt-0 overflow-hidden">
              <MediaGallery 
                mensagens={mensagens as any}
                hasMoreMedia={hasMore}
                onLoadMore={handleLoadMore}
              />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </>
  );

  if (embedded) {
    return (
      <>
        {content}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir contato</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este contato? Esta ação removerá permanentemente o contato, todos os atendimentos e mensagens associadas. Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteContact}
                disabled={isDeleting}
                className="bg-destructive hover:bg-destructive/90"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  'Excluir'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl h-[80vh] flex flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
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

          <div className="flex flex-col flex-1 min-h-0">
            {content}
          </div>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir contato</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este contato? Esta ação removerá permanentemente o contato, todos os atendimentos e mensagens associadas. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteContact}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                'Excluir'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
