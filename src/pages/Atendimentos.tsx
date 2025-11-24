import { useState, useEffect, useRef } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, User, Bot, Phone, FileText, CheckCircle2, RefreshCw, Shield, Package, ChevronDown, ChevronUp, Loader2, TrendingUp, Clock, BarChart3, AlertCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAtendimentos } from "@/hooks/useAtendimentos";
import { AtendimentoCard } from "@/components/atendimento/AtendimentoCard";
import { UnifiedSearch } from "@/components/atendimento/UnifiedSearch";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { format, differenceInHours } from "date-fns";
import { ptBR } from "date-fns/locale";
import { VendedorChatModal } from "@/components/supervisor/VendedorChatModal";
import { HistoricoAtendimentos } from "@/components/supervisor/HistoricoAtendimentos";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { MediaGallery } from "@/components/chat/MediaGallery";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, Paperclip, X, Image as ImageIcon, File, Images, Check, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { compressImage, shouldCompress } from "@/lib/imageCompression";
import { useTypingBroadcast } from "@/hooks/useTypingBroadcast";
import { useRealtimeMessages } from "@/hooks/useRealtimeMessages";
import { useUnreadCounts } from "@/hooks/useUnreadCounts";
import { useLastMessages } from "@/hooks/useLastMessages";
import { useClientPresence } from "@/hooks/useClientPresence";

type DetailType = 
  | "ia_respondendo"
  | "orcamentos" 
  | "fechamento"
  | "pessoal_ativas"
  | "pessoal_respondidas"
  | "pessoal_aguardando"
  | "reembolso"
  | "garantia"
  | "troca"
  | "resolvidos";

export default function Atendimentos() {
  const [expandedDetails, setExpandedDetails] = useState<Set<DetailType>>(new Set(["ia_respondendo"]));
  const { atendimentos, loading, getAtendimentosByStatus } = useAtendimentos();
  const [isSupervisor, setIsSupervisor] = useState(false);
  const [vendedoresAtribuidos, setVendedoresAtribuidos] = useState<string[]>([]);
  const [metricas, setMetricas] = useState<any[]>([]);
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [selectedVendedorId, setSelectedVendedorId] = useState<string | null>(null);
  const [chatMensagens, setChatMensagens] = useState<any[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  
  // Estados para chat em tempo real (vendedor)
  const [vendedorId, setVendedorId] = useState<string | null>(null);
  const [vendedorNome, setVendedorNome] = useState<string>("");
  const [atendimentosVendedor, setAtendimentosVendedor] = useState<any[]>([]);
  const [selectedAtendimentoIdVendedor, setSelectedAtendimentoIdVendedor] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isTypingVendedor, setIsTypingVendedor] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [searchMessages, setSearchMessages] = useState("");
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [scrollActiveConversas, setScrollActiveConversas] = useState(false);
  const [scrollActiveChat, setScrollActiveChat] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [suppressAutoScroll, setSuppressAutoScroll] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messageInputRef = useRef<HTMLTextAreaElement | null>(null);
  const prevSelectedAtendimentoId = useRef<string | null>(null);
  const lastMessageIdRef = useRef<string | null>(null);

  // Atualiza "agora" a cada minuto para recalcular o "visto por último"
  useEffect(() => {
    const intervalId = setInterval(() => {
      setNow(Date.now());
    }, 60_000);

    return () => clearInterval(intervalId);
  }, []);

  // Novo hook de mensagens em tempo real
  const { 
    messages: mensagensVendedor,
    loading: loadingMessages,
    isClientTyping,
    isLoadingOlder,
    notifyMessageChange,
    addOptimisticMessage,
    updateMessage,
    removeOptimisticMessage,
    loadMoreMessages,
    hasMoreMessages,
    markMessagesAsRead
  } = useRealtimeMessages({
    atendimentoId: selectedAtendimentoIdVendedor,
    vendedorId,
    enabled: !isSupervisor
  });

  // Hook para contar mensagens não lidas (excluindo o atendimento atual)
  const { unreadCounts: unreadCountsVendedor, clearUnreadCount } = useUnreadCounts({
    atendimentos: atendimentosVendedor,
    vendedorId,
    enabled: !isSupervisor,
    currentAtendimentoId: selectedAtendimentoIdVendedor
  });

  // Hook para últimas mensagens
  const { lastMessages } = useLastMessages({
    atendimentos: atendimentosVendedor,
    enabled: !isSupervisor
  });

  // Hook para presença dos clientes (online e digitando)
  const { clientPresence } = useClientPresence({
    atendimentos: atendimentosVendedor,
    enabled: !isSupervisor
  });


  useEffect(() => {
    checkSupervisorRole();
    fetchVendedorId();
  }, []);

  const checkSupervisorRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);
    
    if (roles && roles.some(r => r.role === 'supervisor')) {
      setIsSupervisor(true);
      await fetchSupervisorData();
    }
  };

  const fetchSupervisorData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: usuarioData } = await supabase
      .from('usuarios')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!usuarioData) return;

    const { data: assignments } = await supabase
      .from('vendedor_supervisor')
      .select('vendedor_id')
      .eq('supervisor_id', usuarioData.id);

    const vendedorIds = assignments?.map(a => a.vendedor_id) || [];
    setVendedoresAtribuidos(vendedorIds);
    
    // Fetch vendedores details
    const { data: vendedoresData } = await supabase
      .from('usuarios')
      .select(`
        id,
        nome,
        email,
        config_vendedores (especialidade_marca)
      `)
      .in('id', vendedorIds);
    
    if (vendedoresData) {
      setVendedores(vendedoresData.map((v: any) => ({
        id: v.id,
        nome: v.nome,
        email: v.email,
        especialidade: v.config_vendedores?.[0]?.especialidade_marca || 'Sem especialidade'
      })));
    }
    
    calcularMetricasSupervisor(vendedorIds);
    fetchUnreadCounts(vendedorIds);
  };

  const fetchUnreadCounts = async (vendedorIds: string[]) => {
    const counts: Record<string, number> = {};
    
    for (const vendedorId of vendedorIds) {
      const { data: atendimentos } = await supabase
        .from('atendimentos')
        .select('id')
        .eq('vendedor_fixo_id', vendedorId)
        .neq('status', 'encerrado');
      
      if (atendimentos) {
        let totalUnread = 0;
        for (const atendimento of atendimentos) {
          const { count } = await supabase
            .from('mensagens')
            .select('*', { count: 'exact', head: true })
            .eq('atendimento_id', atendimento.id)
            .neq('remetente_tipo', 'supervisor')
            .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
          
          totalUnread += count || 0;
        }
        counts[vendedorId] = totalUnread;
      }
    }
    
    setUnreadCounts(counts);
  };

  const calcularMetricasSupervisor = (vendedorIds: string[]) => {
    const metrics = vendedorIds.map(vendedorId => {
      const atendimentosVendedor = atendimentos.filter(
        a => a.vendedor_fixo_id === vendedorId
      );
      
      const totalAtendimentos = atendimentosVendedor.length;
      const atendimentosEncerrados = atendimentosVendedor.filter(
        a => a.status === 'encerrado'
      ).length;
      const atendimentosAtivos = totalAtendimentos - atendimentosEncerrados;
      const taxaConversao = totalAtendimentos > 0 
        ? (atendimentosEncerrados / totalAtendimentos) * 100 
        : 0;

      return {
        vendedorId,
        totalAtendimentos,
        atendimentosAtivos,
        atendimentosEncerrados,
        taxaConversao,
      };
    });

    setMetricas(metrics);
  };

  useEffect(() => {
    if (isSupervisor && atendimentos.length > 0 && vendedoresAtribuidos.length > 0) {
      calcularMetricasSupervisor(vendedoresAtribuidos);
      fetchUnreadCounts(vendedoresAtribuidos);
    }
  }, [atendimentos, vendedoresAtribuidos, isSupervisor]);

  // Realtime updates for unread counts (supervisor) - otimizado
  useEffect(() => {
    if (isSupervisor && vendedoresAtribuidos.length > 0) {
      const channel = supabase
        .channel('mensagens-unread-supervisor', {
          config: {
            broadcast: { self: false }
          }
        })
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'mensagens'
          },
          () => {
            fetchUnreadCounts(vendedoresAtribuidos);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'mensagens'
          },
          () => {
            fetchUnreadCounts(vendedoresAtribuidos);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isSupervisor, vendedoresAtribuidos]);

  // Realtime updates for atendimentos list (vendedor) - otimizado
  useEffect(() => {
    if (vendedorId && !isSupervisor) {
      const channel = supabase
        .channel('atendimentos-realtime-vendedor', {
          config: {
            broadcast: { self: false }
          }
        })
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'atendimentos',
            filter: `vendedor_fixo_id=eq.${vendedorId}`
          },
          () => {
            // Refresh the list when any atendimento changes
            fetchAtendimentosVendedor();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'mensagens'
          },
          async (payload) => {
            // Check if the message belongs to one of the vendedor's atendimentos
            const { data: atendimento } = await supabase
              .from('atendimentos')
              .select('vendedor_fixo_id')
              .eq('id', payload.new.atendimento_id)
              .single();
            
            if (atendimento?.vendedor_fixo_id === vendedorId) {
              // Refresh the list to reorder by most recent message
              fetchAtendimentosVendedor();
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [vendedorId, isSupervisor]);

  const iaRespondendo = getAtendimentosByStatus('ia_respondendo');
  const aguardandoOrcamento = getAtendimentosByStatus('aguardando_orcamento');
  const aguardandoFechamento = getAtendimentosByStatus('aguardando_fechamento');
  
  const atendimentosNaoAtribuidos = atendimentos.filter(
    (a: any) => !a.vendedor_fixo_id
  );

  const toggleDetail = (type: DetailType) => {
    setExpandedDetails(prev => {
      const newSet = new Set(prev);
      if (newSet.has(type)) {
        newSet.delete(type);
      } else {
        newSet.add(type);
      }
      return newSet;
    });
  };

  const getDetailTitle = (type: DetailType | null) => {
    if (!type) return "";
    const titles: Record<DetailType, string> = {
      ia_respondendo: "IA Respondendo",
      orcamentos: "Orçamentos Pendentes",
      fechamento: "Aguardando Fechamento",
      pessoal_ativas: "Conversas Ativas - Número Pessoal",
      pessoal_respondidas: "Conversas Respondidas",
      pessoal_aguardando: "Aguardando Resposta",
      reembolso: "Solicitações de Reembolso",
      garantia: "Solicitações de Garantia",
      troca: "Solicitações de Troca",
      resolvidos: "Casos Resolvidos"
    };
    return titles[type];
  };

  const getDetailDescription = (type: DetailType | null) => {
    if (!type) return "";
    const descriptions: Record<DetailType, string> = {
      ia_respondendo: "Visualize as conversas sendo atendidas automaticamente pela IA",
      orcamentos: "Lista de orçamentos solicitados pelos clientes aguardando envio",
      fechamento: "Negociações em fase final aguardando confirmação",
      pessoal_ativas: "Conversas diretas com clientes no seu número pessoal",
      pessoal_respondidas: "Histórico de conversas que você já respondeu",
      pessoal_aguardando: "Clientes aguardando sua resposta no número pessoal",
      reembolso: "Solicitações de devolução de valores dos clientes",
      garantia: "Acionamentos de garantia de produtos",
      troca: "Solicitações de troca de produtos",
      resolvidos: "Casos especiais que foram resolvidos com sucesso"
    };
    return descriptions[type];
  };

  const fetchVendedorMessages = async (vendedorId: string) => {
    const { data } = await supabase
      .from("atendimentos")
      .select(`
        *,
        clientes (nome, telefone),
        mensagens (id, conteudo, created_at, remetente_tipo)
      `)
      .eq('vendedor_fixo_id', vendedorId)
      .order("created_at", { ascending: false });
    
    if (data) {
      setChatMensagens(data);
    }
  };

  const selectedVendedor = vendedores.find(v => v.id === selectedVendedorId);

  // Fetch vendedor ID (para view de vendedor)
  const fetchVendedorId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: usuarioData } = await supabase
      .from('usuarios')
      .select('id, nome')
      .eq('user_id', user.id)
      .single();

    if (usuarioData) {
      setVendedorId(usuarioData.id);
      setVendedorNome(usuarioData.nome);
    }
  };

  // Fetch atendimentos do vendedor
  useEffect(() => {
    if (vendedorId && !isSupervisor) {
      fetchAtendimentosVendedor();
    }
  }, [vendedorId, isSupervisor]);

  const fetchAtendimentosVendedor = async () => {
    if (!vendedorId) return;

    const { data } = await supabase
      .from("atendimentos")
      .select(`
        id,
        marca_veiculo,
        modelo_veiculo,
        status,
        created_at,
        clientes (nome, telefone, push_name, profile_picture_url)
      `)
      .eq('vendedor_fixo_id', vendedorId)
      .neq('status', 'encerrado');
    
    if (data && data.length > 0) {
      // Fetch last message for each atendimento to sort by most recent
      const atendimentosComUltimaMensagem = await Promise.all(
        data.map(async (atendimento) => {
          const { data: ultimaMensagem } = await supabase
            .from('mensagens')
            .select('created_at')
            .eq('atendimento_id', atendimento.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          
          return {
            ...atendimento,
            ultima_mensagem_at: ultimaMensagem?.created_at || atendimento.created_at
          };
        })
      );

      // Sort by most recent message
      const sorted = atendimentosComUltimaMensagem.sort((a, b) => 
        new Date(b.ultima_mensagem_at).getTime() - new Date(a.ultima_mensagem_at).getTime()
      );

      setAtendimentosVendedor(sorted);
    }
  };

  // Use typing broadcast hook
  useTypingBroadcast(
    selectedAtendimentoIdVendedor, 
    isTypingVendedor && !isSupervisor, 
    'vendedor'
  );

  // Scroll to bottom function usando a ref no final das mensagens
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Auto scroll to bottom quando um novo atendimento é selecionado (não ao carregar mais mensagens)
  useEffect(() => {
    if (
      !isSupervisor &&
      selectedAtendimentoIdVendedor &&
      mensagensVendedor.length > 0 &&
      prevSelectedAtendimentoId.current !== selectedAtendimentoIdVendedor &&
      !suppressAutoScroll
    ) {
      prevSelectedAtendimentoId.current = selectedAtendimentoIdVendedor;
      // Usar múltiplos requestAnimationFrame para garantir que o DOM está atualizado
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
          });
        });
      });
    }
  }, [selectedAtendimentoIdVendedor, mensagensVendedor.length, isSupervisor, suppressAutoScroll]);

  // Also scroll when new message arrives (exceto ao carregar mensagens antigas ou quando suprimido)
  useEffect(() => {
    if (!isSupervisor && mensagensVendedor.length > 0 && !isLoadingOlder && !suppressAutoScroll) {
      const lastMessage = mensagensVendedor[mensagensVendedor.length - 1];

      // Só considerar como nova mensagem se o ID mudou
      if (!lastMessage || lastMessage.id === lastMessageIdRef.current) return;
      lastMessageIdRef.current = lastMessage.id;

      // Scroll suave apenas para mensagens novas que não são do vendedor
      if (lastMessage.remetente_tipo !== 'vendedor') {
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    }
  }, [mensagensVendedor, isSupervisor, isLoadingOlder, suppressAutoScroll]);

  // Handler para carregar mensagens antigas preservando a posição do scroll
  const handleLoadOlderMessages = async () => {
    setSuppressAutoScroll(true);

    const viewport = scrollRef.current?.querySelector(
      '[data-radix-scroll-area-viewport]'
    ) as HTMLDivElement | null;

    const prevScrollHeight = viewport?.scrollHeight ?? 0;
    const prevScrollTop = viewport?.scrollTop ?? 0;

    await loadMoreMessages();

    requestAnimationFrame(() => {
      const newScrollHeight = viewport?.scrollHeight ?? 0;
      if (viewport) {
        const deltaHeight = newScrollHeight - prevScrollHeight;
        // Mantém o usuário na mesma mensagem após inserir itens no topo
        viewport.scrollTop = prevScrollTop + deltaHeight;
      }
      // Libera o auto-scroll após o ajuste
      setTimeout(() => setSuppressAutoScroll(false), 100);
    });
  };

  // Send message function - Optimized for low latency
  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedAtendimentoIdVendedor || !vendedorId || isSending) {
      return;
    }

    const trimmedMessage = messageInput.trim();
    
    // Validate message length
    if (trimmedMessage.length > 1000) {
      toast.error("Mensagem muito longa. Máximo de 1000 caracteres.");
      return;
    }

    setIsSending(true);
    setIsTypingVendedor(false);

    // Clear input immediately for better UX
    const messageCopy = trimmedMessage;
    setMessageInput("");

    // Get session and atendimento data in parallel
    const atendimento = atendimentosVendedor.find(a => a.id === selectedAtendimentoIdVendedor);
    const clienteTelefone = atendimento?.clientes?.telefone;
    const remetenteName = isSupervisor ? "Supervisor" : vendedorNome;
    const formattedMessage = `*${remetenteName}:*\n${messageCopy}`;

    // Optimistic UI update - define before try so accessible in catch
    const optimisticMessage = {
      id: `temp-${Date.now()}`,
      atendimento_id: selectedAtendimentoIdVendedor,
      remetente_id: vendedorId,
      remetente_tipo: isSupervisor ? 'supervisor' : 'vendedor',
      conteudo: messageCopy,
      created_at: new Date().toISOString(),
      attachment_url: null,
      attachment_type: null,
      attachment_filename: null,
      read_at: null,
      read_by_id: null,
      whatsapp_message_id: null,
      delivered_at: null,
      status: "enviando" as const
    };

    try {
      // Add to local state immediately
      addOptimisticMessage(optimisticMessage);

      // Execute both operations in parallel for maximum speed
      const [dbResult, sessionResult] = await Promise.all([
        // Save to database
        supabase
          .from('mensagens')
          .insert({
            atendimento_id: selectedAtendimentoIdVendedor,
            remetente_id: vendedorId,
            remetente_tipo: isSupervisor ? 'supervisor' : 'vendedor',
            conteudo: messageCopy
          })
          .select()
          .single(),
        // Get session for WhatsApp
        supabase.auth.getSession()
      ]);

      if (dbResult.error) throw dbResult.error;

      // Replace optimistic message with real one
      updateMessage(optimisticMessage.id, { 
        ...dbResult.data, 
        status: "enviada" as const 
      });

      // Notificar outras abas/usuários sobre nova mensagem
      await notifyMessageChange(dbResult.data.id);

      // Send WhatsApp in background (non-blocking) and store WhatsApp message id
      if (clienteTelefone && sessionResult.data.session) {
        fetch(`https://ptwrrcqttnvcvlnxsvut.supabase.co/functions/v1/whatsapp-send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionResult.data.session.access_token}`
          },
          body: JSON.stringify({
            to: clienteTelefone,
            message: formattedMessage
          })
        })
          .then(async (res) => {
            try {
              const data = await res.json();
              const messageId = data?.messageId;
              if (messageId) {
                await supabase
                  .from('mensagens')
                  .update({ whatsapp_message_id: messageId })
                  .eq('id', dbResult.data.id);
                console.log('Stored WhatsApp message id for mensagem', dbResult.data.id, messageId);
              }
            } catch (err) {
              console.error('Error parsing WhatsApp send response:', err);
            }
          })
          .catch(err => {
            console.error('WhatsApp send error:', err);
          });
      }
      
      // Scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
      }, 100);
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      // Remove optimistic message on error
      removeOptimisticMessage(optimisticMessage.id);
      toast.error("Erro ao enviar mensagem. Tente novamente.");
    } finally {
      setIsSending(false);
      // Manter foco no input para permitir envio de múltiplas mensagens
      setTimeout(() => {
        messageInputRef.current?.focus();
      }, 50);
    }
  };

  // Handle input change with typing indicator
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessageInput(value);
    
    // Set typing indicator
    if (value.trim() && !isTypingVendedor) {
      setIsTypingVendedor(true);
    } else if (!value.trim() && isTypingVendedor) {
      setIsTypingVendedor(false);
    }
  };

  // Handle key press (Enter to send)
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handle file selection with compression
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (20MB)
    if (file.size > 20971520) {
      toast.error("Arquivo muito grande. Máximo de 20MB.");
      return;
    }

    // Extended list of allowed file types
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'application/pdf',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/zip', 'application/x-zip-compressed', 'application/x-rar-compressed',
      'text/plain', 'text/csv'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      toast.error("Tipo de arquivo não suportado.");
      return;
    }

    // Compress image if needed
    if (shouldCompress(file)) {
      try {
        toast.info("Comprimindo imagem...");
        const compressedBlob = await compressImage(file);
        // Create a new File object from the blob
        const compressedFile = Object.assign(compressedBlob, {
          name: file.name.replace(/\.[^.]+$/, '.jpg'),
          lastModified: Date.now(),
        }) as File;
        setSelectedFile(compressedFile);
        toast.success("Imagem comprimida com sucesso!");
      } catch (error) {
        console.error('Error compressing image:', error);
        toast.error("Erro ao comprimir imagem. Usando original.");
        setSelectedFile(file);
      }
    } else {
      setSelectedFile(file);
    }
  };

  // Upload file and send message
  const handleSendWithFile = async () => {
    if (!selectedFile || !selectedAtendimentoIdVendedor || !vendedorId) return;

    setIsUploading(true);
    setIsTypingVendedor(false);

    try {
      // Upload file to storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${selectedAtendimentoIdVendedor}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('chat-files')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('chat-files')
        .getPublicUrl(fileName);

      // Determine attachment type
      const attachmentType = selectedFile.type.startsWith('image/') ? 'image' : 'document';

      // Save message with attachment
      const { error: messageError } = await supabase
        .from('mensagens')
        .insert({
          atendimento_id: selectedAtendimentoIdVendedor,
          remetente_id: vendedorId,
          remetente_tipo: 'vendedor',
          conteudo: messageInput.trim() || '',
          attachment_url: publicUrl,
          attachment_type: attachmentType
        });

      if (messageError) throw messageError;

      setMessageInput("");
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      
      toast.success("Arquivo enviado com sucesso!");

      // Scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error) {
      console.error('Erro ao enviar arquivo:', error);
      toast.error("Erro ao enviar arquivo. Tente novamente.");
    } finally {
      setIsUploading(false);
      // Manter foco no input para permitir envio de múltiplas mensagens
      setTimeout(() => {
        messageInputRef.current?.focus();
      }, 50);
    }
  };

  // Filter atendimentos by search term
  const filteredAtendimentosVendedor = atendimentosVendedor.filter((atendimento) => {
    const searchLower = searchTerm.toLowerCase();
    const clienteNome = atendimento.clientes?.nome?.toLowerCase() || '';
    const clienteTelefone = atendimento.clientes?.telefone?.toLowerCase() || '';
    const marcaVeiculo = atendimento.marca_veiculo?.toLowerCase() || '';
    
    return clienteNome.includes(searchLower) || 
           clienteTelefone.includes(searchLower) ||
           marcaVeiculo.includes(searchLower);
  });

  // Filter messages based on search
  const filteredMensagensVendedor = searchMessages.trim() 
    ? mensagensVendedor.filter(msg => 
        msg.conteudo.toLowerCase().includes(searchMessages.toLowerCase())
      )
    : mensagensVendedor;

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      ia_respondendo: { label: "IA Respondendo", variant: "secondary" },
      aguardando_cliente: { label: "Aguardando Cliente", variant: "outline" },
      vendedor_intervindo: { label: "Você está atendendo", variant: "default" },
      aguardando_orcamento: { label: "Aguardando Orçamento", variant: "secondary" },
      aguardando_fechamento: { label: "Aguardando Fechamento", variant: "default" },
    };

    const config = statusMap[status] || { label: status, variant: "outline" as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard de Atendimentos</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie todos os atendimentos e solicitações em um único lugar
          </p>
        </div>

        {isSupervisor ? (
          // View for Supervisors
          <Tabs defaultValue="vendedores" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 lg:w-[700px]">
              <TabsTrigger value="vendedores" className="gap-2">
                <User className="h-4 w-4" />
                Vendedores ({vendedores.length})
              </TabsTrigger>
              <TabsTrigger value="nao-atribuidos" className="gap-2">
                <AlertCircle className="h-4 w-4" />
                Não Atribuídos ({atendimentosNaoAtribuidos.length})
              </TabsTrigger>
              <TabsTrigger value="historico" className="gap-2">
                <Clock className="h-4 w-4" />
                Histórico
              </TabsTrigger>
            </TabsList>

            {/* Vendedores Tab for Supervisor */}
            <TabsContent value="vendedores" className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total de Vendedores
                    </CardTitle>
                    <User className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{vendedoresAtribuidos.length}</div>
                    <p className="text-xs text-muted-foreground">
                      Atribuídos a você
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Atendimentos Ativos
                    </CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {metricas.reduce((sum, m) => sum + m.atendimentosAtivos, 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Em andamento
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Taxa de Conversão
                    </CardTitle>
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {metricas.length > 0
                        ? (metricas.reduce((sum, m) => sum + m.taxaConversao, 0) / metricas.length).toFixed(1)
                        : 0}%
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Média da equipe
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Tempo Médio
                    </CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">24h</div>
                    <p className="text-xs text-muted-foreground">
                      Resposta
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Vendedores List */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Lista de Vendedores</h3>
                
                {vendedores.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <User className="h-12 w-12 text-muted-foreground/40 mb-3" />
                      <p className="text-sm text-muted-foreground">
                        Nenhum vendedor atribuído
                      </p>
                    </CardContent>
                  </Card>
                 ) : (
                  <div className="space-y-4">
                    {vendedores.map((vendedor) => {
                      const vendedorMetrica = metricas.find(m => m.vendedorId === vendedor.id);
                      const isExpanded = selectedVendedorId === vendedor.id;
                      return (
                        <Collapsible key={vendedor.id} open={isExpanded}>
                          <Card className="overflow-hidden">
                            <CollapsibleTrigger className="w-full transition-all duration-300 ease-in-out" onClick={() => {
                              const newId = isExpanded ? null : vendedor.id;
                              setSelectedVendedorId(newId);
                              if (newId) {
                                fetchVendedorMessages(newId);
                                // Clear unread count when opening
                                setUnreadCounts(prev => ({ ...prev, [newId]: 0 }));
                              }
                            }}>
                              <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div>
                                      <CardTitle className="text-base">{vendedor.nome}</CardTitle>
                                      <CardDescription className="text-xs">{vendedor.especialidade}</CardDescription>
                                    </div>
                                    {unreadCounts[vendedor.id] > 0 && (
                                      <Badge variant="destructive" className="ml-2">
                                        {unreadCounts[vendedor.id]}
                                      </Badge>
                                    )}
                                  </div>
                                  {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                                </div>
                              </CardHeader>
                            </CollapsibleTrigger>
                            <CardContent className="pt-0">
                              <div className="grid grid-cols-3 gap-4 py-3 border-t">
                                <div className="text-center">
                                  <div className="text-sm text-muted-foreground">Ativos</div>
                                  <div className="text-lg font-semibold text-primary">
                                    {vendedorMetrica?.atendimentosAtivos || 0}
                                  </div>
                                </div>
                                <div className="text-center border-l border-r">
                                  <div className="text-sm text-muted-foreground">Total</div>
                                  <div className="text-lg font-semibold">
                                    {vendedorMetrica?.totalAtendimentos || 0}
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="text-sm text-muted-foreground">Conversão</div>
                                  <div className="text-lg font-semibold text-success">
                                    {vendedorMetrica?.taxaConversao.toFixed(1) || 0}%
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                            <CollapsibleContent className="overflow-hidden transition-all duration-300 ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out">
                              <div className="px-6 pb-6">
                                <VendedorChatModal
                                  vendedorId={vendedor.id}
                                  vendedorNome={vendedor.nome}
                                  embedded={true}
                                  onNewMessage={() => {
                                    fetchUnreadCounts(vendedoresAtribuidos);
                                  }}
                                />
                              </div>
                            </CollapsibleContent>
                          </Card>
                        </Collapsible>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Não Atribuídos Tab */}
            <TabsContent value="nao-atribuidos" className="space-y-4">
              {atendimentosNaoAtribuidos.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <AlertCircle className="h-12 w-12 text-muted-foreground/40 mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Nenhum atendimento não atribuído
                    </p>
                  </CardContent>
                </Card>
              ) : (
                atendimentosNaoAtribuidos.map((atendimento: any) => (
                  <AtendimentoCard
                    key={atendimento.id}
                    id={atendimento.id}
                    clienteNome={atendimento.clientes?.nome || 'Cliente sem nome'}
                    marcaVeiculo={atendimento.marca_veiculo}
                    ultimaMensagem={atendimento.mensagens?.[atendimento.mensagens.length - 1]?.conteudo || 'Sem mensagens'}
                    status={atendimento.status}
                    updatedAt={atendimento.updated_at || atendimento.created_at || new Date().toISOString()}
                    onClick={() => {
                      console.log('Abrir chat', atendimento.id);
                    }}
                  />
                ))
              )}
            </TabsContent>

            {/* Histórico Tab */}
            <TabsContent value="historico" className="space-y-4">
              <HistoricoAtendimentos vendedoresAtribuidos={vendedoresAtribuidos} />
            </TabsContent>
          </Tabs>
        ) : (
          // Original view for Vendedores
          <Tabs defaultValue="ia" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 lg:w-[500px]">
              <TabsTrigger
                value="ia"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-secondary data-[state=active]:text-white"
              >
                <Bot className="h-4 w-4 mr-2" />
                Número Principal (IA)
              </TabsTrigger>
              <TabsTrigger
                value="pessoal"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-accent data-[state=active]:to-success data-[state=active]:text-white"
              >
                <Phone className="h-4 w-4 mr-2" />
                Número Pessoal
              </TabsTrigger>
            </TabsList>

          {/* Atendimentos IA */}
          <TabsContent value="ia" className="space-y-6">
            {/* Seção de Prioridade 1 - Orçamentos e Fechamento */}
            <div className="grid gap-4 md:grid-cols-2">
              <Collapsible open={expandedDetails.has("orcamentos")} onOpenChange={() => toggleDetail("orcamentos")}>
                <Card className="rounded-2xl border-accent bg-gradient-to-br from-accent/10 to-transparent shadow-lg hover:shadow-xl transition-all duration-500">
                  <CollapsibleTrigger className="w-full text-left transition-all duration-500 ease-in-out hover:opacity-80">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-3 text-xl text-accent">
                          <FileText className="h-6 w-6" />
                          Orçamentos
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-accent/10 text-accent border-accent/30 text-lg font-bold px-3">
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : aguardandoOrcamento.length}
                          </Badge>
                          {expandedDetails.has("orcamentos") ? (
                            <ChevronUp className="h-5 w-5 text-accent transition-transform duration-500" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-accent transition-transform duration-500" />
                          )}
                        </div>
                      </div>
                      <CardDescription>Solicitações de orçamento pendentes</CardDescription>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="overflow-hidden transition-all duration-500 ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2">
                    <CardContent className="pt-0">
                      {aguardandoOrcamento.length === 0 ? (
                        <div className="rounded-lg border border-accent/20 bg-accent/5 p-6 text-center">
                          <FileText className="mx-auto h-10 w-10 text-accent/40 mb-3" />
                          <p className="text-sm text-muted-foreground">
                            Nenhum orçamento aguardando no momento
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {aguardandoOrcamento.map((atendimento) => (
                            <AtendimentoCard
                              key={atendimento.id}
                              id={atendimento.id}
                              clienteNome={atendimento.clientes?.nome || 'Cliente sem nome'}
                              marcaVeiculo={atendimento.marca_veiculo}
                              ultimaMensagem={atendimento.mensagens?.[atendimento.mensagens.length - 1]?.conteudo || 'Sem mensagens'}
                              status={atendimento.status as any}
                              updatedAt={atendimento.updated_at || atendimento.created_at || new Date().toISOString()}
                              onClick={() => {
                                console.log('Abrir chat', atendimento.id);
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>

              <Collapsible open={expandedDetails.has("fechamento")} onOpenChange={() => toggleDetail("fechamento")}>
                <Card className="rounded-2xl border-success bg-gradient-to-br from-success/10 to-transparent shadow-lg hover:shadow-xl transition-all duration-500">
                  <CollapsibleTrigger className="w-full text-left transition-all duration-500 ease-in-out hover:opacity-80">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-3 text-xl text-success">
                          <CheckCircle2 className="h-6 w-6" />
                          Fechamento
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-lg font-bold px-3">
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : aguardandoFechamento.length}
                          </Badge>
                          {expandedDetails.has("fechamento") ? (
                            <ChevronUp className="h-5 w-5 text-success transition-transform duration-500" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-success transition-transform duration-500" />
                          )}
                        </div>
                      </div>
                      <CardDescription>Negociações aguardando confirmação final</CardDescription>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="overflow-hidden transition-all duration-500 ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2">
                    <CardContent className="pt-0">
                      {aguardandoFechamento.length === 0 ? (
                        <div className="rounded-lg border border-success/20 bg-success/5 p-6 text-center">
                          <CheckCircle2 className="mx-auto h-10 w-10 text-success/40 mb-3" />
                          <p className="text-sm text-muted-foreground">
                            Nenhum fechamento pendente no momento
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {aguardandoFechamento.map((atendimento) => (
                            <AtendimentoCard
                              key={atendimento.id}
                              id={atendimento.id}
                              clienteNome={atendimento.clientes?.nome || 'Cliente sem nome'}
                              marcaVeiculo={atendimento.marca_veiculo}
                              ultimaMensagem={atendimento.mensagens?.[atendimento.mensagens.length - 1]?.conteudo || 'Sem mensagens'}
                              status={atendimento.status as any}
                              updatedAt={atendimento.updated_at || atendimento.created_at || new Date().toISOString()}
                              onClick={() => {
                                console.log('Abrir chat', atendimento.id);
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            </div>

            {/* Solicitações Especiais */}
            <Card className="rounded-2xl border-border bg-card shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Solicitações Especiais
                </CardTitle>
                <CardDescription>Casos que requerem atenção diferenciada</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-4">
                  <Collapsible open={expandedDetails.has("reembolso")} onOpenChange={() => toggleDetail("reembolso")}>
                    <Card className="border-red-500/50 bg-gradient-to-br from-red-500/5 to-transparent hover:shadow-md transition-all duration-500 hover-scale">
                      <CollapsibleTrigger className="w-full text-left transition-all duration-500 ease-in-out hover:opacity-80">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2 text-base text-red-600 dark:text-red-400">
                              <RefreshCw className="h-4 w-4" />
                              Reembolsos
                            </CardTitle>
                            {expandedDetails.has("reembolso") ? (
                              <ChevronUp className="h-4 w-4 text-red-600 dark:text-red-400 transition-transform duration-500" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-red-600 dark:text-red-400 transition-transform duration-500" />
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-2xl font-bold text-red-600 dark:text-red-400">0</p>
                        </CardContent>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="overflow-hidden transition-all duration-500 ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2">
                        <CardContent className="pt-2">
                          <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-center animate-fade-in">
                            <p className="text-xs text-muted-foreground">Nenhuma solicitação de reembolso</p>
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>

                  <Collapsible open={expandedDetails.has("garantia")} onOpenChange={() => toggleDetail("garantia")}>
                    <Card className="border-blue-500/50 bg-gradient-to-br from-blue-500/5 to-transparent hover:shadow-md transition-all duration-500 hover-scale">
                      <CollapsibleTrigger className="w-full text-left transition-all duration-500 ease-in-out hover:opacity-80">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2 text-base text-blue-600 dark:text-blue-400">
                              <Shield className="h-4 w-4" />
                              Garantias
                            </CardTitle>
                            {expandedDetails.has("garantia") ? (
                              <ChevronUp className="h-4 w-4 text-blue-600 dark:text-blue-400 transition-transform duration-500" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-blue-600 dark:text-blue-400 transition-transform duration-500" />
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">0</p>
                        </CardContent>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="overflow-hidden transition-all duration-500 ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2">
                        <CardContent className="pt-2">
                          <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 text-center animate-fade-in">
                            <p className="text-xs text-muted-foreground">Nenhum acionamento de garantia</p>
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>

                  <Collapsible open={expandedDetails.has("troca")} onOpenChange={() => toggleDetail("troca")}>
                    <Card className="border-purple-500/50 bg-gradient-to-br from-purple-500/5 to-transparent hover:shadow-md transition-all duration-500 hover-scale">
                      <CollapsibleTrigger className="w-full text-left transition-all duration-500 ease-in-out hover:opacity-80">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2 text-base text-purple-600 dark:text-purple-400">
                              <Package className="h-4 w-4" />
                              Trocas
                            </CardTitle>
                            {expandedDetails.has("troca") ? (
                              <ChevronUp className="h-4 w-4 text-purple-600 dark:text-purple-400 transition-transform duration-500" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-purple-600 dark:text-purple-400 transition-transform duration-500" />
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">0</p>
                        </CardContent>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="overflow-hidden transition-all duration-500 ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2">
                        <CardContent className="pt-2">
                          <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-3 text-center animate-fade-in">
                            <p className="text-xs text-muted-foreground">Nenhuma solicitação de troca</p>
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>

                  <Collapsible open={expandedDetails.has("resolvidos")} onOpenChange={() => toggleDetail("resolvidos")}>
                    <Card className="border-green-500/50 bg-gradient-to-br from-green-500/5 to-transparent hover:shadow-md transition-all duration-500 hover-scale">
                      <CollapsibleTrigger className="w-full text-left transition-all duration-500 ease-in-out hover:opacity-80">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2 text-base text-green-600 dark:text-green-400">
                              <CheckCircle2 className="h-4 w-4" />
                              Resolvidos
                            </CardTitle>
                            {expandedDetails.has("resolvidos") ? (
                              <ChevronUp className="h-4 w-4 text-green-600 dark:text-green-400 transition-transform duration-500" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-green-600 dark:text-green-400 transition-transform duration-500" />
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-2xl font-bold text-green-600 dark:text-green-400">0</p>
                        </CardContent>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="overflow-hidden transition-all duration-500 ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2">
                        <CardContent className="pt-2">
                          <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3 text-center animate-fade-in">
                            <p className="text-xs text-muted-foreground">Nenhum caso resolvido</p>
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                </div>
              </CardContent>
            </Card>

            {/* Destaque Principal - IA Respondendo (Chat ao Vivo) */}
            <Collapsible open={expandedDetails.has("ia_respondendo")} onOpenChange={() => toggleDetail("ia_respondendo")} defaultOpen={true}>
              <Card className="rounded-2xl border-primary bg-gradient-to-br from-primary/10 via-secondary/5 to-transparent shadow-xl transition-all duration-500 ease-in-out">
                <CollapsibleTrigger className="w-full text-left transition-all duration-500 ease-in-out hover:opacity-80">
                  <CardHeader className="border-b border-primary/20 bg-gradient-to-r from-primary/10 to-secondary/10">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-3 text-2xl">
                          <Bot className="h-6 w-6 text-primary animate-pulse" />
                          IA Respondendo - Chat ao Vivo
                        </CardTitle>
                        <CardDescription className="mt-2 text-base">
                          {expandedDetails.has("ia_respondendo") 
                            ? "Acompanhe em tempo real suas conversas com clientes" 
                            : filteredAtendimentosVendedor.length > 0
                              ? (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold">{filteredAtendimentosVendedor.length} conversa{filteredAtendimentosVendedor.length > 1 ? 's' : ''} ativa{filteredAtendimentosVendedor.length > 1 ? 's' : ''}</span>
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {filteredAtendimentosVendedor.slice(0, 3).map((a, idx) => (
                                      <div key={a.id} className="flex items-center gap-2">
                                        <span>•</span>
                                        <span className="font-medium">{a.clientes?.push_name || a.clientes?.nome || 'Cliente'}</span>
                                        <span className="text-xs">({a.marca_veiculo}{a.modelo_veiculo ? ` ${a.modelo_veiculo}` : ''})</span>
                                      </div>
                                    ))}
                                    {filteredAtendimentosVendedor.length > 3 && (
                                      <div className="text-xs mt-1 font-medium">+ {filteredAtendimentosVendedor.length - 3} outras conversas</div>
                                    )}
                                  </div>
                                </div>
                              )
                              : "Nenhuma conversa ativa no momento"
                          }
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 px-4 py-2 text-lg font-bold">
                          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : `${filteredAtendimentosVendedor.length} ativas`}
                        </Badge>
                        <Badge className="bg-gradient-to-r from-primary to-secondary text-white px-4 py-1">
                          Chat ao Vivo
                        </Badge>
                        {expandedDetails.has("ia_respondendo") ? (
                          <ChevronUp className="h-5 w-5 text-primary transition-all duration-500 ease-in-out" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-primary transition-all duration-500 ease-in-out" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent className="overflow-hidden transition-all duration-500 ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2">
                  <CardContent className="p-6">
                    {atendimentosVendedor.length === 0 ? (
                      <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-12 text-center">
                        <MessageSquare className="mx-auto h-16 w-16 text-primary/40 mb-4" />
                        <p className="text-lg font-medium text-foreground mb-2">
                          Nenhum atendimento ativo no momento
                        </p>
                        <p className="text-sm text-muted-foreground max-w-md mx-auto">
                          Quando novos clientes forem atribuídos a você, eles aparecerão aqui.
                        </p>
                      </div>
                      ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          {/* Lista de Atendimentos */}
                          <Card className="lg:col-span-1">
                           <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                              <MessageSquare className="h-5 w-5" />
                              Conversas Ativas ({filteredAtendimentosVendedor.length})
                            </CardTitle>
                            <div className="mt-3">
                              <UnifiedSearch 
                                onSearchChange={(query) => setSearchTerm(query)}
                                onSelectMessage={(atendimentoId, messageId) => {
                                  setSelectedAtendimentoIdVendedor(atendimentoId);
                                  setHighlightedMessageId(messageId);
                                  clearUnreadCount(atendimentoId);
                                  markMessagesAsRead(atendimentoId);
                                  setTimeout(() => setHighlightedMessageId(null), 3000);
                                }}
                              />
                            </div>
                          </CardHeader>
                          <CardContent className="p-0">
                            <ScrollArea className="h-[60vh]">
                            {filteredAtendimentosVendedor.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full px-4 py-6 text-muted-foreground">
                                  <MessageSquare className="h-6 w-6 mb-2 opacity-50" />
                                  <p className="text-xs">Nenhum atendimento encontrado</p>
                                </div>
                              ) : (
                                <div className="relative space-y-2 px-3 py-2">
                                  <div className="relative space-y-2">{filteredAtendimentosVendedor.map((atendimento) => {
                                     // Get last message with attachment
                                     const lastMessageQuery = supabase
                                       .from("mensagens")
                                       .select("attachment_url, attachment_type, created_at")
                                       .eq("atendimento_id", atendimento.id)
                                       .not("attachment_url", "is", null)
                                       .order("created_at", { ascending: false })
                                       .limit(1);
                                     
                                     return (
                                         <button
                                           key={atendimento.id}
                                            onClick={() => {
                                              setSelectedAtendimentoIdVendedor(atendimento.id);
                                              clearUnreadCount(atendimento.id);
                                              markMessagesAsRead(atendimento.id);
                                            }}
                                              className={`w-full text-left px-3 py-2 rounded-lg transition-all duration-200 hover:scale-[1.01] bg-gradient-to-b from-accent/8 to-transparent ${
                                                selectedAtendimentoIdVendedor === atendimento.id 
                                                  ? 'border-2 border-primary shadow-sm' 
                                                  : 'border-2 border-border hover:border-primary/30 hover:shadow-sm'
                                              }`}
                                          >
                                            <div className="flex items-start justify-between mb-1.5">
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                              {atendimento.clientes?.profile_picture_url ? (
                                                <img 
                                                  src={atendimento.clientes.profile_picture_url} 
                                                  alt="Perfil" 
                                                  className="h-10 w-10 rounded-full object-cover border-2 border-accent/30"
                                                  onError={(e) => {
                                                    e.currentTarget.style.display = 'none';
                                                    const parent = e.currentTarget.parentElement;
                                                    if (parent) {
                                                      const icon = document.createElement('div');
                                                      icon.className = 'h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center';
                                                      icon.innerHTML = '<svg class="h-5 w-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>';
                                                      parent.insertBefore(icon, parent.firstChild);
                                                    }
                                                  }}
                                                />
                                              ) : (
                                                <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center">
                                                  <User className="h-5 w-5 text-accent" />
                                                </div>
                                              )}
                                                <div className="flex-1 min-w-0">
                                                  <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-sm block truncate">
                                                      {atendimento.clientes?.push_name || atendimento.clientes?.nome || "Cliente"}
                                                    </span>
                                                    {clientPresence[atendimento.id]?.isTyping && (
                                                      <span className="text-[10px] text-success font-medium flex items-center gap-1">
                                                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                                                        digitando...
                                                      </span>
                                                    )}
                                                    {!clientPresence[atendimento.id]?.isTyping && clientPresence[atendimento.id]?.isOnline && (
                                                      <span className="inline-block h-2 w-2 rounded-full bg-success" title="Online" />
                                                    )}
                                                  </div>
                                                 {lastMessages[atendimento.id] ? (
                                                   <div className="flex items-start gap-1.5 mt-1">
                                                     {lastMessages[atendimento.id].attachmentType && (
                                                       lastMessages[atendimento.id].attachmentType === 'image' ? (
                                                         <ImageIcon className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
                                                       ) : (
                                                         <File className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
                                                       )
                                                     )}
                                                     <span className="text-xs text-muted-foreground line-clamp-2 break-words flex-1">
                                                       {lastMessages[atendimento.id].remetenteTipo === 'vendedor' && (
                                                         <span className="font-medium">Você: </span>
                                                       )}
                                                       {lastMessages[atendimento.id].attachmentType 
                                                         ? lastMessages[atendimento.id].attachmentType === 'image' 
                                                           ? 'Imagem' 
                                                           : 'Documento'
                                                         : (lastMessages[atendimento.id].conteudo?.substring(0, 60) || 'Mensagem') + 
                                                           (lastMessages[atendimento.id].conteudo?.length > 60 ? '...' : '')}
                                                     </span>
                                                   </div>
                                                 ) : (
                                                   <span className="text-xs text-muted-foreground mt-1 block">
                                                     Sem mensagens ainda
                                                   </span>
                                                 )}
                                               </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                {unreadCountsVendedor[atendimento.id] > 0 && (
                                                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                                                    {unreadCountsVendedor[atendimento.id]}
                                                  </Badge>
                                                )}
                                                <span className="whitespace-nowrap">
                                                  {format(new Date(lastMessages[atendimento.id]?.createdAt || atendimento.created_at), "dd/MM HH:mm", { locale: ptBR })}
                                                </span>
                                              </div>
                                              {lastMessages[atendimento.id]?.remetenteTipo === 'vendedor' && (
                                                <span className="flex items-center">
                                                  {lastMessages[atendimento.id].readAt ? (
                                                    <CheckCheck className="h-3 w-3 text-success" />
                                                  ) : lastMessages[atendimento.id].deliveredAt ? (
                                                    <CheckCheck className="h-3 w-3 opacity-60" />
                                                  ) : (
                                                    <Check className="h-3 w-3 opacity-60" />
                                                  )}
                                                </span>
                                              )}
                                            </div>
                                         </div>
                                        <p className="text-xs text-muted-foreground mb-2">
                                          {atendimento.marca_veiculo} {atendimento.modelo_veiculo}
                                        </p>
                                         <div className="flex items-center justify-between">
                                           <div className="flex items-center gap-2">
                                             {getStatusBadge(atendimento.status)}
                                             {lastMessages[atendimento.id]?.attachmentCount > 0 && (
                                               <Badge variant="outline" className="text-xs gap-1">
                                                 <Paperclip className="h-3 w-3" />
                                                 {lastMessages[atendimento.id].attachmentCount}
                                               </Badge>
                                             )}
                                           </div>
                                            {!clientPresence[atendimento.id]?.isTyping && !clientPresence[atendimento.id]?.isOnline && clientPresence[atendimento.id]?.lastSeenAt && (
                                              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                                visto {(() => {
                                                  const lastSeen = new Date(clientPresence[atendimento.id].lastSeenAt!);
                                                  const diffInSeconds = Math.floor((now - lastSeen.getTime()) / 1000);
                                                  
                                                  if (diffInSeconds < 60) return 'agora';
                                                  if (diffInSeconds < 3600) return `há ${Math.floor(diffInSeconds / 60)}m`;
                                                  if (diffInSeconds < 86400) return `há ${Math.floor(diffInSeconds / 3600)}h`;
                                                  return `há ${Math.floor(diffInSeconds / 86400)}d`;
                                                })()}
                                              </span>
                                            )}
                                         </div>
                                       </button>
                                     );
                                   })}
                                  </div>
                                 </div>
                               )}
                            </ScrollArea>
                          </CardContent>
                        </Card>

                        {/* Chat Area */}
                        <Card className="lg:col-span-2">
                          <CardHeader className="border-b">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                {selectedAtendimentoIdVendedor && atendimentosVendedor.find(a => a.id === selectedAtendimentoIdVendedor)?.clientes?.profile_picture_url ? (
                                  <img 
                                    src={atendimentosVendedor.find(a => a.id === selectedAtendimentoIdVendedor)?.clientes?.profile_picture_url || ''} 
                                    alt="Perfil" 
                                    className="h-12 w-12 rounded-full object-cover border-2 border-accent/30"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                ) : selectedAtendimentoIdVendedor ? (
                                  <div className="h-12 w-12 rounded-full bg-accent/20 flex items-center justify-center">
                                    <User className="h-6 w-6 text-accent" />
                                  </div>
                                ) : null}
                                <div>
                                  <CardTitle className="text-base">
                                    {atendimentosVendedor.find(a => a.id === selectedAtendimentoIdVendedor)?.clientes?.push_name || 
                                     atendimentosVendedor.find(a => a.id === selectedAtendimentoIdVendedor)?.clientes?.nome || 
                                     "Selecione um atendimento"}
                                  </CardTitle>
                                  {selectedAtendimentoIdVendedor && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {atendimentosVendedor.find(a => a.id === selectedAtendimentoIdVendedor)?.clientes?.telefone}
                                    </p>
                                  )}
                                </div>
                              </div>
                              {selectedAtendimentoIdVendedor && getStatusBadge(atendimentosVendedor.find(a => a.id === selectedAtendimentoIdVendedor)?.status || "")}
                            </div>
                            {selectedAtendimentoIdVendedor && (
                              <div className="flex gap-2">
                                <Input
                                  type="text"
                                  placeholder="Buscar mensagens..."
                                  value={searchMessages}
                                  onChange={(e) => setSearchMessages(e.target.value)}
                                  className="h-9 flex-1"
                                />
                                {searchMessages && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setSearchMessages("");
                                      setHighlightedMessageId(null);
                                    }}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            )}
                          </CardHeader>
                          <CardContent className="p-0">
                            <Tabs defaultValue="chat" className="w-full">
                              <TabsList className="w-full justify-start rounded-none border-b bg-transparent px-4">
                                <TabsTrigger value="chat" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
                                  Chat
                                </TabsTrigger>
                                <TabsTrigger value="media" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
                                  <Images className="h-4 w-4 mr-2" />
                                  Mídias
                                </TabsTrigger>
                              </TabsList>
                              
                              <TabsContent value="chat" className="mt-0">
                                <ScrollArea 
                                  className="h-[60vh] rounded-b-xl relative"
                                  ref={scrollRef}
                                >
                                  {/* Textura de fundo aplicada diretamente abaixo das mensagens */}
                                  <div 
                                    className="w-full bg-card/95 backdrop-blur-sm p-3"
                                    style={selectedAtendimentoIdVendedor ? {
                                      minHeight: '60vh',
                                      backgroundImage:
                                        "linear-gradient(to right, hsl(var(--muted)/0.25) 1px, transparent 1px)," +
                                        "linear-gradient(to bottom, hsl(var(--muted)/0.25) 1px, transparent 1px)," +
                                        "radial-gradient(circle at 20% 20%, hsl(var(--primary)/0.20) 0, transparent 55%)," +
                                        "radial-gradient(circle at 80% 80%, hsl(var(--accent)/0.20) 0, transparent 55%)",
                                      backgroundSize: "18px 18px, 18px 18px, 100% 100%, 100% 100%",
                                    } : { minHeight: '60vh' }}
                                  >
                                    <div className="w-full px-2 py-3">
                                        {!selectedAtendimentoIdVendedor ? (
                                          <div className="flex flex-col items-center justify-center text-muted-foreground bg-card p-6" style={{ minHeight: 'calc(60vh - 24px)' }}>
                                            <MessageSquare className="h-12 w-12 mb-4 opacity-50" />
                                            <p>Selecione um atendimento para ver as mensagens</p>
                                          </div>
                                        ) : mensagensVendedor.length === 0 ? (
                                          <div className="flex flex-col items-center justify-center text-muted-foreground" style={{ minHeight: 'calc(60vh - 24px)' }}>
                                            <Bot className="h-12 w-12 mb-4 opacity-50" />
                                            <p>Nenhuma mensagem ainda</p>
                                          </div>
                                          ) : (
                                            <div className="w-full">
                                            <div className="space-y-4">
                                              {/* Botão para carregar mensagens antigas */}
                                              {hasMoreMessages && (
                                                <div className="flex justify-center pb-2">
                                                  <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={handleLoadOlderMessages}
                                                    disabled={loadingMessages}
                                                    className="text-xs"
                                                  >
                                                    {loadingMessages ? (
                                                      <>
                                                        <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                                                        Carregando...
                                                      </>
                                                    ) : (
                                                      'Carregar mensagens antigas'
                                                    )}
                                                  </Button>
                                                </div>
                                              )}
                                              
                                              {searchMessages && filteredMensagensVendedor.length === 0 ? (
                                               <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12">
                                                 <MessageSquare className="h-12 w-12 mb-4 opacity-50" />
                                                 <p>Nenhuma mensagem encontrada</p>
                                                 <p className="text-xs mt-1">Tente buscar com outros termos</p>
                                               </div>
                                              ) : (
                                                <>
                                                   {filteredMensagensVendedor.map((mensagem, index) => {
                                                   const previousMessage = index > 0 ? filteredMensagensVendedor[index - 1] : null;
                                                   const showSenderName = !previousMessage || previousMessage.remetente_tipo !== mensagem.remetente_tipo;
                                                   const currentAtendimento = atendimentosVendedor.find(a => a.id === selectedAtendimentoIdVendedor);
                                                   
                                                    return (
                                                      <ChatMessage
                                                        key={mensagem.id}
                                                        remetenteTipo={mensagem.remetente_tipo as "cliente" | "ia" | "supervisor" | "vendedor"}
                                                        conteudo={mensagem.conteudo}
                                                        createdAt={mensagem.created_at}
                                                        attachmentUrl={mensagem.attachment_url}
                                                        attachmentType={mensagem.attachment_type}
                                                        attachmentFilename={mensagem.attachment_filename}
                                                        searchTerm={searchMessages}
                                                        isHighlighted={highlightedMessageId === mensagem.id}
                                                        readAt={mensagem.read_at}
                                                        showSenderName={showSenderName}
                                                        clientePushName={currentAtendimento?.clientes?.push_name}
                                                        clienteProfilePicture={currentAtendimento?.clientes?.profile_picture_url}
                                                        status={mensagem.status}
                                                        deliveredAt={mensagem.delivered_at}
                                                      />
                                                    );
                                                 })}
                                              </>
                                            )}
                                            {isClientTyping && (
                                              <div className="flex items-center gap-2 text-sm text-muted-foreground ml-11">
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                <span>Cliente está digitando...</span>
                                              </div>
                                            )}
                                             {/* Div invisível para scroll automático */}
                                             <div ref={messagesEndRef} />
                                           </div>
                                         </div>
                                       )}
                                     </div>
                                   </div>
                                 </ScrollArea>
                                
                                {/* Input Area */}
                                {selectedAtendimentoIdVendedor && (
                                  <div className="border-t p-4 bg-muted/30">
                                    {/* File Preview */}
                                    {selectedFile && (
                                      <div className="mb-3 p-3 bg-accent/10 border border-accent/30 rounded-lg flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          {selectedFile.type.startsWith('image/') ? (
                                            <ImageIcon className="h-5 w-5 text-accent" />
                                          ) : (
                                            <File className="h-5 w-5 text-accent" />
                                          )}
                                          <span className="text-sm font-medium truncate max-w-[200px]">
                                            {selectedFile.name}
                                          </span>
                                          <span className="text-xs text-muted-foreground">
                                            ({(selectedFile.size / 1024).toFixed(1)} KB)
                                          </span>
                                        </div>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6"
                                          onClick={() => {
                                            setSelectedFile(null);
                                            if (fileInputRef.current) {
                                              fileInputRef.current.value = "";
                                            }
                                          }}
                                        >
                                          <X className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    )}
                                    
                                    <div className="flex gap-2">
                                      <Input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.txt,.csv"
                                        onChange={handleFileSelect}
                                        className="hidden"
                                      />
                                      <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-[60px] w-[60px] shrink-0"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isUploading || isSending}
                                      >
                                        <Paperclip className="h-5 w-5" />
                                      </Button>
                                      <Textarea
                                        ref={messageInputRef}
                                        value={messageInput}
                                        onChange={handleInputChange}
                                        onKeyPress={handleKeyPress}
                                        placeholder="Digite sua mensagem... (Enter para enviar, Shift+Enter para nova linha)"
                                        className="min-h-[60px] max-h-[120px] resize-none"
                                        disabled={isSending || isUploading}
                                      />
                                      <Button
                                        onClick={selectedFile ? handleSendWithFile : handleSendMessage}
                                        disabled={(!messageInput.trim() && !selectedFile) || isSending || isUploading}
                                        size="icon"
                                        className="h-[60px] w-[60px] shrink-0"
                                      >
                                        {(isSending || isUploading) ? (
                                          <Loader2 className="h-5 w-5 animate-spin" />
                                        ) : (
                                          <Send className="h-5 w-5" />
                                        )}
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </TabsContent>
                              
                              <TabsContent value="media" className="mt-0">
                                {selectedAtendimentoIdVendedor ? (
                                  <MediaGallery 
                                    mensagens={mensagensVendedor}
                                    onLoadMore={loadMoreMessages}
                                    hasMoreMedia={hasMoreMessages}
                                  />
                                ) : (
                                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                    <Images className="h-12 w-12 mb-4 opacity-50" />
                                    <p className="text-sm">Selecione um atendimento para ver as mídias</p>
                                  </div>
                                )}
                              </TabsContent>
                            </Tabs>
                          </CardContent>
                        </Card>
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          </TabsContent>

          {/* Atendimentos Pessoais */}
          <TabsContent value="pessoal" className="space-y-6">
            {/* Métricas Principais - Número Pessoal */}
            <div className="grid gap-4 md:grid-cols-3">
              <Collapsible open={expandedDetails.has("pessoal_ativas")} onOpenChange={() => toggleDetail("pessoal_ativas")}>
                <Card className="rounded-2xl border-accent bg-gradient-to-br from-accent/10 to-transparent shadow-md hover:shadow-lg transition-all duration-300">
                  <CollapsibleTrigger className="w-full text-left transition-all duration-300 ease-in-out hover:opacity-80">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2 text-sm text-accent">
                            <MessageSquare className="h-4 w-4" />
                            Conversas Ativas
                          </CardTitle>
                          <CardDescription className="text-xs">Atendimentos diretos</CardDescription>
                        </div>
                        {expandedDetails.has("pessoal_ativas") ? (
                          <ChevronUp className="h-4 w-4 text-accent transition-transform duration-300" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-accent transition-transform duration-300" />
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold text-accent">0</p>
                    </CardContent>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="overflow-hidden transition-all duration-300 ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out">
                    <CardContent className="pt-2">
                      <div className="rounded-lg border border-accent/20 bg-accent/5 p-4 text-center animate-fade-in">
                        <p className="text-xs text-muted-foreground">
                          Nenhuma conversa ativa no momento
                        </p>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>

              <Collapsible open={expandedDetails.has("pessoal_respondidas")} onOpenChange={() => toggleDetail("pessoal_respondidas")}>
                <Card className="rounded-2xl border-success bg-gradient-to-br from-success/10 to-transparent shadow-md hover:shadow-lg transition-all duration-300">
                  <CollapsibleTrigger className="w-full text-left transition-all duration-300 ease-in-out hover:opacity-80">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2 text-sm text-success">
                            <CheckCircle2 className="h-4 w-4" />
                            Respondidas
                          </CardTitle>
                          <CardDescription className="text-xs">Já atendidas</CardDescription>
                        </div>
                        {expandedDetails.has("pessoal_respondidas") ? (
                          <ChevronUp className="h-4 w-4 text-success transition-transform duration-300" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-success transition-transform duration-300" />
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold text-success">0</p>
                    </CardContent>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="overflow-hidden transition-all duration-300 ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out">
                    <CardContent className="pt-2">
                      <div className="rounded-lg border border-success/20 bg-success/5 p-4 text-center animate-fade-in">
                        <p className="text-xs text-muted-foreground">
                          Nenhuma conversa respondida ainda
                        </p>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>

              <Collapsible open={expandedDetails.has("pessoal_aguardando")} onOpenChange={() => toggleDetail("pessoal_aguardando")}>
                <Card className="rounded-2xl border-border bg-gradient-to-br from-muted/20 to-transparent shadow-md hover:shadow-lg transition-all duration-300">
                  <CollapsibleTrigger className="w-full text-left transition-all duration-300 ease-in-out hover:opacity-80">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2 text-sm">
                            <Phone className="h-4 w-4" />
                            Aguardando
                          </CardTitle>
                          <CardDescription className="text-xs">Esperando resposta</CardDescription>
                        </div>
                        {expandedDetails.has("pessoal_aguardando") ? (
                          <ChevronUp className="h-4 w-4 transition-transform duration-300" />
                        ) : (
                          <ChevronDown className="h-4 w-4 transition-transform duration-300" />
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold">0</p>
                    </CardContent>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="overflow-hidden transition-all duration-300 ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out">
                    <CardContent className="pt-2">
                      <div className="rounded-lg border bg-muted/30 p-4 text-center animate-fade-in">
                        <p className="text-xs text-muted-foreground">
                          Nenhum cliente aguardando resposta
                        </p>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            </div>

            {/* Info de Configuração */}
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
                    Vá em <span className="font-semibold text-accent">Configurações</span> para
                    conectar seu WhatsApp pessoal.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        )}
      </div>
    </MainLayout>
  );
}
