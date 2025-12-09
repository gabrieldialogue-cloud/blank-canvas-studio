import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { AudioRecorder } from "@/components/chat/AudioRecorder";
import { ClientAvatar } from "@/components/ui/client-avatar";
import { WhatsAppWindowAlert } from "@/components/chat/WhatsAppWindowAlert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useRealtimeMessages } from "@/hooks/useRealtimeMessages";
import { useLastMessages } from "@/hooks/useLastMessages";
import { useUnreadCounts } from "@/hooks/useUnreadCounts";
import { useWhatsAppWindow } from "@/hooks/useWhatsAppWindow";
import { useTypingBroadcast } from "@/hooks/useTypingBroadcast";
import { compressImage, shouldCompress } from "@/lib/imageCompression";
import { 
  Phone, MessageSquare, Send, Paperclip, Loader2, Clock, User,
  Check, CheckCheck, Sparkles, X, AlertCircle
} from "lucide-react";
import { format, differenceInHours } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PersonalNumberChatProps {
  vendedorId: string;
  vendedorNome: string;
}

export function PersonalNumberChat({ vendedorId, vendedorNome }: PersonalNumberChatProps) {
  const [evolutionInstance, setEvolutionInstance] = useState<string | null>(null);
  const [evolutionConnected, setEvolutionConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [atendimentos, setAtendimentos] = useState<any[]>([]);
  const [selectedAtendimentoId, setSelectedAtendimentoId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingSuggestion, setIsGeneratingSuggestion] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messageInputRef = useRef<HTMLTextAreaElement | null>(null);

  // Fetch vendedor's Evolution instance
  useEffect(() => {
    const fetchEvolutionInstance = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('config_vendedores')
          .select('evolution_instance_name, evolution_status')
          .eq('usuario_id', vendedorId)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching vendedor config:', error);
        }

        if (data?.evolution_instance_name) {
          setEvolutionInstance(data.evolution_instance_name);
          setEvolutionConnected(data.evolution_status === 'connected' || data.evolution_status === 'open');
          // Fetch atendimentos for this instance
          await fetchAtendimentos(data.evolution_instance_name);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvolutionInstance();
  }, [vendedorId]);

  const fetchAtendimentos = async (instanceName: string) => {
    try {
      const { data, error } = await supabase
        .from('atendimentos')
        .select(`
          id,
          cliente_id,
          marca_veiculo,
          modelo_veiculo,
          status,
          created_at,
          source,
          evolution_instance_name,
          clientes (nome, telefone, push_name, profile_picture_url)
        `)
        .eq('evolution_instance_name', instanceName)
        .eq('source', 'evolution')
        .neq('status', 'encerrado')
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching atendimentos:', error);
        return;
      }

      // Get last message time for each
      const atendimentosWithLastMsg = await Promise.all(
        (data || []).map(async (atendimento) => {
          const { data: lastMsg } = await supabase
            .from('mensagens')
            .select('created_at')
            .eq('atendimento_id', atendimento.id)
            .order('created_at', { ascending: false })
            .limit(1);

          return {
            ...atendimento,
            ultima_mensagem_at: lastMsg?.[0]?.created_at || atendimento.created_at
          };
        })
      );

      // Sort by most recent message
      const sorted = atendimentosWithLastMsg.sort((a, b) =>
        new Date(b.ultima_mensagem_at).getTime() - new Date(a.ultima_mensagem_at).getTime()
      );

      setAtendimentos(sorted);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // Realtime messages
  const {
    messages,
    loading: loadingMessages,
    isClientTyping,
    addOptimisticMessage,
    updateMessage,
    removeOptimisticMessage,
    notifyMessageChange,
    loadMoreMessages,
    hasMoreMessages,
    isLoadingOlder
  } = useRealtimeMessages({
    atendimentoId: selectedAtendimentoId,
    vendedorId,
    enabled: !!selectedAtendimentoId
  });

  // Unread counts
  const { unreadCounts, clearUnreadCount } = useUnreadCounts({
    atendimentos,
    vendedorId,
    enabled: true,
    currentAtendimentoId: selectedAtendimentoId
  });

  // Last messages
  const { lastMessages } = useLastMessages({
    atendimentos,
    enabled: true
  });

  // WhatsApp 24h window
  const { isWindowClosed, lastClientMessageAt, hoursSinceLast } = useWhatsAppWindow({
    messages,
    enabled: !!selectedAtendimentoId,
  });

  // Typing broadcast
  useTypingBroadcast(selectedAtendimentoId, isTyping, 'vendedor');

  // Get selected atendimento data
  const selectedAtendimento = atendimentos.find(a => a.id === selectedAtendimentoId);
  const clienteTelefone = selectedAtendimento?.clientes?.telefone;

  // Filter atendimentos by search
  const filteredAtendimentos = atendimentos.filter(a => {
    if (!searchTerm) return true;
    const nome = a.clientes?.push_name || a.clientes?.nome || '';
    const telefone = a.clientes?.telefone || '';
    const marca = a.marca_veiculo || '';
    return (
      nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      telefone.includes(searchTerm) ||
      marca.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // Handle message input change
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageInput(e.target.value);
    setIsTyping(e.target.value.length > 0);
  };

  // Handle keypress
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Send message
  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedAtendimentoId || isSending) return;

    const trimmedMessage = messageInput.trim();
    if (trimmedMessage.length > 1000) {
      toast.error("Mensagem muito longa. Máximo de 1000 caracteres.");
      return;
    }

    setIsSending(true);
    setIsTyping(false);
    const messageCopy = trimmedMessage;
    setMessageInput("");

    const formattedMessage = `*${vendedorNome}:*\n${messageCopy}`;

    const optimisticMessage = {
      id: `temp-${Date.now()}`,
      atendimento_id: selectedAtendimentoId,
      remetente_id: vendedorId,
      remetente_tipo: 'vendedor',
      conteudo: messageCopy,
      created_at: new Date().toISOString(),
      attachment_url: null,
      attachment_type: null,
      attachment_filename: null,
      read_at: null,
      read_by_id: null,
      whatsapp_message_id: null,
      delivered_at: null,
      source: 'evolution',
      status: "enviando" as const
    };

    try {
      addOptimisticMessage(optimisticMessage);

      // Save to database
      const { data: dbData, error: dbError } = await supabase
        .from('mensagens')
        .insert({
          atendimento_id: selectedAtendimentoId,
          remetente_id: vendedorId,
          remetente_tipo: 'vendedor',
          conteudo: messageCopy,
          source: 'evolution'
        })
        .select()
        .single();

      if (dbError) throw dbError;

      updateMessage(optimisticMessage.id, { ...dbData, status: "enviada" as const });
      await notifyMessageChange(dbData.id);

      // Send via Evolution API
      if (clienteTelefone && evolutionInstance) {
        const { data: session } = await supabase.auth.getSession();
        if (session?.session) {
          fetch(`https://ptwrrcqttnvcvlnxsvut.supabase.co/functions/v1/whatsapp-send`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.session.access_token}`
            },
            body: JSON.stringify({
              to: clienteTelefone,
              message: formattedMessage,
              source: 'evolution',
              evolutionInstanceName: evolutionInstance
            })
          }).then(async (res) => {
            const data = await res.json();
            if (data?.messageId) {
              await supabase
                .from('mensagens')
                .update({ whatsapp_message_id: data.messageId })
                .eq('id', dbData.id);
            }
          }).catch(err => console.error('WhatsApp send error:', err));
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      removeOptimisticMessage(optimisticMessage.id);
      setMessageInput(messageCopy);
      toast.error("Erro ao enviar mensagem");
    } finally {
      setIsSending(false);
    }
  };

  // Handle file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedAtendimentoId) return;

    setIsUploading(true);
    try {
      let fileToUpload: File | Blob = file;
      let contentType = file.type;
      let finalFileName = file.name;

      // Compress images
      if (file.type.startsWith('image/') && shouldCompress(file)) {
        toast.info("Comprimindo imagem...");
        fileToUpload = await compressImage(file);
        contentType = 'image/jpeg';
        const nameParts = file.name.split('.');
        nameParts[nameParts.length - 1] = 'jpg';
        finalFileName = nameParts.join('.');
      }

      const timestamp = Date.now();
      const fileName = `${timestamp}-${finalFileName}`;
      const filePath = `${selectedAtendimentoId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-files')
        .upload(filePath, fileToUpload, { contentType });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-files')
        .getPublicUrl(filePath);

      const isImage = file.type.startsWith('image/');
      const mediaType = isImage ? 'image' : 'document';

      // Save message
      const { data: msgData, error: msgError } = await supabase
        .from('mensagens')
        .insert({
          atendimento_id: selectedAtendimentoId,
          conteudo: isImage ? '[Imagem]' : `[Documento: ${finalFileName}]`,
          remetente_tipo: 'vendedor',
          remetente_id: vendedorId,
          attachment_url: publicUrl,
          attachment_type: mediaType,
          attachment_filename: finalFileName,
          source: 'evolution'
        })
        .select()
        .single();

      if (msgError) throw msgError;

      // Send via Evolution
      if (clienteTelefone && evolutionInstance) {
        const { data: session } = await supabase.auth.getSession();
        if (session?.session) {
          await fetch(`https://ptwrrcqttnvcvlnxsvut.supabase.co/functions/v1/whatsapp-send`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.session.access_token}`
            },
            body: JSON.stringify({
              to: clienteTelefone,
              mediaType,
              mediaUrl: publicUrl,
              filename: finalFileName,
              source: 'evolution',
              evolutionInstanceName: evolutionInstance
            })
          });
        }
      }

      toast.success(`${isImage ? 'Imagem' : 'Documento'} enviado!`);
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error("Erro ao enviar arquivo");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle audio recorded
  const handleAudioRecorded = async (audioBlob: Blob) => {
    if (!selectedAtendimentoId) return;

    try {
      const fileName = `${Date.now()}-audio.ogg`;
      const filePath = `${selectedAtendimentoId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-audios')
        .upload(filePath, audioBlob, { contentType: 'audio/ogg' });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-audios')
        .getPublicUrl(filePath);

      // Save message
      const { data: msgData, error: msgError } = await supabase
        .from('mensagens')
        .insert({
          atendimento_id: selectedAtendimentoId,
          conteudo: '[Áudio]',
          remetente_tipo: 'vendedor',
          remetente_id: vendedorId,
          attachment_url: publicUrl,
          attachment_type: 'audio',
          attachment_filename: fileName,
          source: 'evolution'
        })
        .select()
        .single();

      if (msgError) throw msgError;

      // Send via Evolution
      if (clienteTelefone && evolutionInstance) {
        const { data: session } = await supabase.auth.getSession();
        if (session?.session) {
          await fetch(`https://ptwrrcqttnvcvlnxsvut.supabase.co/functions/v1/whatsapp-send`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.session.access_token}`
            },
            body: JSON.stringify({
              to: clienteTelefone,
              audioUrl: publicUrl,
              source: 'evolution',
              evolutionInstanceName: evolutionInstance
            })
          });
        }
      }

      toast.success("Áudio enviado!");
    } catch (error) {
      console.error('Error sending audio:', error);
      toast.error("Erro ao enviar áudio");
      throw error;
    }
  };

  // Select atendimento
  const handleSelectAtendimento = (atendimentoId: string) => {
    setSelectedAtendimentoId(atendimentoId);
    clearUnreadCount(atendimentoId);
  };

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0 && !isLoadingOlder) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoadingOlder]);

  // Generate AI suggestion
  const handleGenerateSuggestion = async () => {
    if (messages.length === 0) return;

    setIsGeneratingSuggestion(true);
    try {
      const recentMessages = messages.slice(-10).map(m => ({
        role: m.remetente_tipo === 'cliente' ? 'cliente' : 'vendedor',
        content: m.conteudo
      }));

      const { data, error } = await supabase.functions.invoke('generate-response-suggestion', {
        body: {
          messages: recentMessages,
          clienteNome: selectedAtendimento?.clientes?.push_name || selectedAtendimento?.clientes?.nome || 'Cliente',
          vendedorNome
        }
      });

      if (error) throw error;
      if (data?.suggestion) {
        setMessageInput(data.suggestion);
        messageInputRef.current?.focus();
        toast.success("Sugestão gerada!");
      }
    } catch (error) {
      console.error('Error generating suggestion:', error);
      toast.error("Erro ao gerar sugestão");
    } finally {
      setIsGeneratingSuggestion(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <Card className="rounded-2xl border-accent/30 bg-gradient-to-br from-accent/5 to-transparent shadow-lg">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </CardContent>
      </Card>
    );
  }

  // No Evolution instance configured
  if (!evolutionInstance) {
    return (
      <Card className="rounded-2xl border-accent/30 bg-gradient-to-br from-accent/5 to-transparent shadow-lg">
        <CardHeader className="border-b border-accent/10">
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-accent" />
            Número Pessoal
          </CardTitle>
          <CardDescription>
            Configure para receber atendimentos diretos
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="rounded-xl border-2 border-dashed border-accent/30 bg-accent/5 p-8 text-center">
            <Phone className="mx-auto h-12 w-12 text-accent/40 mb-3" />
            <p className="text-base font-medium text-foreground mb-2">
              Configure seu Número Pessoal
            </p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Solicite ao administrador para conectar seu WhatsApp pessoal através do painel de{" "}
              <span className="font-semibold text-accent">Super Admin</span>.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Not connected
  if (!evolutionConnected) {
    return (
      <Card className="rounded-2xl border-yellow-500/30 bg-gradient-to-br from-yellow-500/5 to-transparent shadow-lg">
        <CardHeader className="border-b border-yellow-500/10">
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            WhatsApp Desconectado
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="rounded-xl border-2 border-dashed border-yellow-500/30 bg-yellow-500/5 p-8 text-center">
            <Phone className="mx-auto h-12 w-12 text-yellow-500/40 mb-3" />
            <p className="text-base font-medium text-foreground mb-2">
              Seu WhatsApp pessoal está desconectado
            </p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Solicite ao administrador para reconectar sua instância no painel de Super Admin.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Métricas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-2xl border-accent bg-gradient-to-br from-accent/10 to-transparent">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-accent">
              <MessageSquare className="h-4 w-4" />
              Conversas Ativas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-accent">{atendimentos.length}</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-success bg-gradient-to-br from-success/10 to-transparent">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-success">
              <Check className="h-4 w-4" />
              Instância
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium truncate">{evolutionInstance}</p>
            <Badge variant="outline" className="mt-1 bg-success/10 text-success border-success/30">
              Conectado
            </Badge>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-primary bg-gradient-to-br from-primary/10 to-transparent">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-primary">
              <Clock className="h-4 w-4" />
              Não Lidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">
              {Object.values(unreadCounts).reduce((a, b) => a + b, 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chat Interface */}
      <Card className="rounded-2xl border-accent/30 shadow-lg overflow-hidden">
        {atendimentos.length === 0 ? (
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">Nenhuma conversa ativa no número pessoal</p>
          </CardContent>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 h-[600px]">
            {/* Conversations List */}
            <div className="border-r border-border bg-card/50">
              <div className="p-3 border-b border-border">
                <input
                  type="text"
                  placeholder="Buscar conversa..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <ScrollArea className="h-[calc(600px-57px)]">
                {filteredAtendimentos.map((atendimento) => {
                  const isSelected = selectedAtendimentoId === atendimento.id;
                  const unread = unreadCounts[atendimento.id] || 0;
                  const lastMsg = lastMessages[atendimento.id];

                  return (
                    <div
                      key={atendimento.id}
                      onClick={() => handleSelectAtendimento(atendimento.id)}
                      className={`p-3 cursor-pointer border-b border-border/50 transition-colors ${
                        isSelected ? 'bg-accent/10' : 'hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <ClientAvatar
                          imageUrl={atendimento.clientes?.profile_picture_url}
                          name={atendimento.clientes?.push_name || atendimento.clientes?.nome}
                          className="h-10 w-10"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm truncate">
                              {atendimento.clientes?.push_name || atendimento.clientes?.nome || 'Cliente'}
                            </span>
                            {unread > 0 && (
                              <Badge className="bg-accent text-white text-xs px-1.5">
                                {unread}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {lastMsg?.conteudo || atendimento.marca_veiculo}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </ScrollArea>
            </div>

            {/* Chat Area */}
            <div className="col-span-2 flex flex-col">
              {!selectedAtendimentoId ? (
                <div className="flex-1 flex items-center justify-center bg-muted/20">
                  <div className="text-center">
                    <MessageSquare className="h-16 w-16 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground">Selecione uma conversa</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Chat Header */}
                  <div className="p-3 border-b border-border bg-card flex items-center gap-3">
                    <ClientAvatar
                      imageUrl={selectedAtendimento?.clientes?.profile_picture_url}
                      name={selectedAtendimento?.clientes?.push_name || selectedAtendimento?.clientes?.nome}
                      className="h-10 w-10"
                    />
                    <div>
                      <p className="font-medium text-sm">
                        {selectedAtendimento?.clientes?.push_name || selectedAtendimento?.clientes?.nome}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {selectedAtendimento?.clientes?.telefone}
                      </p>
                    </div>
                    {isClientTyping && (
                      <Badge variant="outline" className="ml-auto text-xs">
                        digitando...
                      </Badge>
                    )}
                  </div>

                  {/* Messages */}
                  <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                    {hasMoreMessages && (
                      <div className="flex justify-center mb-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={loadMoreMessages}
                          disabled={isLoadingOlder}
                        >
                          {isLoadingOlder ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Carregar anteriores"
                          )}
                        </Button>
                      </div>
                    )}
                    <div className="space-y-3">
                      {messages.map((msg) => (
                        <ChatMessage
                          key={msg.id}
                          messageId={msg.id}
                          remetenteTipo={msg.remetente_tipo as "cliente" | "ia" | "supervisor" | "vendedor"}
                          conteudo={msg.conteudo}
                          createdAt={msg.created_at}
                          attachmentUrl={msg.attachment_url}
                          attachmentType={msg.attachment_type}
                          attachmentFilename={msg.attachment_filename}
                        />
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>

                  {/* Input */}
                  {isWindowClosed ? (
                    <WhatsAppWindowAlert
                      lastClientMessageAt={lastClientMessageAt}
                      hoursSinceLast={hoursSinceLast}
                    />
                  ) : (
                    <div className="p-3 border-t border-border bg-card">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                      />
                      <div className="flex gap-2 items-end bg-muted/30 p-2 rounded-xl">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading || isSending}
                          className="h-9 w-9"
                        >
                          <Paperclip className="h-4 w-4" />
                        </Button>
                        <Textarea
                          ref={messageInputRef}
                          value={messageInput}
                          onChange={handleInputChange}
                          onKeyPress={handleKeyPress}
                          placeholder="Digite sua mensagem..."
                          className="min-h-[36px] max-h-[100px] resize-none flex-1 border-0 bg-transparent focus-visible:ring-0"
                          disabled={isSending || isUploading}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleGenerateSuggestion}
                          disabled={isGeneratingSuggestion || messages.length === 0}
                          className="h-9 w-9"
                          title="Gerar sugestão com IA"
                        >
                          {isGeneratingSuggestion ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Sparkles className="h-4 w-4 text-purple-500" />
                          )}
                        </Button>
                        <Button
                          onClick={handleSendMessage}
                          disabled={!messageInput.trim() || isSending || isUploading}
                          size="icon"
                          className="h-9 w-9 bg-gradient-to-br from-green-500 to-green-600"
                        >
                          {isSending || isUploading ? (
                            <Loader2 className="h-4 w-4 animate-spin text-white" />
                          ) : (
                            <Send className="h-4 w-4 text-white" />
                          )}
                        </Button>
                        <AudioRecorder
                          onAudioRecorded={handleAudioRecorded}
                          disabled={isSending || isUploading}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}