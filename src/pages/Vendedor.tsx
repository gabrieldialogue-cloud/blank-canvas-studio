import { useState, useEffect, useRef } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { MessageSquare, User, Bot, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Atendimento {
  id: string;
  marca_veiculo: string;
  modelo_veiculo: string | null;
  status: string;
  created_at: string;
  clientes: {
    nome: string;
    telefone: string;
  } | null;
}

interface Message {
  id: string;
  remetente_tipo: "ia" | "cliente" | "vendedor" | "supervisor";
  conteudo: string;
  created_at: string;
}

export default function Vendedor() {
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([]);
  const [selectedAtendimentoId, setSelectedAtendimentoId] = useState<string | null>(null);
  const [mensagens, setMensagens] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [vendedorId, setVendedorId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Initialize notification sound
  useEffect(() => {
    audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSyA0fPTgjMGG2S36+eVSAwNU6zn77BdGAg+jdXvzHksBidzy/DajkILFFu06+qmVBELSKXh8r5uIQUsgs/z1YUyBhtmtvDnjUYOCFCr5O+zdxoJPY/W8sx5LQYme8rx2o1BBxVbta7qpVURDEik4fO+biEFLILP89WGMgYcZrjv6YxGDQhRq+Tvs3caCT2P1/LMeS0GJnvL8dmNQQcVW7Su6qRUEQxIpOHzvm4hBSyDz/PVhjIGHGa57+mMRg0IUKvk77N3Ggk9j9fyzHktBiZ7y/HZjUEHFVu0ruqkVBEMSKTh875uIQUsgs/z1YUyBhxmue/pjEYNCFCr5O+zdxoJPY/X8sx5LQYme8vx2Y1BBxVatK7qpFQRDEik4fO+biEFLILP89WFMgYcZrnv6YxGDQhQq+Tvs3caCT2P1/LMeS0GJnvL8dmNQQcVWrSu6qRUEQxIpOHzvm4hBSyCz/PVhTIGHGa57+mMRg0IUKvk77N3Ggk9j9fyzHktBiZ7y/HZjUEHFVq0ruqkVBEMSKTh875uIQUsgs/z1YUyBhxmue/pjEYNCFCr5O+zdxoJPY/X8sx5LQYme8vx2Y1BBxVatK7qpFQRDEik4fO+biEFLILP89WFMgYcZrnv6YxGDQhQq+Tvs3caCT2P1/LMeS0GJnvL8dmNQQcVWrSu6qRUEQxIpOHzvm4hBSyCz/PVhTIGHGa57+mMRg0IUKvk77N3Ggk9j9fyzHktBiZ7y/HZjUEHFVq0ruqkVBEMSKTh875uIQUsgs/z1YUyBhxmue/pjEYNCFCr5O+zdxoJPY/X8sx5LQYme8vx2Y1BBxVatK7qpFQRDEik4fO+biEFLILP89WFMgYcZrnv6YxGDQhQq+Tvs3caCT2P1/LMeS0GJnvL8dmNQQcVWrSu6qRUEQxIpOHzvm4hBSyC');
  }, []);

  // Get current vendedor
  useEffect(() => {
    fetchVendedorId();
  }, []);

  const fetchVendedorId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: usuarioData } = await supabase
      .from('usuarios')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (usuarioData) {
      setVendedorId(usuarioData.id);
    }
  };

  // Fetch atendimentos
  useEffect(() => {
    if (vendedorId) {
      fetchAtendimentos();
    }
  }, [vendedorId]);

  const fetchAtendimentos = async () => {
    if (!vendedorId) return;

    const { data } = await supabase
      .from("atendimentos")
      .select(`
        id,
        marca_veiculo,
        modelo_veiculo,
        status,
        created_at,
        clientes (nome, telefone)
      `)
      .eq('vendedor_fixo_id', vendedorId)
      .neq('status', 'encerrado')
      .order("created_at", { ascending: false });
    
    if (data && data.length > 0) {
      setAtendimentos(data as Atendimento[]);
      if (!selectedAtendimentoId) {
        setSelectedAtendimentoId(data[0].id);
      }
    }
  };

  // Fetch messages for selected atendimento
  useEffect(() => {
    if (selectedAtendimentoId) {
      fetchMensagens(selectedAtendimentoId);
      
      // Setup realtime subscription for new messages
      const channel = supabase
        .channel('mensagens-realtime')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'mensagens',
            filter: `atendimento_id=eq.${selectedAtendimentoId}`
          },
          (payload) => {
            const newMessage = payload.new as Message;
            setMensagens((prev) => [...prev, newMessage]);
            
            // Play notification sound for new client or IA messages
            if (newMessage.remetente_tipo === 'cliente' || newMessage.remetente_tipo === 'ia') {
              audioRef.current?.play().catch(err => console.log('Audio play failed:', err));
            }
            
            // Auto scroll to bottom
            setTimeout(() => {
              if (scrollRef.current) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
              }
            }, 100);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedAtendimentoId]);

  const fetchMensagens = async (atendimentoId: string) => {
    const { data } = await supabase
      .from("mensagens")
      .select("*")
      .eq('atendimento_id', atendimentoId)
      .order("created_at", { ascending: true });
    
    if (data) {
      setMensagens(data as Message[]);
      
      // Auto scroll to bottom
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 100);
    }
  };

  // Auto scroll when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [mensagens]);

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
          <h1 className="text-3xl font-bold text-foreground">Meus Atendimentos</h1>
          <p className="text-muted-foreground mt-2">
            Acompanhe em tempo real suas conversas com clientes
          </p>
        </div>

        {atendimentos.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">
                Nenhum atendimento ativo no momento
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Lista de Atendimentos */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Conversas Ativas ({atendimentos.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[600px]">
                  <div className="space-y-1 p-4">
                    {atendimentos.map((atendimento) => (
                      <button
                        key={atendimento.id}
                        onClick={() => setSelectedAtendimentoId(atendimento.id)}
                        className={`w-full text-left p-4 rounded-lg transition-all hover:bg-accent ${
                          selectedAtendimentoId === atendimento.id ? 'bg-accent border-2 border-primary' : 'border border-border'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold text-sm">
                              {atendimento.clientes?.nome || "Cliente"}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">
                          {atendimento.marca_veiculo} {atendimento.modelo_veiculo}
                        </p>
                        <div className="flex items-center justify-between">
                          {getStatusBadge(atendimento.status)}
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(atendimento.created_at), "dd/MM HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Chat Area */}
            <Card className="lg:col-span-2">
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">
                      {atendimentos.find(a => a.id === selectedAtendimentoId)?.clientes?.nome || "Selecione um atendimento"}
                    </CardTitle>
                    {selectedAtendimentoId && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {atendimentos.find(a => a.id === selectedAtendimentoId)?.clientes?.telefone}
                      </p>
                    )}
                  </div>
                  {selectedAtendimentoId && getStatusBadge(atendimentos.find(a => a.id === selectedAtendimentoId)?.status || "")}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[550px] p-4" ref={scrollRef}>
                  {!selectedAtendimentoId ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <MessageSquare className="h-12 w-12 mb-4 opacity-50" />
                      <p>Selecione um atendimento para ver as mensagens</p>
                    </div>
                  ) : mensagens.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <Bot className="h-12 w-12 mb-4 opacity-50" />
                      <p>Nenhuma mensagem ainda</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {mensagens.map((mensagem) => (
                        <ChatMessage
                          key={mensagem.id}
                          remetenteTipo={mensagem.remetente_tipo}
                          conteudo={mensagem.conteudo}
                          createdAt={mensagem.created_at}
                        />
                      ))}
                      {isTyping && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground ml-11">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Cliente está digitando...</span>
                        </div>
                      )}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
