import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, User, Bot, Phone, FileText, CheckCircle2, RefreshCw, Shield, Package, ChevronDown, ChevronUp, Loader2, TrendingUp, Clock, BarChart3, AlertCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAtendimentos } from "@/hooks/useAtendimentos";
import { AtendimentoCard } from "@/components/atendimento/AtendimentoCard";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { format, differenceInHours } from "date-fns";
import { ptBR } from "date-fns/locale";
import { VendedorChatModal } from "@/components/supervisor/VendedorChatModal";

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
  const [expandedDetails, setExpandedDetails] = useState<Set<DetailType>>(new Set());
  const { atendimentos, loading, getAtendimentosByStatus } = useAtendimentos();
  const [isSupervisor, setIsSupervisor] = useState(false);
  const [vendedoresAtribuidos, setVendedoresAtribuidos] = useState<string[]>([]);
  const [metricas, setMetricas] = useState<any[]>([]);
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [selectedVendedorId, setSelectedVendedorId] = useState<string | null>(null);
  const [chatMensagens, setChatMensagens] = useState<any[]>([]);

  useEffect(() => {
    checkSupervisorRole();
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
    }
  }, [atendimentos, vendedoresAtribuidos, isSupervisor]);

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
            <TabsList className="grid w-full grid-cols-2 lg:w-[500px]">
              <TabsTrigger value="vendedores" className="gap-2">
                <User className="h-4 w-4" />
                Vendedores ({vendedores.length})
              </TabsTrigger>
              <TabsTrigger value="nao-atribuidos" className="gap-2">
                <AlertCircle className="h-4 w-4" />
                Não Atribuídos ({atendimentosNaoAtribuidos.length})
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
                            <CollapsibleTrigger className="w-full" onClick={() => {
                              const newId = isExpanded ? null : vendedor.id;
                              setSelectedVendedorId(newId);
                              if (newId) fetchVendedorMessages(newId);
                            }}>
                              <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <CardTitle className="text-base">{vendedor.nome}</CardTitle>
                                    <CardDescription className="text-xs">{vendedor.especialidade}</CardDescription>
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
                            <CollapsibleContent>
                              <div className="px-6 pb-6">
                                <VendedorChatModal
                                  vendedorId={vendedor.id}
                                  vendedorNome={vendedor.nome}
                                  embedded={true}
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
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : `${iaRespondendo.length} ativas`}
                    </Badge>
                    <Badge className="bg-gradient-to-r from-primary to-secondary text-white px-4 py-1">
                      Modo Visualização
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {loading ? (
                  <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-12 text-center">
                    <Loader2 className="mx-auto h-16 w-16 text-primary/40 mb-4 animate-spin" />
                    <p className="text-lg font-medium text-foreground mb-2">
                      Carregando atendimentos...
                    </p>
                  </div>
                ) : iaRespondendo.length === 0 ? (
                  <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-12 text-center">
                    <Bot className="mx-auto h-16 w-16 text-primary/40 mb-4" />
                    <p className="text-lg font-medium text-foreground mb-2">
                      Nenhum atendimento ativo no momento
                    </p>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                      Quando novos clientes entrarem em contato pelo WhatsApp, eles aparecerão aqui.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {iaRespondendo.map((atendimento) => (
                      <AtendimentoCard
                        key={atendimento.id}
                        id={atendimento.id}
                        clienteNome={atendimento.clientes?.nome || 'Cliente sem nome'}
                        marcaVeiculo={atendimento.marca_veiculo}
                        ultimaMensagem={atendimento.mensagens?.[atendimento.mensagens.length - 1]?.conteudo || 'Sem mensagens'}
                        status={atendimento.status as any}
                        updatedAt={atendimento.updated_at || atendimento.created_at || new Date().toISOString()}
                        onClick={() => {
                          // TODO: Abrir modal de chat
                          console.log('Abrir chat', atendimento.id);
                        }}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Seção de Prioridade 1 - Orçamentos e Fechamento */}
            <div className="grid gap-4 md:grid-cols-2">
              <Collapsible open={expandedDetails.has("orcamentos")} onOpenChange={() => toggleDetail("orcamentos")}>
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
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : aguardandoOrcamento.length}
                          </Badge>
                          {expandedDetails.has("orcamentos") ? (
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
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : aguardandoFechamento.length}
                          </Badge>
                          {expandedDetails.has("fechamento") ? (
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
                <div className="grid gap-3 md:grid-cols-4">
                  <Collapsible open={expandedDetails.has("reembolso")} onOpenChange={() => toggleDetail("reembolso")}>
                    <Card className="border-red-500/50 bg-gradient-to-br from-red-500/5 to-transparent hover:shadow-md transition-all duration-300 hover-scale">
                      <CollapsibleTrigger className="w-full text-left">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2 text-base text-red-600 dark:text-red-400">
                              <RefreshCw className="h-4 w-4" />
                              Reembolsos
                            </CardTitle>
                            {expandedDetails.has("reembolso") ? (
                              <ChevronUp className="h-4 w-4 text-red-600 dark:text-red-400 transition-transform duration-300" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-red-600 dark:text-red-400 transition-transform duration-300" />
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-2xl font-bold text-red-600 dark:text-red-400">0</p>
                        </CardContent>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="animate-accordion-down data-[state=closed]:animate-accordion-up">
                        <CardContent className="pt-2">
                          <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-center animate-fade-in">
                            <p className="text-xs text-muted-foreground">Nenhuma solicitação de reembolso</p>
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>

                  <Collapsible open={expandedDetails.has("garantia")} onOpenChange={() => toggleDetail("garantia")}>
                    <Card className="border-blue-500/50 bg-gradient-to-br from-blue-500/5 to-transparent hover:shadow-md transition-all duration-300 hover-scale">
                      <CollapsibleTrigger className="w-full text-left">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2 text-base text-blue-600 dark:text-blue-400">
                              <Shield className="h-4 w-4" />
                              Garantias
                            </CardTitle>
                            {expandedDetails.has("garantia") ? (
                              <ChevronUp className="h-4 w-4 text-blue-600 dark:text-blue-400 transition-transform duration-300" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-blue-600 dark:text-blue-400 transition-transform duration-300" />
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">0</p>
                        </CardContent>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="animate-accordion-down data-[state=closed]:animate-accordion-up">
                        <CardContent className="pt-2">
                          <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 text-center animate-fade-in">
                            <p className="text-xs text-muted-foreground">Nenhum acionamento de garantia</p>
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>

                  <Collapsible open={expandedDetails.has("troca")} onOpenChange={() => toggleDetail("troca")}>
                    <Card className="border-purple-500/50 bg-gradient-to-br from-purple-500/5 to-transparent hover:shadow-md transition-all duration-300 hover-scale">
                      <CollapsibleTrigger className="w-full text-left">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2 text-base text-purple-600 dark:text-purple-400">
                              <Package className="h-4 w-4" />
                              Trocas
                            </CardTitle>
                            {expandedDetails.has("troca") ? (
                              <ChevronUp className="h-4 w-4 text-purple-600 dark:text-purple-400 transition-transform duration-300" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-purple-600 dark:text-purple-400 transition-transform duration-300" />
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">0</p>
                        </CardContent>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="animate-accordion-down data-[state=closed]:animate-accordion-up">
                        <CardContent className="pt-2">
                          <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-3 text-center animate-fade-in">
                            <p className="text-xs text-muted-foreground">Nenhuma solicitação de troca</p>
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>

                  <Collapsible open={expandedDetails.has("resolvidos")} onOpenChange={() => toggleDetail("resolvidos")}>
                    <Card className="border-green-500/50 bg-gradient-to-br from-green-500/5 to-transparent hover:shadow-md transition-all duration-300 hover-scale">
                      <CollapsibleTrigger className="w-full text-left">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2 text-base text-green-600 dark:text-green-400">
                              <CheckCircle2 className="h-4 w-4" />
                              Resolvidos
                            </CardTitle>
                            {expandedDetails.has("resolvidos") ? (
                              <ChevronUp className="h-4 w-4 text-green-600 dark:text-green-400 transition-transform duration-300" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-green-600 dark:text-green-400 transition-transform duration-300" />
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-2xl font-bold text-green-600 dark:text-green-400">0</p>
                        </CardContent>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="animate-accordion-down data-[state=closed]:animate-accordion-up">
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
          </TabsContent>

          {/* Atendimentos Pessoais */}
          <TabsContent value="pessoal" className="space-y-6">
            {/* Métricas Principais - Número Pessoal */}
            <div className="grid gap-4 md:grid-cols-3">
              <Collapsible open={expandedDetails.has("pessoal_ativas")} onOpenChange={() => toggleDetail("pessoal_ativas")}>
                <Card className="rounded-2xl border-accent bg-gradient-to-br from-accent/10 to-transparent shadow-md hover:shadow-lg transition-all duration-300">
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
                  <CollapsibleContent className="animate-accordion-down data-[state=closed]:animate-accordion-up">
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
                  <CollapsibleContent className="animate-accordion-down data-[state=closed]:animate-accordion-up">
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
                  <CollapsibleContent className="animate-accordion-down data-[state=closed]:animate-accordion-up">
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
