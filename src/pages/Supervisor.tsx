import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserCog, AlertCircle, Users, Loader2, TrendingUp, CheckCircle, Clock, BarChart3, MessageSquare, Inbox } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInHours } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Progress } from "@/components/ui/progress";
import { VendedorCard } from "@/components/supervisor/VendedorCard";
import { VendedorChatModal } from "@/components/supervisor/VendedorChatModal";
import { NaoAtribuidosCard } from "@/components/supervisor/NaoAtribuidosCard";
import { AtendimentoChatModal } from "@/components/supervisor/AtendimentoChatModal";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Vendedor {
  id: string;
  nome: string;
  email: string;
  especialidade_marca?: string;
  status_online?: boolean;
}

interface Atendimento {
  id: string;
  marca_veiculo: string;
  modelo_veiculo: string | null;
  ano_veiculo: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  vendedor_fixo_id: string | null;
  clientes: {
    nome: string;
    telefone: string;
  } | null;
  mensagens: Array<{
    conteudo: string;
    created_at: string;
    remetente_tipo: string;
  }>;
}

interface VendedorMetrics {
  vendedorId: string;
  nome: string;
  email: string;
  especialidade: string;
  totalAtendimentos: number;
  atendimentosAtivos: number;
  atendimentosEncerrados: number;
  taxaConversao: number;
  tempoMedioResposta: number;
  atendimentosPorStatus: Record<string, number>;
}

export default function Supervisor() {
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([]);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [vendedoresAtribuidos, setVendedoresAtribuidos] = useState<string[]>([]);
  const [metricas, setMetricas] = useState<VendedorMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMarca, setSelectedMarca] = useState<string | null>(null);
  const [selectedVendedor, setSelectedVendedor] = useState<Vendedor | null>(null);
  const [selectedNaoAtribuido, setSelectedNaoAtribuido] = useState<Atendimento | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  // Realtime subscription for vendedor status updates
  useEffect(() => {
    const channel = supabase
      .channel('config-vendedores-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'config_vendedores'
        },
        (payload) => {
          console.log('Status vendedor atualizado:', payload);
          
          // Update the vendedores list with new status
          setVendedores(prev => prev.map(v => {
            if (v.id === payload.new.usuario_id) {
              return {
                ...v,
                status_online: payload.new.status_online
              };
            }
            return v;
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([
      fetchSupervisorVendedores(),
      fetchAtendimentos(),
      fetchVendedores()
    ]);
    setLoading(false);
  };

  const fetchSupervisorVendedores = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get supervisor's usuario id
      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!usuarioData) return;

      // Get assigned vendedores
      const { data: assignments, error } = await supabase
        .from('vendedor_supervisor')
        .select('vendedor_id')
        .eq('supervisor_id', usuarioData.id);

      if (error) {
        console.error('Error fetching assigned vendedores:', error);
        return;
      }

      setVendedoresAtribuidos(assignments?.map(a => a.vendedor_id) || []);
    } catch (error) {
      console.error('Error in fetchSupervisorVendedores:', error);
    }
  };

  const fetchAtendimentos = async () => {
    const { data, error } = await supabase
      .from("atendimentos")
      .select(`
        *,
        clientes (nome, telefone),
        mensagens (conteudo, created_at, remetente_tipo)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching atendimentos:", error);
    } else {
      setAtendimentos(data || []);
    }
  };

  const fetchVendedores = async () => {
    const { data, error } = await supabase
      .from("usuarios")
      .select(`
        id,
        nome,
        email,
        config_vendedores (especialidade_marca, status_online)
      `)
      .eq("role", "vendedor");

    if (error) {
      console.error("Error fetching vendedores:", error);
    } else {
      const allVendedores = data?.map((v: any) => ({
        id: v.id,
        nome: v.nome,
        email: v.email,
        especialidade_marca: v.config_vendedores?.[0]?.especialidade_marca,
        status_online: v.config_vendedores?.[0]?.status_online || false,
      })) || [];
      
      setVendedores(allVendedores);
      calcularMetricas(allVendedores);
    }
  };

  const calcularMetricas = (vendedoresList: Vendedor[]) => {
    const filteredVendedores = vendedoresList.filter(v => vendedoresAtribuidos.includes(v.id));
    
    const metrics: VendedorMetrics[] = filteredVendedores.map(vendedor => {
        const atendimentosVendedor = atendimentos.filter(
          a => a.vendedor_fixo_id === vendedor.id
        );

        const totalAtendimentos = atendimentosVendedor.length;
        const atendimentosEncerrados = atendimentosVendedor.filter(
          a => a.status === 'encerrado'
        ).length;
        const atendimentosAtivos = totalAtendimentos - atendimentosEncerrados;
        const taxaConversao = totalAtendimentos > 0 
          ? (atendimentosEncerrados / totalAtendimentos) * 100 
          : 0;

        // Calcular tempo médio de resposta (em horas)
        const temposResposta = atendimentosVendedor.map(a => {
          const created = new Date(a.created_at);
          const updated = new Date(a.updated_at);
          return differenceInHours(updated, created);
        });
        const tempoMedioResposta = temposResposta.length > 0
          ? temposResposta.reduce((sum, t) => sum + t, 0) / temposResposta.length
          : 0;

        // Contar atendimentos por status
        const atendimentosPorStatus = atendimentosVendedor.reduce((acc, a) => {
          acc[a.status] = (acc[a.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        return {
          vendedorId: vendedor.id,
          nome: vendedor.nome,
          email: vendedor.email,
          especialidade: vendedor.especialidade_marca || 'Sem especialidade',
          totalAtendimentos,
          atendimentosAtivos,
          atendimentosEncerrados,
          taxaConversao,
          tempoMedioResposta,
          atendimentosPorStatus,
        };
      });

    setMetricas(metrics);
  };

  useEffect(() => {
    if (vendedores.length > 0 && vendedoresAtribuidos.length > 0) {
      calcularMetricas(vendedores);
    }
  }, [atendimentos, vendedores, vendedoresAtribuidos]);

  const atendimentosNaoAtribuidos = atendimentos.filter(
    (a) => !a.vendedor_fixo_id
  );

  const vendedoresFiltrados = vendedores.filter(v => 
    vendedoresAtribuidos.includes(v.id)
  );

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      ia_respondendo: { label: "IA Respondendo", className: "bg-blue-500" },
      aguardando_cliente: { label: "Aguardando Cliente", className: "bg-yellow-500" },
      vendedor_intervindo: { label: "Vendedor Intervindo", className: "bg-green-500" },
      aguardando_orcamento: { label: "Aguardando Orçamento", className: "bg-orange-500" },
      aguardando_fechamento: { label: "Aguardando Fechamento", className: "bg-purple-500" },
      encerrado: { label: "Encerrado", className: "bg-gray-500" },
    };

    const config = statusConfig[status] || { label: status, className: "bg-gray-500" };
    return (
      <Badge className={`${config.className} text-white`}>{config.label}</Badge>
    );
  };

  const getLastMessage = (mensagens: Atendimento["mensagens"]) => {
    if (!mensagens || mensagens.length === 0) return "Sem mensagens";
    const last = mensagens[mensagens.length - 1];
    return last.conteudo.substring(0, 50) + (last.conteudo.length > 50 ? "..." : "");
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary shadow-lg">
                <UserCog className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Painel do Supervisor</h1>
                <p className="text-muted-foreground">
                  Monitore atendimentos e gerencie a equipe
                </p>
              </div>
            </div>
          </div>
          <Badge className="bg-primary text-primary-foreground px-4 py-2 text-sm">
            Supervisor
          </Badge>
        </div>

        {loading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="dashboard" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="nao-atribuidos" className="gap-2 relative">
                <Inbox className="h-4 w-4" />
                Não Atribuídos
                {atendimentosNaoAtribuidos.length > 0 && (
                  <Badge className="ml-1 bg-amber-500 text-white text-xs px-1.5 py-0.5 min-w-[20px]">
                    {atendimentosNaoAtribuidos.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="dashboard" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="vendedores" className="gap-2">
                <Users className="h-4 w-4" />
                Vendedores ({vendedoresFiltrados.length})
              </TabsTrigger>
            </TabsList>

            {/* Não Atribuídos Tab */}
            <TabsContent value="nao-atribuidos" className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                      <Inbox className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Atendimentos Não Atribuídos</CardTitle>
                      <CardDescription>
                        Novos contatos aguardando classificação da IA para serem direcionados aos vendedores
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {atendimentosNaoAtribuidos.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <CheckCircle className="h-12 w-12 text-green-500/40 mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Todos os atendimentos estão atribuídos
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <ScrollArea className="h-[calc(100vh-320px)]">
                  <div className="space-y-3 pr-4">
                    {atendimentosNaoAtribuidos.map((atendimento) => (
                      <NaoAtribuidosCard
                        key={atendimento.id}
                        atendimento={atendimento}
                        onViewChat={(id) => {
                          const found = atendimentos.find(a => a.id === id);
                          if (found) setSelectedNaoAtribuido(found);
                        }}
                      />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>

            {/* Dashboard Tab */}
            <TabsContent value="dashboard" className="space-y-6">
              {/* Overview Cards */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total de Vendedores
                    </CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{vendedoresFiltrados.length}</div>
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
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
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
                    <div className="text-2xl font-bold">
                      {metricas.length > 0
                        ? (metricas.reduce((sum, m) => sum + m.tempoMedioResposta, 0) / metricas.length).toFixed(1)
                        : 0}h
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Resposta
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Detailed Metrics per Vendedor */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Desempenho Individual</h3>
                
                {metricas.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <BarChart3 className="h-12 w-12 text-muted-foreground/40 mb-3" />
                      <p className="text-sm text-muted-foreground">
                        Nenhum vendedor atribuído ainda
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  metricas.map((metrica) => (
                    <Card key={metrica.vendedorId}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-lg">{metrica.nome}</CardTitle>
                            <CardDescription>{metrica.especialidade}</CardDescription>
                          </div>
                          <Badge variant="outline" className="text-sm">
                            {metrica.totalAtendimentos} atendimentos
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Progress Bars */}
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Taxa de Conversão</span>
                              <span className="font-semibold">{metrica.taxaConversao.toFixed(1)}%</span>
                            </div>
                            <Progress value={metrica.taxaConversao} className="h-2" />
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="flex flex-col">
                              <span className="text-muted-foreground">Ativos</span>
                              <span className="text-lg font-semibold text-primary">
                                {metrica.atendimentosAtivos}
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-muted-foreground">Encerrados</span>
                              <span className="text-lg font-semibold text-success">
                                {metrica.atendimentosEncerrados}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Tempo Médio de Resposta</span>
                            <span className="font-semibold">{metrica.tempoMedioResposta.toFixed(1)}h</span>
                          </div>
                        </div>

                        {/* Status Breakdown */}
                        {Object.keys(metrica.atendimentosPorStatus).length > 0 && (
                          <div className="border-t pt-3">
                            <div className="text-sm font-medium mb-2">Atendimentos por Status</div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              {Object.entries(metrica.atendimentosPorStatus).map(([status, count]) => (
                                <div key={status} className="flex items-center justify-between p-2 rounded-md bg-muted/30">
                                  <span className="text-muted-foreground capitalize">
                                    {status.replace(/_/g, ' ')}
                                  </span>
                                  <Badge variant="secondary" className="text-xs">
                                    {count}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="vendedores" className="space-y-4">
              {vendedoresFiltrados.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Users className="h-12 w-12 text-muted-foreground/40 mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Nenhum vendedor atribuído a você
                    </p>
                  </CardContent>
                </Card>
              ) : (
                vendedoresFiltrados.map((vendedor) => (
                  <VendedorCard
                    key={vendedor.id}
                    vendedor={vendedor}
                    atendimentos={atendimentos}
                    getStatusBadge={getStatusBadge}
                    getLastMessage={getLastMessage}
                    onUpdate={fetchVendedores}
                  />
                ))
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* Modal do Chat para Não Atribuídos */}
        <AtendimentoChatModal
          atendimentoId={selectedNaoAtribuido?.id || null}
          clienteNome={selectedNaoAtribuido?.clientes?.nome || "Cliente"}
          veiculoInfo={selectedNaoAtribuido ? `${selectedNaoAtribuido.marca_veiculo || 'Não identificado'} ${selectedNaoAtribuido.modelo_veiculo || ''}`.trim() : ""}
          status={selectedNaoAtribuido?.status || ""}
          open={!!selectedNaoAtribuido}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedNaoAtribuido(null);
              fetchData();
            }
          }}
        />
      </div>
    </MainLayout>
  );
}
