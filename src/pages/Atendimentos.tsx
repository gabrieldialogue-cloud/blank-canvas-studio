import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, User, Bot, Phone, FileText, AlertCircle, CheckCircle2, RefreshCw, Shield, Package } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type DetailType = 
  | "ia_respondendo" 
  | "aguardando_cliente" 
  | "intervencao" 
  | "orcamentos" 
  | "ajuda_humana" 
  | "fechamento"
  | "pessoal_ativas"
  | "pessoal_respondidas"
  | "pessoal_aguardando"
  | "reembolso"
  | "garantia"
  | "troca";

export default function Atendimentos() {
  const [selectedDetail, setSelectedDetail] = useState<DetailType | null>(null);

  const getDetailTitle = (type: DetailType | null) => {
    if (!type) return "";
    const titles: Record<DetailType, string> = {
      ia_respondendo: "IA Respondendo",
      aguardando_cliente: "Aguardando Cliente",
      intervencao: "Intervenção Necessária",
      orcamentos: "Orçamentos Pendentes",
      ajuda_humana: "Ajuda Humana Solicitada",
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
      ajuda_humana: "Clientes que solicitaram atendimento humano direto",
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
            {/* Métricas Principais - Número Principal (IA) */}
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
              <Card 
                className="rounded-2xl border-secondary bg-gradient-to-br from-secondary/10 to-transparent shadow-md cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setSelectedDetail("ia_respondendo")}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm text-secondary">
                    <Bot className="h-4 w-4" />
                    IA Respondendo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-secondary">0</p>
                </CardContent>
              </Card>

              <Card 
                className="rounded-2xl border-altese-gray-medium bg-gradient-to-br from-altese-gray-light/20 to-transparent shadow-md cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setSelectedDetail("aguardando_cliente")}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm text-altese-gray-dark">
                    <MessageSquare className="h-4 w-4" />
                    Aguardando Cliente
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-altese-gray-dark">0</p>
                </CardContent>
              </Card>

              <Card 
                className="rounded-2xl border-success bg-gradient-to-br from-success/10 to-transparent shadow-md cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setSelectedDetail("intervencao")}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm text-success">
                    <User className="h-4 w-4" />
                    Intervenção
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-success">0</p>
                </CardContent>
              </Card>

              <Card 
                className="rounded-2xl border-accent bg-gradient-to-br from-accent/10 to-transparent shadow-md cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setSelectedDetail("orcamentos")}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm text-accent">
                    <FileText className="h-4 w-4" />
                    Orçamentos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-accent">0</p>
                </CardContent>
              </Card>

              <Card 
                className="rounded-2xl border-destructive bg-gradient-to-br from-destructive/10 to-transparent shadow-md cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setSelectedDetail("ajuda_humana")}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    Ajuda Humana
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-destructive">0</p>
                </CardContent>
              </Card>

              <Card 
                className="rounded-2xl border-primary bg-gradient-to-br from-primary/10 to-transparent shadow-md cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setSelectedDetail("fechamento")}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm text-primary">
                    <CheckCircle2 className="h-4 w-4" />
                    Fechamento
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-primary">0</p>
                </CardContent>
              </Card>
            </div>

            {/* Seção de Solicitações Especiais */}
            <Card className="rounded-2xl border-border bg-card shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Solicitações Especiais
                </CardTitle>
                <CardDescription>Casos que requerem atenção diferenciada</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-3">
                  <Card 
                    className="border-orange-500/50 bg-gradient-to-br from-orange-500/5 to-transparent cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelectedDetail("reembolso")}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-base text-orange-600 dark:text-orange-400">
                        <RefreshCw className="h-4 w-4" />
                        Reembolsos
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">0</p>
                      <p className="text-xs text-muted-foreground mt-1">Solicitações pendentes</p>
                    </CardContent>
                  </Card>

                  <Card 
                    className="border-blue-500/50 bg-gradient-to-br from-blue-500/5 to-transparent cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelectedDetail("garantia")}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-base text-blue-600 dark:text-blue-400">
                        <Shield className="h-4 w-4" />
                        Garantias
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">0</p>
                      <p className="text-xs text-muted-foreground mt-1">Acionamentos ativos</p>
                    </CardContent>
                  </Card>

                  <Card 
                    className="border-purple-500/50 bg-gradient-to-br from-purple-500/5 to-transparent cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelectedDetail("troca")}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-base text-purple-600 dark:text-purple-400">
                        <Package className="h-4 w-4" />
                        Trocas
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">0</p>
                      <p className="text-xs text-muted-foreground mt-1">Solicitações ativas</p>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Atendimentos Pessoais */}
          <TabsContent value="pessoal" className="space-y-6">
            {/* Métricas Principais - Número Pessoal */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card 
                className="rounded-2xl border-accent bg-gradient-to-br from-accent/10 to-transparent shadow-md cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setSelectedDetail("pessoal_ativas")}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm text-accent">
                    <MessageSquare className="h-4 w-4" />
                    Conversas Ativas
                  </CardTitle>
                  <CardDescription className="text-xs">Atendimentos diretos</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-accent">0</p>
                </CardContent>
              </Card>

              <Card 
                className="rounded-2xl border-success bg-gradient-to-br from-success/10 to-transparent shadow-md cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setSelectedDetail("pessoal_respondidas")}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm text-success">
                    <CheckCircle2 className="h-4 w-4" />
                    Respondidas
                  </CardTitle>
                  <CardDescription className="text-xs">Já atendidas</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-success">0</p>
                </CardContent>
              </Card>

              <Card 
                className="rounded-2xl border-altese-gray-medium bg-gradient-to-br from-altese-gray-light/20 to-transparent shadow-md cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setSelectedDetail("pessoal_aguardando")}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm text-altese-gray-dark">
                    <Phone className="h-4 w-4" />
                    Aguardando
                  </CardTitle>
                  <CardDescription className="text-xs">Esperando resposta</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-altese-gray-dark">0</p>
                </CardContent>
              </Card>
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

      {/* Dialog de Detalhes */}
      <Dialog open={!!selectedDetail} onOpenChange={() => setSelectedDetail(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{getDetailTitle(selectedDetail)}</DialogTitle>
            <DialogDescription>
              {getDetailDescription(selectedDetail)}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-6">
            <div className="rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 p-12 text-center">
              <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/40 mb-4" />
              <p className="text-base font-medium text-foreground mb-2">
                Nenhum dado disponível
              </p>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Quando houver atendimentos ou solicitações deste tipo, eles aparecerão aqui com informações detalhadas.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
