import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AtendimentoCard } from "@/components/atendimento/AtendimentoCard";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { MessageSquare, FileText, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function Dashboard() {
  const [selectedAtendimento, setSelectedAtendimento] = useState<string | null>(null);
  const [vendedorId, setVendedorId] = useState<string | null>(null);

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
          <TabsList className="grid w-full grid-cols-4 lg:w-[700px]">
            <TabsTrigger value="ativos" className="data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground">
              IA Ativos ({atendimentosAtivos.length})
            </TabsTrigger>
            <TabsTrigger value="orcamentos" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
              Orçamentos ({aguardandoOrcamento.length})
            </TabsTrigger>
            <TabsTrigger value="ajuda" className="data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground">
              Ajuda Humana ({ajudaHumana.length})
            </TabsTrigger>
            <TabsTrigger value="fechamento" className="data-[state=active]:bg-success data-[state=active]:text-success-foreground">
              Fechamento ({aguardandoFechamento.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ativos" className="space-y-4">
            {atendimentosAtivos.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed border-altese-gray-medium bg-altese-gray-light/50 p-12 text-center">
                <MessageSquare className="mx-auto h-12 w-12 text-altese-gray-medium mb-4" />
                <p className="text-altese-gray-dark font-medium">
                  Nenhum atendimento ativo no momento
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Novos atendimentos aparecerão aqui automaticamente
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
              <div className="rounded-lg border-2 border-dashed border-accent/50 bg-accent/10 p-12 text-center">
                <FileText className="mx-auto h-12 w-12 text-accent mb-4" />
                <p className="text-accent font-medium">
                  Nenhum orçamento aguardando resposta
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Orçamentos solicitados aparecerão aqui
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
              <div className="rounded-lg border-2 border-dashed border-destructive/50 bg-destructive/10 p-12 text-center">
                <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
                <p className="text-destructive font-medium">
                  Nenhuma solicitação de ajuda no momento
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Casos que exigem intervenção humana aparecerão aqui
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
              <div className="rounded-lg border-2 border-dashed border-success/50 bg-success/10 p-12 text-center">
                <CheckCircle2 className="mx-auto h-12 w-12 text-success mb-4" />
                <p className="text-success font-medium">
                  Nenhum pedido aguardando fechamento
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Clientes prontos para finalizar a compra aparecerão aqui
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
          clienteTelefone=""
          mensagens={[]}
          onClose={() => setSelectedAtendimento(null)}
          onSendMessage={handleSendMessage}
          vendedorId={vendedorId || undefined}
        />
      )}
    </MainLayout>
  );
}
