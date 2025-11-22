import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, Loader2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { Badge } from "@/components/ui/badge";

interface VendedorChatModalProps {
  vendedorId: string;
  vendedorNome: string;
  embedded?: boolean;
  onNewMessage?: () => void;
}

interface Message {
  id: string;
  remetente_tipo: "ia" | "cliente" | "vendedor" | "supervisor";
  conteudo: string;
  created_at: string;
}

interface Atendimento {
  id: string;
  marca_veiculo: string;
  clientes: {
    nome: string;
  } | null;
}

export function VendedorChatModal({ vendedorId, vendedorNome, embedded = false, onNewMessage }: VendedorChatModalProps) {
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([]);
  const [selectedAtendimentoId, setSelectedAtendimentoId] = useState<string | null>(null);
  const [mensagens, setMensagens] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize notification sound
  useEffect(() => {
    audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSyA0fPTgjMGG2S36+eVSAwNU6zn77BdGAg+jdXvzHksBidzy/DajkILFFu06+qmVBELSKXh8r5uIQUsgs/z1YUyBhtmtvDnjUYOCFCr5O+zdxoJPY/W8sx5LQYme8rx2o1BB\
xVbta7qpVURDEik4fO+biEFLILP89WGMgYcZrjv6YxGDQhRq+Tvs3caCT2P1/LMeS0GJnvL8dmNQQcVW7Su6qRUEQxIpOHzvm4hBSyDz/PVhjIGHGa57+mMRg0IUKvk77N3Ggk9j9fyzHktBiZ7y/HZjUEHFVu0ruqkVBEMSKTh875uIQUsgs/z1YUyBhxmue/pjEYNCFCr5O+zdxoJPY/X8sx5LQYme8vx2Y1BBxVatK7qpFQRDEik4fO+biEFLILP89WFMgYcZrnv6YxGDQhQq+Tvs3caCT2P1/LMeS0GJnvL8dmNQQcVWrSu6qRUEQxIpOHzvm4hBSyCz/PVhTIGHGa57+mMRg0IUKvk77N3Ggk9j9fyzHktBiZ7y/HZjUEHFVq0ruqkVBEMSKTh875uIQUsgs/z1YUyBhxmue/pjEYNCFCr5O+zdxoJPY/X8sx5LQYme8vx2Y1BBxVatK7qpFQRDEik4fO+biEFLILP89WFMgYcZrnv6YxGDQhQq+Tvs3caCT2P1/LMeS0GJnvL8dmNQQcVWrSu6qRUEQxIpOHzvm4hBSyCz/PVhTIGHGa57+mMRg0IUKvk77N3Ggk9j9fyzHktBiZ7y/HZjUEHFVq0ruqkVBEMSKTh875uIQUsgs/z1YUyBhxmue/pjEYNCFCr5O+zdxoJPY/X8sx5LQYme8vx2Y1BBxVatK7qpFQRDEik4fO+biEFLILP89WFMgYcZrnv6YxGDQhQq+Tvs3caCT2P1/LMeS0GJnvL8dmNQQcVWrSu6qRUEQxIpOHzvm4hBSyC');
  }, []);

  // Track typing status via Realtime
  useEffect(() => {
    const channel = supabase.channel(`typing:${vendedorId}`);
    
    channel
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.vendedorId === vendedorId && payload.isTyping) {
          setIsTyping(true);
          
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
          }
          
          typingTimeoutRef.current = setTimeout(() => {
            setIsTyping(false);
          }, 3000);
        }
      })
      .subscribe();

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [vendedorId]);

  useEffect(() => {
    fetchAtendimentos();
  }, [vendedorId]);

  useEffect(() => {
    if (selectedAtendimentoId) {
      fetchMensagens(selectedAtendimentoId);
      
      console.log(`📡 Supervisor: Configurando subscription para atendimento ${selectedAtendimentoId}`);
      
      // Setup realtime subscription for new messages (INSERT)
      const channel = supabase
        .channel(`mensagens-realtime-supervisor-${selectedAtendimentoId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'mensagens',
            filter: `atendimento_id=eq.${selectedAtendimentoId}`
          },
          (payload) => {
            console.log('🟢 Supervisor: Nova mensagem recebida (INSERT):', payload);
            const newMessage = payload.new as Message;
            
            // Check if message already exists to avoid duplicates
            setMensagens((prev) => {
              const exists = prev.some(msg => msg.id === newMessage.id);
              if (exists) {
                console.log('⚠️ Supervisor: Mensagem duplicada ignorada:', newMessage.id);
                return prev;
              }
              console.log('✅ Supervisor: Adicionando nova mensagem ao estado');
              return [...prev, newMessage];
            });
            
            // Play notification sound if message is from vendedor or cliente
            if (newMessage.remetente_tipo === 'vendedor' || newMessage.remetente_tipo === 'cliente') {
              console.log('🔊 Supervisor: Tocando som de notificação');
              audioRef.current?.play().catch(err => console.log('Audio play failed:', err));
              onNewMessage?.();
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'mensagens',
            filter: `atendimento_id=eq.${selectedAtendimentoId}`
          },
          (payload) => {
            console.log('🔄 Supervisor: Mensagem atualizada (UPDATE):', payload);
            const updatedMessage = payload.new as Message;
            
            setMensagens((prev) => 
              prev.map(msg => msg.id === updatedMessage.id ? updatedMessage : msg)
            );
          }
        )
        .subscribe((status) => {
          console.log('📡 Supervisor: Status da subscription de mensagens:', status);
        });

      return () => {
        console.log('🔌 Supervisor: Desconectando subscription');
        supabase.removeChannel(channel);
      };
    }
  }, [selectedAtendimentoId, onNewMessage]);

  const fetchAtendimentos = async () => {
    const { data } = await supabase
      .from("atendimentos")
      .select(`
        id,
        marca_veiculo,
        clientes (nome)
      `)
      .eq('vendedor_fixo_id', vendedorId)
      .neq('status', 'encerrado')
      .order("created_at", { ascending: false });
    
    if (data && data.length > 0) {
      setAtendimentos(data);
      setSelectedAtendimentoId(data[0].id);
    }
  };

  const fetchMensagens = async (atendimentoId: string) => {
    const { data } = await supabase
      .from("mensagens")
      .select("*")
      .eq('atendimento_id', atendimentoId)
      .order("created_at", { ascending: true });
    
    if (data) {
      setMensagens(data as Message[]);
    }
  };

  return (
    <div className="space-y-4">
      {atendimentos.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
          <MessageSquare className="h-12 w-12 mb-4 opacity-50" />
          <p>Nenhum atendimento ativo para este vendedor</p>
        </div>
      ) : (
        <Tabs value={selectedAtendimentoId || ""} onValueChange={setSelectedAtendimentoId}>
          <TabsList className="w-full justify-start overflow-x-auto bg-muted">
            {atendimentos.map((atendimento) => (
              <TabsTrigger key={atendimento.id} value={atendimento.id} className="flex-shrink-0">
                {atendimento.clientes?.nome || "Cliente"} - {atendimento.marca_veiculo}
              </TabsTrigger>
            ))}
          </TabsList>

          {atendimentos.map((atendimento) => (
            <TabsContent key={atendimento.id} value={atendimento.id}>
              <Card>
                <CardContent className="p-4">
                  <ScrollArea className="h-[350px] pr-4">
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
                          <span>{vendedorNome} está digitando...</span>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
