import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, User, Bot, Phone, FileText, AlertCircle, CheckCircle2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { AtendimentoCard } from "@/components/atendimento/AtendimentoCard";
import { ChatInterface } from "@/components/chat/ChatInterface";

export default function Atendimentos() {
  const [selectedAtendimento, setSelectedAtendimento] = useState<string | null>(null);

  // Placeholder data
  const atendimentosAtivos = [];
  const aguardandoOrcamento = [];
  const ajudaHumana = [];
  const aguardandoFechamento = [];

  const handleSendMessage = async (message: string) => {
    console.log("Sending message:", message);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Atendimentos ao Vivo</h1>
          <p className="text-muted-foreground mt-2">
            Visualize atendimentos do número principal (IA) e seu número pessoal (direto)
          </p>
        </div>

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
            <div className="grid gap-6 md:grid-cols-3">
              <Card className="rounded-2xl border-secondary bg-gradient-to-br from-secondary/10 to-transparent shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-secondary">
                    <Bot className="h-5 w-5" />
                    IA Respondendo
                  </CardTitle>
                  <CardDescription>Atendimentos automáticos ativos</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold text-secondary">0</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Aguardando integração com agente IA
                  </p>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-altese-gray-medium bg-gradient-to-br from-altese-gray-light/20 to-transparent shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-altese-gray-dark">
                    <MessageSquare className="h-5 w-5" />
                    Aguardando Cliente
                  </CardTitle>
                  <CardDescription>Esperando resposta</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold text-altese-gray-dark">0</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Nenhum cliente aguardando
                  </p>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-success bg-gradient-to-br from-success/10 to-transparent shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-success">
                    <User className="h-5 w-5" />
                    Intervenção Necessária
                  </CardTitle>
                  <CardDescription>Requer ação do vendedor</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold text-success">0</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Nenhuma intervenção pendente
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card className="rounded-2xl border-primary/30 bg-gradient-to-br from-primary/5 to-transparent shadow-lg">
              <CardHeader className="border-b border-primary/10 bg-gradient-to-r from-primary/5 to-secondary/5">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Bot className="h-5 w-5 text-primary" />
                      Conversas IA em Tempo Real
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Visualize apenas - a IA está respondendo automaticamente
                    </CardDescription>
                  </div>
                  <Badge className="bg-gradient-to-r from-primary to-secondary text-white">
                    Modo Visualização
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-12 text-center">
                  <Bot className="mx-auto h-16 w-16 text-primary/40 mb-4" />
                  <p className="text-lg font-medium text-foreground mb-2">
                    Aguardando Integração
                  </p>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Configure a integração com o agente IA e WhatsApp na tela de{" "}
                    <span className="font-semibold text-primary">Super Admin</span> para
                    visualizar as conversas automáticas aqui.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Seções de Gerenciamento */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="rounded-2xl border-accent/50 bg-gradient-to-br from-accent/5 to-transparent">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="h-5 w-5 text-accent" />
                    Orçamentos ({aguardandoOrcamento.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {aguardandoOrcamento.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nenhum orçamento aguardando
                    </p>
                  ) : (
                    aguardandoOrcamento.map((atendimento: any) => (
                      <AtendimentoCard
                        key={atendimento.id}
                        {...atendimento}
                        onClick={() => setSelectedAtendimento(atendimento.id)}
                      />
                    ))
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-destructive/50 bg-gradient-to-br from-destructive/5 to-transparent">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <AlertCircle className="h-5 w-5 text-destructive" />
                    Ajuda Humana ({ajudaHumana.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {ajudaHumana.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nenhuma solicitação de ajuda
                    </p>
                  ) : (
                    ajudaHumana.map((atendimento: any) => (
                      <AtendimentoCard
                        key={atendimento.id}
                        {...atendimento}
                        onClick={() => setSelectedAtendimento(atendimento.id)}
                      />
                    ))
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-success/50 bg-gradient-to-br from-success/5 to-transparent">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <CheckCircle2 className="h-5 w-5 text-success" />
                    Fechamento ({aguardandoFechamento.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {aguardandoFechamento.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nenhum fechamento pendente
                    </p>
                  ) : (
                    aguardandoFechamento.map((atendimento: any) => (
                      <AtendimentoCard
                        key={atendimento.id}
                        {...atendimento}
                        onClick={() => setSelectedAtendimento(atendimento.id)}
                      />
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Atendimentos Pessoais */}
          <TabsContent value="pessoal" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-3">
              <Card className="rounded-2xl border-accent bg-gradient-to-br from-accent/10 to-transparent shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-accent">
                    <MessageSquare className="h-5 w-5" />
                    Conversas Ativas
                  </CardTitle>
                  <CardDescription>Atendimentos diretos com você</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold text-accent">0</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Aguardando integração WhatsApp
                  </p>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-success bg-gradient-to-br from-success/10 to-transparent shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-success">
                    <User className="h-5 w-5" />
                    Respondidas
                  </CardTitle>
                  <CardDescription>Conversas que você respondeu</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold text-success">0</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Nenhuma conversa ainda
                  </p>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-altese-gray-medium bg-gradient-to-br from-altese-gray-light/20 to-transparent shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-altese-gray-dark">
                    <Phone className="h-5 w-5" />
                    Aguardando Resposta
                  </CardTitle>
                  <CardDescription>Clientes esperando</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold text-altese-gray-dark">0</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Nenhum cliente aguardando
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card className="rounded-2xl border-accent/30 bg-gradient-to-br from-accent/5 to-transparent shadow-lg">
              <CardHeader className="border-b border-accent/10 bg-gradient-to-r from-accent/5 to-success/5">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Phone className="h-5 w-5 text-accent" />
                      Suas Conversas Diretas
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Atendimentos do seu número pessoal (sem IA)
                    </CardDescription>
                  </div>
                  <Badge className="bg-gradient-to-r from-accent to-success text-white">
                    Direto com Cliente
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="rounded-xl border-2 border-dashed border-accent/30 bg-accent/5 p-12 text-center">
                  <Phone className="mx-auto h-16 w-16 text-accent/40 mb-4" />
                  <p className="text-lg font-medium text-foreground mb-2">
                    Configure seu Número Pessoal
                  </p>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Conecte seu número pessoal do WhatsApp em{" "}
                    <span className="font-semibold text-accent">Configurações</span> para
                    receber e responder mensagens diretamente dos clientes aqui.
                  </p>
                </div>
              </CardContent>
            </Card>
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
