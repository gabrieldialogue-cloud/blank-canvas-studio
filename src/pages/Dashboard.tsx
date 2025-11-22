import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AtendimentoCard } from "@/components/atendimento/AtendimentoCard";
import { ChatInterface } from "@/components/chat/ChatInterface";

export default function Dashboard() {
  const [selectedAtendimento, setSelectedAtendimento] = useState<string | null>(null);

  // Placeholder data - will be replaced with real Supabase queries
  const atendimentosAtivos = [];
  const aguardandoOrcamento = [];
  const ajudaHumana = [];
  const aguardandoFechamento = [];

  const handleSendMessage = async (message: string) => {
    console.log("Sending message:", message);
    // TODO: Implement message sending with Supabase
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie todos os seus atendimentos em um só lugar
          </p>
        </div>

        <Tabs defaultValue="ativos" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
            <TabsTrigger value="ativos">
              IA Ativos ({atendimentosAtivos.length})
            </TabsTrigger>
            <TabsTrigger value="orcamentos">
              Orçamentos ({aguardandoOrcamento.length})
            </TabsTrigger>
            <TabsTrigger value="ajuda">
              Ajuda Humana ({ajudaHumana.length})
            </TabsTrigger>
            <TabsTrigger value="fechamento">
              Fechamento ({aguardandoFechamento.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ativos" className="space-y-4">
            {atendimentosAtivos.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center">
                <p className="text-muted-foreground">
                  Nenhum atendimento ativo no momento
                </p>
              </div>
            ) : (
              atendimentosAtivos.map((atendimento: any) => (
                <AtendimentoCard
                  key={atendimento.id}
                  {...atendimento}
                  onClick={() => setSelectedAtendimento(atendimento.id)}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="orcamentos" className="space-y-4">
            {aguardandoOrcamento.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center">
                <p className="text-muted-foreground">
                  Nenhum orçamento aguardando resposta
                </p>
              </div>
            ) : (
              aguardandoOrcamento.map((atendimento: any) => (
                <AtendimentoCard
                  key={atendimento.id}
                  {...atendimento}
                  onClick={() => setSelectedAtendimento(atendimento.id)}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="ajuda" className="space-y-4">
            {ajudaHumana.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center">
                <p className="text-muted-foreground">
                  Nenhuma solicitação de ajuda no momento
                </p>
              </div>
            ) : (
              ajudaHumana.map((atendimento: any) => (
                <AtendimentoCard
                  key={atendimento.id}
                  {...atendimento}
                  onClick={() => setSelectedAtendimento(atendimento.id)}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="fechamento" className="space-y-4">
            {aguardandoFechamento.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center">
                <p className="text-muted-foreground">
                  Nenhum pedido aguardando fechamento
                </p>
              </div>
            ) : (
              aguardandoFechamento.map((atendimento: any) => (
                <AtendimentoCard
                  key={atendimento.id}
                  {...atendimento}
                  onClick={() => setSelectedAtendimento(atendimento.id)}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {selectedAtendimento && (
        <ChatInterface
          atendimentoId={selectedAtendimento}
          clienteNome="Cliente"
          mensagens={[]}
          onClose={() => setSelectedAtendimento(null)}
          onSendMessage={handleSendMessage}
        />
      )}
    </MainLayout>
  );
}
