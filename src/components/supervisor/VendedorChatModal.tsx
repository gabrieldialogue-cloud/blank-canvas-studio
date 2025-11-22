import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "@/components/chat/ChatMessage";

interface VendedorChatModalProps {
  vendedorId: string;
  vendedorNome: string;
  embedded?: boolean;
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

export function VendedorChatModal({ vendedorId, vendedorNome, embedded = false }: VendedorChatModalProps) {
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([]);
  const [selectedAtendimentoId, setSelectedAtendimentoId] = useState<string | null>(null);
  const [mensagens, setMensagens] = useState<Message[]>([]);

  useEffect(() => {
    fetchAtendimentos();
  }, [vendedorId]);

  useEffect(() => {
    if (selectedAtendimentoId) {
      fetchMensagens(selectedAtendimentoId);
    }
  }, [selectedAtendimentoId]);

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
