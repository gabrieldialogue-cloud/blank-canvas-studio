import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, Clock, CheckCircle2, RefreshCw, Shield, Package, ChevronDown, User, MessageSquare, Search, AlertCircle, X } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AtendimentoChatModal } from "@/components/supervisor/AtendimentoChatModal";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

type Atendimento = {
  id: string;
  status: string;
  marca_veiculo: string;
  modelo_veiculo?: string;
  ano_veiculo?: string;
  placa?: string;
  chassi?: string;
  resumo_necessidade?: string;
  created_at?: string;
  clientes: {
    nome: string;
    telefone: string;
  };
  mensagens: Array<{
    conteudo: string;
    created_at: string;
  }>;
};

type VendedorListas = {
  id: string;
  nome: string;
  email: string;
  orcamentos: Atendimento[];
  fechamento: Atendimento[];
  reembolsos: Atendimento[];
  garantias: Atendimento[];
  trocas: Atendimento[];
  resolvidos: Atendimento[];
};

type SortOption = 'date' | 'status' | 'priority';
type StatusFilter = 'all' | 'aguardando_orcamento' | 'aguardando_fechamento' | 'solicitacao_reembolso' | 'solicitacao_garantia' | 'solicitacao_troca' | 'resolvido';

export default function Orcamentos() {
  const [vendedores, setVendedores] = useState<VendedorListas[]>([]);
  const [loading, setLoading] = useState(true);
  const [openVendedores, setOpenVendedores] = useState<Set<string>>(new Set());
  const [openListas, setOpenListas] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAtendimento, setSelectedAtendimento] = useState<{
    id: string;
    clienteNome: string;
    veiculoInfo: string;
    status: string;
  } | null>(null);
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchVendedoresListas();
  }, []);

  const fetchVendedoresListas = async () => {
    try {
      setLoading(true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get supervisor's usuario_id
      const { data: supervisorData } = await supabase
        .from('usuarios')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!supervisorData) return;

      // Get assigned vendedores
      const { data: vendedoresAtribuidos } = await supabase
        .from('vendedor_supervisor')
        .select(`
          vendedor_id,
          usuarios!vendedor_supervisor_vendedor_id_fkey (
            id,
            nome,
            email
          )
        `)
        .eq('supervisor_id', supervisorData.id);

      if (!vendedoresAtribuidos) return;

      // Fetch atendimentos for each vendedor
      const vendedoresComListas = await Promise.all(
        vendedoresAtribuidos.map(async (v: any) => {
          const vendedor = v.usuarios;
          
          const { data: atendimentos } = await supabase
            .from('atendimentos')
            .select(`
              *,
              clientes (nome, telefone),
              mensagens (conteudo, created_at)
            `)
            .eq('vendedor_fixo_id', vendedor.id)
            .order('created_at', { ascending: false });

          const atendimentosArray = (atendimentos || []) as Atendimento[];

          return {
            id: vendedor.id,
            nome: vendedor.nome,
            email: vendedor.email,
            orcamentos: atendimentosArray.filter(a => a.status === 'aguardando_orcamento'),
            fechamento: atendimentosArray.filter(a => a.status === 'aguardando_fechamento'),
            reembolsos: atendimentosArray.filter(a => a.status === 'solicitacao_reembolso'),
            garantias: atendimentosArray.filter(a => a.status === 'solicitacao_garantia'),
            trocas: atendimentosArray.filter(a => a.status === 'solicitacao_troca'),
            resolvidos: atendimentosArray.filter(a => a.status === 'resolvido'),
          };
        })
      );

      setVendedores(vendedoresComListas);
    } catch (error) {
      console.error('Erro ao buscar listas:', error);
      toast({
        title: "Erro ao carregar listas",
        description: "Não foi possível carregar as listas dos vendedores",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleVendedor = (vendedorId: string) => {
    setOpenVendedores(prev => {
      const newSet = new Set(prev);
      if (newSet.has(vendedorId)) {
        newSet.delete(vendedorId);
      } else {
        newSet.add(vendedorId);
      }
      return newSet;
    });
  };

  const toggleLista = (listaId: string) => {
    setOpenListas(prev => {
      const newSet = new Set(prev);
      if (newSet.has(listaId)) {
        newSet.delete(listaId);
      } else {
        newSet.add(listaId);
      }
      return newSet;
    });
  };

  const getTimeSinceLastMessage = (atendimento: Atendimento): number => {
    const lastMessageDate = atendimento.mensagens?.[0]?.created_at || atendimento.created_at;
    if (!lastMessageDate) return 0;
    return Date.now() - new Date(lastMessageDate).getTime();
  };

  const getPriorityLevel = (atendimento: Atendimento): 'high' | 'medium' | 'low' => {
    const timeSinceLastMessage = getTimeSinceLastMessage(atendimento);
    const hoursWaiting = timeSinceLastMessage / (1000 * 60 * 60);
    
    if (hoursWaiting > 24) return 'high';
    if (hoursWaiting > 12) return 'medium';
    return 'low';
  };

  const filterAndSortAtendimentos = (items: Atendimento[]) => {
    let filtered = [...items];
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.clientes?.nome.toLowerCase().includes(query) ||
        item.marca_veiculo.toLowerCase().includes(query) ||
        item.modelo_veiculo?.toLowerCase().includes(query) ||
        item.placa?.toLowerCase().includes(query)
      );
    }
    
    // Sort
    if (sortBy === 'date') {
      filtered.sort((a, b) => {
        const dateA = a.mensagens?.[0]?.created_at || a.created_at || '';
        const dateB = b.mensagens?.[0]?.created_at || b.created_at || '';
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      });
    } else if (sortBy === 'status') {
      filtered.sort((a, b) => a.status.localeCompare(b.status));
    } else if (sortBy === 'priority') {
      filtered.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[getPriorityLevel(a)] - priorityOrder[getPriorityLevel(b)];
      });
    }
    
    return filtered;
  };

  const handleOpenChat = (atendimento: Atendimento) => {
    setSelectedAtendimento({
      id: atendimento.id,
      clienteNome: atendimento.clientes?.nome || 'Cliente',
      veiculoInfo: `${atendimento.marca_veiculo} ${atendimento.modelo_veiculo || ''}`.trim(),
      status: atendimento.status,
    });
    setChatModalOpen(true);
  };

  const getPriorityBadge = (priority: 'high' | 'medium' | 'low') => {
    const config = {
      high: { label: 'Alta Prioridade', color: 'bg-destructive/10 text-destructive border-destructive', icon: AlertCircle },
      medium: { label: 'Média Prioridade', color: 'bg-accent/10 text-accent border-accent', icon: Clock },
      low: { label: 'Baixa Prioridade', color: 'bg-muted text-muted-foreground border-muted-foreground', icon: Clock },
    };
    
    const { label, color, icon: Icon } = config[priority];
    return (
      <Badge variant="outline" className={`${color} text-xs`}>
        <Icon className="h-3 w-3 mr-1" />
        {label}
      </Badge>
    );
  };

  const ListaSection = ({ 
    title, 
    icon: Icon, 
    items, 
    color,
    vendedorId,
    listaKey
  }: { 
    title: string; 
    icon: any; 
    items: Atendimento[]; 
    color: string;
    vendedorId: string;
    listaKey: string;
  }) => {
    const listaId = `${vendedorId}-${listaKey}`;
    const isOpen = openListas.has(listaId);
    const filteredItems = filterAndSortAtendimentos(items);

    return (
      <Collapsible open={isOpen} onOpenChange={() => toggleLista(listaId)}>
        <Card className={`border-${color} bg-gradient-to-br from-${color}/5 to-transparent`}>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardTitle className={`flex items-center justify-between text-${color}`}>
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5" />
                  {title}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className={`bg-${color}/10 text-${color}`}>
                    {filteredItems.length}/{items.length}
                  </Badge>
                  <ChevronDown 
                    className={`h-4 w-4 transition-transform ${isOpen ? 'transform rotate-180' : ''}`}
                  />
                </div>
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          
          {items.length > 0 && (
            <CollapsibleContent>
              <CardContent>
                {filteredItems.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    Nenhum atendimento encontrado com os filtros aplicados
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {filteredItems.map((item) => {
                        const priority = getPriorityLevel(item);
                        const timeSinceLastMessage = getTimeSinceLastMessage(item);
                        const lastMessageDate = item.mensagens?.[0]?.created_at || item.created_at;
                        
                        return (
                        <Card key={item.id} className={`p-4 bg-background border transition-colors ${
                          priority === 'high' ? 'border-destructive/50 hover:border-destructive' : 
                          priority === 'medium' ? 'border-accent/50 hover:border-accent' : 
                          'border-border hover:border-primary/50'
                        }`}>
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <p className="font-semibold text-foreground text-lg">{item.clientes?.nome}</p>
                                <p className="text-sm text-muted-foreground">
                                  {item.clientes?.telefone}
                                </p>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                {getPriorityBadge(priority)}
                                <Badge variant="outline" className={`text-${color} border-${color}`}>
                                  {item.status.replace(/_/g, ' ')}
                                </Badge>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>
                                Última atividade: {lastMessageDate ? formatDistanceToNow(new Date(lastMessageDate), { addSuffix: true, locale: ptBR }) : 'N/A'}
                              </span>
                            </div>
                          
                          <div className="pt-2 border-t border-border/50">
                            <p className="text-sm font-medium text-foreground">
                              Veículo: {item.marca_veiculo} {item.modelo_veiculo}
                            </p>
                            {item.ano_veiculo && (
                              <p className="text-xs text-muted-foreground">Ano: {item.ano_veiculo}</p>
                            )}
                            {item.placa && (
                              <p className="text-xs text-muted-foreground">Placa: {item.placa}</p>
                            )}
                          </div>

                          {item.resumo_necessidade && (
                            <div className="pt-2 border-t border-border/50">
                              <p className="text-xs font-medium text-muted-foreground uppercase">Resumo:</p>
                              <p className="text-sm text-foreground">{item.resumo_necessidade}</p>
                            </div>
                          )}

                          {item.mensagens && item.mensagens.length > 0 && (
                            <div className="pt-2 border-t border-border/50">
                              <p className="text-xs font-medium text-muted-foreground uppercase mb-1">
                                Última Mensagem:
                              </p>
                              <p className="text-sm text-foreground line-clamp-2">
                                {item.mensagens[0]?.conteudo}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(item.mensagens[0]?.created_at).toLocaleString('pt-BR')}
                              </p>
                            </div>
                          )}

                          <div className="pt-2 border-t border-border/50">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenChat(item)}
                              className="w-full"
                            >
                              <MessageSquare className="h-4 w-4 mr-2" />
                              Ver Chat Completo
                            </Button>
                           </div>
                         </div>
                       </Card>
                         );
                       })}
                     </div>
                   </ScrollArea>
                 )}
               </CardContent>
            </CollapsibleContent>
          )}
        </Card>
      </Collapsible>
    );
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Listas</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie as listas de atendimentos de cada vendedor
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filtros e Busca</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Buscar</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cliente, veículo ou placa..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-9"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                      onClick={() => setSearchQuery('')}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Filtrar por Status</label>
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Status</SelectItem>
                    <SelectItem value="aguardando_orcamento">Aguardando Orçamento</SelectItem>
                    <SelectItem value="aguardando_fechamento">Aguardando Fechamento</SelectItem>
                    <SelectItem value="solicitacao_reembolso">Solicitação Reembolso</SelectItem>
                    <SelectItem value="solicitacao_garantia">Solicitação Garantia</SelectItem>
                    <SelectItem value="solicitacao_troca">Solicitação Troca</SelectItem>
                    <SelectItem value="resolvido">Resolvido</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Ordenar por</label>
                <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Data (Mais Recente)</SelectItem>
                    <SelectItem value="priority">Prioridade</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(searchQuery || statusFilter !== 'all') && (
              <div className="mt-4 flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  Filtros ativos
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                  }}
                  className="h-7"
                >
                  <X className="h-3 w-3 mr-1" />
                  Limpar filtros
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {loading ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">Carregando vendedores...</p>
            </CardContent>
          </Card>
        ) : vendedores.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">Nenhum vendedor atribuído</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {vendedores.map((vendedor) => (
              <Collapsible
                key={vendedor.id}
                open={openVendedores.has(vendedor.id)}
                onOpenChange={() => toggleVendedor(vendedor.id)}
              >
                <Card>
                  <CollapsibleTrigger className="w-full">
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div className="text-left">
                            <CardTitle className="text-lg">{vendedor.nome}</CardTitle>
                            <CardDescription>{vendedor.email}</CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex gap-2">
                            <Badge variant="secondary">{vendedor.orcamentos.length} orçamentos</Badge>
                            <Badge variant="secondary">{vendedor.fechamento.length} fechamentos</Badge>
                          </div>
                          <ChevronDown 
                            className={`h-5 w-5 text-muted-foreground transition-transform ${
                              openVendedores.has(vendedor.id) ? 'transform rotate-180' : ''
                            }`} 
                          />
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <CardContent className="space-y-4 pt-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <ListaSection
                          title="Orçamentos em Espera"
                          icon={FileText}
                          items={vendedor.orcamentos}
                          color="accent"
                          vendedorId={vendedor.id}
                          listaKey="orcamentos"
                        />
                        
                        <ListaSection
                          title="Aguardando Fechamento"
                          icon={CheckCircle2}
                          items={vendedor.fechamento}
                          color="success"
                          vendedorId={vendedor.id}
                          listaKey="fechamento"
                        />
                      </div>

                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-3">
                          Solicitações Especiais
                        </h3>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                          <ListaSection
                            title="Reembolsos"
                            icon={RefreshCw}
                            items={vendedor.reembolsos}
                            color="destructive"
                            vendedorId={vendedor.id}
                            listaKey="reembolsos"
                          />
                          
                          <ListaSection
                            title="Garantias"
                            icon={Shield}
                            items={vendedor.garantias}
                            color="primary"
                            vendedorId={vendedor.id}
                            listaKey="garantias"
                          />
                          
                          <ListaSection
                            title="Trocas"
                            icon={Package}
                            items={vendedor.trocas}
                            color="secondary"
                            vendedorId={vendedor.id}
                            listaKey="trocas"
                          />
                          
                          <ListaSection
                            title="Resolvidos"
                            icon={CheckCircle2}
                            items={vendedor.resolvidos}
                            color="success"
                            vendedorId={vendedor.id}
                            listaKey="resolvidos"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}
          </div>
        )}
      </div>

      {selectedAtendimento && (
        <AtendimentoChatModal
          atendimentoId={selectedAtendimento.id}
          clienteNome={selectedAtendimento.clienteNome}
          veiculoInfo={selectedAtendimento.veiculoInfo}
          status={selectedAtendimento.status}
          open={chatModalOpen}
          onOpenChange={setChatModalOpen}
        />
      )}
    </MainLayout>
  );
}
