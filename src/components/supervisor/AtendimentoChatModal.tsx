import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface Message {
  id: string;
  remetente_tipo: "ia" | "cliente" | "vendedor" | "supervisor";
  conteudo: string;
  created_at: string;
}

interface AtendimentoChatModalProps {
  atendimentoId: string | null;
  clienteNome: string;
  veiculoInfo: string;
  status: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AtendimentoChatModal({
  atendimentoId,
  clienteNome,
  veiculoInfo,
  status,
  open,
  onOpenChange,
}: AtendimentoChatModalProps) {
  const [mensagens, setMensagens] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (atendimentoId && open) {
      fetchMensagens();

      console.log(`📡 Modal: Configurando subscription para atendimento ${atendimentoId}`);

      // Setup realtime subscription for new messages (INSERT)
      const channel = supabase
        .channel(`atendimento-chat-modal-${atendimentoId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'mensagens',
            filter: `atendimento_id=eq.${atendimentoId}`
          },
          (payload) => {
            console.log('🟢 Modal: Nova mensagem recebida (INSERT):', payload);
            const newMessage = payload.new as Message;
            
            // Check if message already exists to avoid duplicates
            setMensagens((prev) => {
              const exists = prev.some(msg => msg.id === newMessage.id);
              if (exists) {
                console.log('⚠️ Modal: Mensagem duplicada ignorada:', newMessage.id);
                return prev;
              }
              console.log('✅ Modal: Adicionando nova mensagem ao estado');
              return [...prev, newMessage];
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
            console.log('🔄 Modal: Mensagem atualizada (UPDATE):', payload);
            const updatedMessage = payload.new as Message;
            
            setMensagens((prev) => 
              prev.map(msg => msg.id === updatedMessage.id ? updatedMessage : msg)
            );
          }
        )
        .subscribe((status) => {
          console.log('📡 Modal: Status da subscription de mensagens:', status);
        });

      return () => {
        console.log('🔌 Modal: Desconectando subscription');
        supabase.removeChannel(channel);
      };
    }
  }, [atendimentoId, open]);

  const fetchMensagens = async () => {
    if (!atendimentoId) return;

    setLoading(true);
    const { data } = await supabase
      .from("mensagens")
      .select("*")
      .eq('atendimento_id', atendimentoId)
      .order("created_at", { ascending: true });

    if (data) {
      setMensagens(data as Message[]);
    }
    setLoading(false);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
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

        {loading ? (
          <div className="flex items-center justify-center h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-4">
              {mensagens.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  Nenhuma mensagem ainda
                </div>
              ) : (
                mensagens.map((mensagem) => (
                  <ChatMessage
                    key={mensagem.id}
                    remetenteTipo={mensagem.remetente_tipo}
                    conteudo={mensagem.conteudo}
                    createdAt={mensagem.created_at}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
