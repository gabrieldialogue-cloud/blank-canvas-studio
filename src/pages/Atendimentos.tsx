import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, User, Bot, Phone, FileText, CheckCircle2, RefreshCw, Shield, Package, ChevronDown, ChevronUp } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

type DetailType = 
  | "ia_respondendo" 
  | "aguardando_cliente" 
  | "intervencao" 
  | "orcamentos" 
  | "fechamento"
  | "pessoal_ativas"
  | "pessoal_respondidas"
  | "pessoal_aguardando"
  | "reembolso"
  | "garantia"
  | "troca";

export default function Atendimentos() {
  const [expandedDetail, setExpandedDetail] = useState<DetailType | null>(null);

  const toggleDetail = (type: DetailType) => {
    setExpandedDetail(expandedDetail === type ? null : type);
  };

  const getDetailTitle = (type: DetailType | null) => {
    if (!type) return "";
    const titles: Record<DetailType, string> = {
      ia_respondendo: "IA Respondendo",
      aguardando_cliente: "Aguardando Cliente",
      intervencao: "Intervenções Ativas",
      orcamentos: "Orçamentos Pendentes",
      fechamento: "Aguardando Fechamento",
      pessoal_ativas: "Conversas Ativas - Número Pessoal",
      pessoal_respondidas: "Conversas Respondidas",
      pessoal_aguardando: "Aguardando Resposta",
      reembolso: "Solicitações de Reembolso",
      garantia: "Solicitações de Garantia",
      troca: "Solicitações de Troca"
    };
    return titles[type];
  };

  const getDetailDescription = (type: DetailType | null) => {
    if (!type) return "";
    const descriptions: Record<DetailType, string> = {
      ia_respondendo: "Visualize as conversas sendo atendidas automaticamente pela IA",
      aguardando_cliente: "Conversas onde a IA está aguardando resposta do cliente",
      intervencao: "Casos que requerem ação imediata do vendedor",
      orcamentos: "Lista de orçamentos solicitados pelos clientes aguardando envio",
      fechamento: "Negociações em fase final aguardando confirmação",
      pessoal_ativas: "Conversas diretas com clientes no seu número pessoal",
      pessoal_respondidas: "Histórico de conversas que você já respondeu",
      pessoal_aguardando: "Clientes aguardando sua resposta no número pessoal",
      reembolso: "Solicitações de devolução de valores dos clientes",
      garantia: "Acionamentos de garantia de produtos",
      troca: "Solicitações de troca de produtos"
    };
    return descriptions[type];
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
            {/* Destaque Principal - IA Respondendo (Chat ao Vivo) */}
            <Card className="rounded-2xl border-primary bg-gradient-to-br from-primary/10 via-secondary/5 to-transparent shadow-xl">
              <CardHeader className="border-b border-primary/20 bg-gradient-to-r from-primary/10 to-secondary/10">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-3 text-2xl">
                      <Bot className="h-6 w-6 text-primary animate-pulse" />
                      IA Respondendo - Chat ao Vivo
                    </CardTitle>
                    <CardDescription className="mt-2 text-base">
                      Visualize as conversas sendo respondidas automaticamente em tempo real
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 px-4 py-2 text-lg font-bold">
                      0 ativas
                    </Badge>
                    <Badge className="bg-gradient-to-r from-primary to-secondary text-white px-4 py-1">
                      Modo Visualização
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-12 text-center">
                  <Bot className="mx-auto h-16 w-16 text-primary/40 mb-4" />
                  <p className="text-lg font-medium text-foreground mb-2">
                    Aguardando Integração com IA
                  </p>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Configure a integração com o agente IA e WhatsApp para visualizar conversas em tempo real aqui.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Seção de Prioridade 1 - Orçamentos e Fechamento */}
            <div className="grid gap-4 md:grid-cols-2">
              <Collapsible open={expandedDetail === "orcamentos"} onOpenChange={() => toggleDetail("orcamentos")}>
                <Card className="rounded-2xl border-accent bg-gradient-to-br from-accent/10 to-transparent shadow-lg hover:shadow-xl transition-shadow">
                  <CollapsibleTrigger className="w-full text-left">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-3 text-xl text-accent">
                          <FileText className="h-6 w-6" />
                          Orçamentos
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-accent/10 text-accent border-accent/30 text-lg font-bold px-3">
                            0
                          </Badge>
                          {expandedDetail === "orcamentos" ? (
                            <ChevronUp className="h-5 w-5 text-accent" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-accent" />
                          )}
                        </div>
                      </div>
                      <CardDescription>Solicitações de orçamento pendentes</CardDescription>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="rounded-lg border border-accent/20 bg-accent/5 p-6 text-center">
                        <FileText className="mx-auto h-10 w-10 text-accent/40 mb-3" />
                        <p className="text-sm text-muted-foreground">
                          Nenhum orçamento aguardando no momento
                        </p>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>

              <Collapsible open={expandedDetail === "fechamento"} onOpenChange={() => toggleDetail("fechamento")}>
                <Card className="rounded-2xl border-success bg-gradient-to-br from-success/10 to-transparent shadow-lg hover:shadow-xl transition-shadow">
                  <CollapsibleTrigger className="w-full text-left">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-3 text-xl text-success">
                          <CheckCircle2 className="h-6 w-6" />
                          Fechamento
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-lg font-bold px-3">
                            0
                          </Badge>
                          {expandedDetail === "fechamento" ? (
                            <ChevronUp className="h-5 w-5 text-success" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-success" />
                          )}
                        </div>
                      </div>
                      <CardDescription>Negociações aguardando confirmação final</CardDescription>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="rounded-lg border border-success/20 bg-success/5 p-6 text-center">
                        <CheckCircle2 className="mx-auto h-10 w-10 text-success/40 mb-3" />
                        <p className="text-sm text-muted-foreground">
                          Nenhum fechamento pendente no momento
                        </p>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            </div>

            {/* Métricas Secundárias */}
            <div className="grid gap-4 md:grid-cols-3">
              <Collapsible open={expandedDetail === "aguardando_cliente"} onOpenChange={() => toggleDetail("aguardando_cliente")}>
                <Card className="rounded-2xl border-border bg-gradient-to-br from-muted/30 to-transparent shadow-md hover:shadow-lg transition-shadow">
                  <CollapsibleTrigger className="w-full text-left">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-sm">
                          <MessageSquare className="h-4 w-4" />
                          Aguardando Cliente
                        </CardTitle>
                        {expandedDetail === "aguardando_cliente" ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold">0</p>
                    </CardContent>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-2">
                      <div className="rounded-lg border bg-muted/30 p-4 text-center">
                        <p className="text-xs text-muted-foreground">
                          Nenhum cliente aguardando resposta
                        </p>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>

              <Collapsible open={expandedDetail === "intervencao"} onOpenChange={() => toggleDetail("intervencao")}>
                <Card className="rounded-2xl border-orange-500/50 bg-gradient-to-br from-orange-500/10 to-transparent shadow-md hover:shadow-lg transition-shadow">
                  <CollapsibleTrigger className="w-full text-left">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400">
                          <User className="h-4 w-4" />
                          Intervenções Ativas
                        </CardTitle>
                        {expandedDetail === "intervencao" ? (
                          <ChevronUp className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">0</p>
                    </CardContent>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-2">
                      <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-4 text-center">
                        <p className="text-xs text-muted-foreground">
                          Nenhuma intervenção necessária no momento
                        </p>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            </div>

            {/* Seção de Solicitações Especiais */}
            <Card className="rounded-2xl border-border bg-card shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Solicitações Especiais
                </CardTitle>
                <CardDescription>Casos que requerem atenção diferenciada</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-3">
                  <Collapsible open={expandedDetail === "reembolso"} onOpenChange={() => toggleDetail("reembolso")}>
                    <Card className="border-red-500/50 bg-gradient-to-br from-red-500/5 to-transparent hover:shadow-md transition-shadow">
                      <CollapsibleTrigger className="w-full text-left">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2 text-base text-red-600 dark:text-red-400">
                              <RefreshCw className="h-4 w-4" />
                              Reembolsos
                            </CardTitle>
                            {expandedDetail === "reembolso" ? (
                              <ChevronUp className="h-4 w-4 text-red-600 dark:text-red-400" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-2xl font-bold text-red-600 dark:text-red-400">0</p>
                        </CardContent>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="pt-2">
                          <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-center">
                            <p className="text-xs text-muted-foreground">Nenhuma solicitação de reembolso</p>
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>

                  <Collapsible open={expandedDetail === "garantia"} onOpenChange={() => toggleDetail("garantia")}>
                    <Card className="border-blue-500/50 bg-gradient-to-br from-blue-500/5 to-transparent hover:shadow-md transition-shadow">
                      <CollapsibleTrigger className="w-full text-left">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2 text-base text-blue-600 dark:text-blue-400">
                              <Shield className="h-4 w-4" />
                              Garantias
                            </CardTitle>
                            {expandedDetail === "garantia" ? (
                              <ChevronUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">0</p>
                        </CardContent>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="pt-2">
                          <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 text-center">
                            <p className="text-xs text-muted-foreground">Nenhum acionamento de garantia</p>
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>

                  <Collapsible open={expandedDetail === "troca"} onOpenChange={() => toggleDetail("troca")}>
                    <Card className="border-purple-500/50 bg-gradient-to-br from-purple-500/5 to-transparent hover:shadow-md transition-shadow">
                      <CollapsibleTrigger className="w-full text-left">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2 text-base text-purple-600 dark:text-purple-400">
                              <Package className="h-4 w-4" />
                              Trocas
                            </CardTitle>
                            {expandedDetail === "troca" ? (
                              <ChevronUp className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">0</p>
                        </CardContent>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="pt-2">
                          <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-3 text-center">
                            <p className="text-xs text-muted-foreground">Nenhuma solicitação de troca</p>
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Atendimentos Pessoais */}
          <TabsContent value="pessoal" className="space-y-6">
            {/* Métricas Principais - Número Pessoal */}
            <div className="grid gap-4 md:grid-cols-3">
              <Collapsible open={expandedDetail === "pessoal_ativas"} onOpenChange={() => toggleDetail("pessoal_ativas")}>
                <Card className="rounded-2xl border-accent bg-gradient-to-br from-accent/10 to-transparent shadow-md hover:shadow-lg transition-shadow">
                  <CollapsibleTrigger className="w-full text-left">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2 text-sm text-accent">
                            <MessageSquare className="h-4 w-4" />
                            Conversas Ativas
                          </CardTitle>
                          <CardDescription className="text-xs">Atendimentos diretos</CardDescription>
                        </div>
                        {expandedDetail === "pessoal_ativas" ? (
                          <ChevronUp className="h-4 w-4 text-accent" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-accent" />
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold text-accent">0</p>
                    </CardContent>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-2">
                      <div className="rounded-lg border border-accent/20 bg-accent/5 p-4 text-center">
                        <p className="text-xs text-muted-foreground">
                          Nenhuma conversa ativa no momento
                        </p>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>

              <Collapsible open={expandedDetail === "pessoal_respondidas"} onOpenChange={() => toggleDetail("pessoal_respondidas")}>
                <Card className="rounded-2xl border-success bg-gradient-to-br from-success/10 to-transparent shadow-md hover:shadow-lg transition-shadow">
                  <CollapsibleTrigger className="w-full text-left">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2 text-sm text-success">
                            <CheckCircle2 className="h-4 w-4" />
                            Respondidas
                          </CardTitle>
                          <CardDescription className="text-xs">Já atendidas</CardDescription>
                        </div>
                        {expandedDetail === "pessoal_respondidas" ? (
                          <ChevronUp className="h-4 w-4 text-success" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-success" />
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold text-success">0</p>
                    </CardContent>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-2">
                      <div className="rounded-lg border border-success/20 bg-success/5 p-4 text-center">
                        <p className="text-xs text-muted-foreground">
                          Nenhuma conversa respondida ainda
                        </p>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>

              <Collapsible open={expandedDetail === "pessoal_aguardando"} onOpenChange={() => toggleDetail("pessoal_aguardando")}>
                <Card className="rounded-2xl border-border bg-gradient-to-br from-muted/20 to-transparent shadow-md hover:shadow-lg transition-shadow">
                  <CollapsibleTrigger className="w-full text-left">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2 text-sm">
                            <Phone className="h-4 w-4" />
                            Aguardando
                          </CardTitle>
                          <CardDescription className="text-xs">Esperando resposta</CardDescription>
                        </div>
                        {expandedDetail === "pessoal_aguardando" ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold">0</p>
                    </CardContent>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-2">
                      <div className="rounded-lg border bg-muted/30 p-4 text-center">
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
      </div>

    </MainLayout>
  );
}
