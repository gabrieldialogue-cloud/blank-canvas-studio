import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ClientAvatar } from "@/components/ui/client-avatar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Phone, Mail, Car, MessageSquare, Calendar, User, Edit, History, Filter, Trash2, ChevronDown, ChevronRight, Users } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { format, isAfter, isBefore, startOfDay, endOfDay, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ContactEditDialog } from "@/components/contatos/ContactEditDialog";
import { ContactHistoryDialog } from "@/components/contatos/ContactHistoryDialog";
import { DeleteContactDialog } from "@/components/contatos/DeleteContactDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Vendedor {
  id: string;
  nome: string;
  especialidade_marca: string;
}

interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  email: string | null;
  created_at: string;
  atendimentos: Array<{
    id: string;
    marca_veiculo: string;
    modelo_veiculo: string | null;
    status: string;
    created_at: string;
    vendedor_fixo_id: string | null;
    mensagens?: Array<{
      id: string;
      conteudo: string;
      remetente_tipo: string;
      created_at: string;
    }>;
  }>;
}

interface GroupedData {
  [marca: string]: {
    [vendedorId: string]: {
      vendedor: Vendedor;
      clientes: Cliente[];
    };
  };
}

export default function SupervisorContatos() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [marcaFilter, setMarcaFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [viewingHistory, setViewingHistory] = useState<Cliente | null>(null);
  const [deletingCliente, setDeletingCliente] = useState<Cliente | null>(null);
  const [expandedMarcas, setExpandedMarcas] = useState<Set<string>>(new Set());
  const [expandedVendedores, setExpandedVendedores] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    
    // Get current supervisor's ID
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get supervisor's usuario record
    const { data: supervisorUsuario } = await supabase
      .from("usuarios")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!supervisorUsuario) {
      setIsLoading(false);
      return;
    }

    // Get vendedores assigned to this supervisor
    const { data: assignments } = await supabase
      .from("vendedor_supervisor")
      .select(`
        vendedor_id,
        vendedor:usuarios!vendedor_supervisor_vendedor_id_fkey (
          id,
          nome
        )
      `)
      .eq("supervisor_id", supervisorUsuario.id);

    const vendedorIds = assignments?.map(a => a.vendedor_id) || [];

    // Get config_vendedores for especialidade_marca
    const { data: configs } = await supabase
      .from("config_vendedores")
      .select("usuario_id, especialidade_marca")
      .in("usuario_id", vendedorIds);

    const vendedoresData: Vendedor[] = assignments?.map(a => {
      const config = configs?.find(c => c.usuario_id === a.vendedor_id);
      return {
        id: a.vendedor_id,
        nome: (a.vendedor as any)?.nome || "Vendedor",
        especialidade_marca: config?.especialidade_marca || "Sem marca"
      };
    }) || [];

    setVendedores(vendedoresData);

    // Get all clients with atendimentos assigned to these vendedores
    const { data: assignedAtendimentos, error: assignedError } = await supabase
      .from("atendimentos")
      .select(`
        id,
        marca_veiculo,
        modelo_veiculo,
        status,
        created_at,
        vendedor_fixo_id,
        cliente:clientes (
          id,
          nome,
          telefone,
          email,
          created_at
        ),
        mensagens (
          id,
          conteudo,
          remetente_tipo,
          created_at
        )
      `)
      .in("vendedor_fixo_id", vendedorIds)
      .order("created_at", { ascending: false });

    // Also get unassigned contacts (vendedor_fixo_id is null)
    const { data: unassignedAtendimentos, error: unassignedError } = await supabase
      .from("atendimentos")
      .select(`
        id,
        marca_veiculo,
        modelo_veiculo,
        status,
        created_at,
        vendedor_fixo_id,
        cliente:clientes (
          id,
          nome,
          telefone,
          email,
          created_at
        ),
        mensagens (
          id,
          conteudo,
          remetente_tipo,
          created_at
        )
      `)
      .is("vendedor_fixo_id", null)
      .order("created_at", { ascending: false });

    if (assignedError || unassignedError) {
      console.error("Error fetching data:", assignedError || unassignedError);
      setIsLoading(false);
      return;
    }

    // Combine all atendimentos
    const atendimentos = [...(assignedAtendimentos || []), ...(unassignedAtendimentos || [])];

    // Group atendimentos by cliente
    const clientesMap = new Map<string, Cliente>();
    
    atendimentos?.forEach(atendimento => {
      const cliente = atendimento.cliente as any;
      if (!cliente) return;

      if (!clientesMap.has(cliente.id)) {
        clientesMap.set(cliente.id, {
          ...cliente,
          atendimentos: []
        });
      }
      
      clientesMap.get(cliente.id)?.atendimentos.push({
        id: atendimento.id,
        marca_veiculo: atendimento.marca_veiculo,
        modelo_veiculo: atendimento.modelo_veiculo,
        status: atendimento.status || "",
        created_at: atendimento.created_at || "",
        vendedor_fixo_id: atendimento.vendedor_fixo_id,
        mensagens: atendimento.mensagens as any[]
      });
    });

    setClientes(Array.from(clientesMap.values()));
    setIsLoading(false);
  };

  // Get unique marcas for filter
  const uniqueMarcas = Array.from(
    new Set(vendedores.map(v => v.especialidade_marca).filter(m => m && m !== "Sem marca"))
  ).sort();

  // Filter clients
  const filterCliente = (cliente: Cliente): boolean => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      cliente.nome.toLowerCase().includes(searchLower) ||
      cliente.telefone.includes(searchLower) ||
      cliente.email?.toLowerCase().includes(searchLower) ||
      cliente.atendimentos.some(
        (a) =>
          a.marca_veiculo?.toLowerCase().includes(searchLower) ||
          a.modelo_veiculo?.toLowerCase().includes(searchLower)
      );

    if (!matchesSearch) return false;

    if (statusFilter !== "all") {
      const hasStatus = cliente.atendimentos.some((a) => a.status === statusFilter);
      if (!hasStatus) return false;
    }

    if (dateFilter !== "all") {
      const now = new Date();
      const hasRecentAtendimento = cliente.atendimentos.some((a) => {
        const atendimentoDate = new Date(a.created_at);
        switch (dateFilter) {
          case "today":
            return isAfter(atendimentoDate, startOfDay(now)) && isBefore(atendimentoDate, endOfDay(now));
          case "week":
            return isAfter(atendimentoDate, subDays(now, 7));
          case "month":
            return isAfter(atendimentoDate, subDays(now, 30));
          default:
            return true;
        }
      });
      if (!hasRecentAtendimento) return false;
    }

    if (marcaFilter !== "all") {
      const hasMarca = cliente.atendimentos.some((a) => a.marca_veiculo === marcaFilter);
      if (!hasMarca) return false;
    }

    return true;
  };

  const filteredClientes = clientes.filter(filterCliente);

  // Group clients by marca > vendedor
  const groupedData: GroupedData = {};
  
  vendedores.forEach(vendedor => {
    const marca = vendedor.especialidade_marca;
    if (!groupedData[marca]) {
      groupedData[marca] = {};
    }
    groupedData[marca][vendedor.id] = {
      vendedor,
      clientes: []
    };
  });

  filteredClientes.forEach(cliente => {
    cliente.atendimentos.forEach(atendimento => {
      if (atendimento.vendedor_fixo_id) {
        const vendedor = vendedores.find(v => v.id === atendimento.vendedor_fixo_id);
        if (vendedor) {
          const marca = vendedor.especialidade_marca;
          if (groupedData[marca]?.[vendedor.id]) {
            // Avoid duplicates
            if (!groupedData[marca][vendedor.id].clientes.find(c => c.id === cliente.id)) {
              groupedData[marca][vendedor.id].clientes.push(cliente);
            }
          }
        }
      }
    });
  });

  const toggleMarca = (marca: string) => {
    const newSet = new Set(expandedMarcas);
    if (newSet.has(marca)) {
      newSet.delete(marca);
    } else {
      newSet.add(marca);
    }
    setExpandedMarcas(newSet);
  };

  const toggleVendedor = (vendedorId: string) => {
    const newSet = new Set(expandedVendedores);
    if (newSet.has(vendedorId)) {
      newSet.delete(vendedorId);
    } else {
      newSet.add(vendedorId);
    }
    setExpandedVendedores(newSet);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      ia_respondendo: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      aguardando_cliente: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      vendedor_intervindo: "bg-purple-500/10 text-purple-500 border-purple-500/20",
      aguardando_orcamento: "bg-orange-500/10 text-orange-500 border-orange-500/20",
      aguardando_fechamento: "bg-green-500/10 text-green-500 border-green-500/20",
      encerrado: "bg-gray-500/10 text-gray-500 border-gray-500/20",
    };
    return colors[status] || "bg-gray-500/10 text-gray-500";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      ia_respondendo: "IA Respondendo",
      aguardando_cliente: "Aguardando Cliente",
      vendedor_intervindo: "Vendedor Intervindo",
      aguardando_orcamento: "Aguardando Orçamento",
      aguardando_fechamento: "Aguardando Fechamento",
      encerrado: "Encerrado",
    };
    return labels[status] || status;
  };

  const hasActiveFilters = statusFilter !== "all" || dateFilter !== "all" || marcaFilter !== "all";

  const ClienteCard = ({ cliente }: { cliente: Cliente }) => (
    <Card className="hover:border-primary/50 transition-colors">
      <CardHeader className="py-3">
        <div className="flex items-start gap-3">
          <ClientAvatar name={cliente.nome} imageUrl={null} className="h-10 w-10" />
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base mb-1">{cliente.nome}</CardTitle>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {cliente.telefone}
              </div>
              {cliente.email && (
                <div className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {cliente.email}
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingCliente(cliente)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewingHistory(cliente)}>
              <History className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeletingCliente(cliente)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 pb-3">
        {cliente.atendimentos.length > 0 && (
          <div className="space-y-1.5">
            {cliente.atendimentos.slice(0, 2).map((atendimento) => (
              <div key={atendimento.id} className="flex items-center justify-between p-2 rounded-md border bg-muted/30 text-sm">
                <div className="flex items-center gap-2">
                  <Car className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{atendimento.marca_veiculo}{atendimento.modelo_veiculo && ` ${atendimento.modelo_veiculo}`}</span>
                </div>
                <Badge variant="outline" className={`text-xs ${getStatusColor(atendimento.status)}`}>
                  {getStatusLabel(atendimento.status)}
                </Badge>
              </div>
            ))}
            {cliente.atendimentos.length > 2 && (
              <p className="text-xs text-muted-foreground text-center">
                + {cliente.atendimentos.length - 2} atendimento(s)
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <MainLayout>
      <div className="space-y-6 h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Contatos</h1>
            <p className="text-muted-foreground">
              Contatos dos vendedores sob sua supervisão
            </p>
          </div>
          <Badge variant="secondary" className="text-lg px-4 py-2">
            {filteredClientes.length} contato{filteredClientes.length !== 1 ? "s" : ""}
          </Badge>
        </div>

        {/* Search Bar */}
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5 shrink-0">
          <CardContent className="pt-6 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, telefone, email, marca ou modelo..."
                className="pl-10 bg-background/50"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Filtros:</span>
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="ia_respondendo">IA Respondendo</SelectItem>
                  <SelectItem value="aguardando_cliente">Aguardando Cliente</SelectItem>
                  <SelectItem value="vendedor_intervindo">Vendedor Intervindo</SelectItem>
                  <SelectItem value="aguardando_orcamento">Aguardando Orçamento</SelectItem>
                  <SelectItem value="aguardando_fechamento">Aguardando Fechamento</SelectItem>
                  <SelectItem value="encerrado">Encerrado</SelectItem>
                </SelectContent>
              </Select>

              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os períodos</SelectItem>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="week">Últimos 7 dias</SelectItem>
                  <SelectItem value="month">Últimos 30 dias</SelectItem>
                </SelectContent>
              </Select>

              <Select value={marcaFilter} onValueChange={setMarcaFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Marca" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as marcas</SelectItem>
                  {uniqueMarcas.map((marca) => (
                    <SelectItem key={marca} value={marca}>
                      {marca}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStatusFilter("all");
                    setDateFilter("all");
                    setMarcaFilter("all");
                  }}
                >
                  Limpar filtros
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="hierarchy" className="flex-1 flex flex-col min-h-0">
          <TabsList className="shrink-0">
            <TabsTrigger value="hierarchy">Por Hierarquia</TabsTrigger>
            <TabsTrigger value="all">Todos os Contatos</TabsTrigger>
          </TabsList>

          {/* Hierarchy View */}
          <TabsContent value="hierarchy" className="flex-1 min-h-0 mt-4">
            <ScrollArea className="h-full">
              {isLoading ? (
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-muted-foreground">Carregando contatos...</p>
                  </CardContent>
                </Card>
              ) : Object.keys(groupedData).length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="pt-6 text-center">
                    <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">
                      Nenhum vendedor atribuído a você ainda.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {Object.entries(groupedData).map(([marca, vendedoresData]) => {
                    const totalContatos = Object.values(vendedoresData).reduce((sum, v) => sum + v.clientes.length, 0);
                    const isMarcaExpanded = expandedMarcas.has(marca);
                    
                    return (
                      <Card key={marca} className="overflow-hidden">
                        <Collapsible open={isMarcaExpanded} onOpenChange={() => toggleMarca(marca)}>
                          <CollapsibleTrigger asChild>
                            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  {isMarcaExpanded ? (
                                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                                  ) : (
                                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                  )}
                                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <Car className="h-5 w-5 text-primary" />
                                  </div>
                                  <div>
                                    <CardTitle className="text-lg">{marca}</CardTitle>
                                    <p className="text-sm text-muted-foreground">
                                      {Object.keys(vendedoresData).length} vendedor(es) • {totalContatos} contato(s)
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </CardHeader>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <CardContent className="pt-0 space-y-3">
                              {Object.entries(vendedoresData).map(([vendedorId, { vendedor, clientes: vendedorClientes }]) => {
                                const isVendedorExpanded = expandedVendedores.has(vendedorId);
                                
                                return (
                                  <Card key={vendedorId} className="border-dashed">
                                    <Collapsible open={isVendedorExpanded} onOpenChange={() => toggleVendedor(vendedorId)}>
                                      <CollapsibleTrigger asChild>
                                        <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors py-2">
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                              {isVendedorExpanded ? (
                                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                              ) : (
                                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                              )}
                                              <User className="h-4 w-4 text-muted-foreground" />
                                              <span className="font-medium">{vendedor.nome}</span>
                                            </div>
                                            <Badge variant="outline">
                                              {vendedorClientes.length} contato(s)
                                            </Badge>
                                          </div>
                                        </CardHeader>
                                      </CollapsibleTrigger>
                                      <CollapsibleContent>
                                        <CardContent className="pt-0 pb-3">
                                          {vendedorClientes.length === 0 ? (
                                            <p className="text-sm text-muted-foreground text-center py-4">
                                              Nenhum contato atribuído
                                            </p>
                                          ) : (
                                            <div className="grid gap-3 md:grid-cols-2">
                                              {vendedorClientes.map(cliente => (
                                                <ClienteCard key={cliente.id} cliente={cliente} />
                                              ))}
                                            </div>
                                          )}
                                        </CardContent>
                                      </CollapsibleContent>
                                    </Collapsible>
                                  </Card>
                                );
                              })}
                            </CardContent>
                          </CollapsibleContent>
                        </Collapsible>
                      </Card>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* All Contacts View */}
          <TabsContent value="all" className="flex-1 min-h-0 mt-4">
            <ScrollArea className="h-full">
              {isLoading ? (
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-muted-foreground">Carregando contatos...</p>
                  </CardContent>
                </Card>
              ) : filteredClientes.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="pt-6 text-center">
                    <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">
                      {searchTerm || hasActiveFilters
                        ? "Nenhum contato encontrado com esses critérios."
                        : "Nenhum contato registrado ainda."}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredClientes.map((cliente) => (
                    <ClienteCard key={cliente.id} cliente={cliente} />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      {editingCliente && (
        <ContactEditDialog
          open={!!editingCliente}
          onOpenChange={(open) => !open && setEditingCliente(null)}
          clienteId={editingCliente.id}
          currentNome={editingCliente.nome}
          currentEmail={editingCliente.email}
          onSuccess={fetchData}
        />
      )}

      {viewingHistory && (
        <ContactHistoryDialog
          open={!!viewingHistory}
          onOpenChange={(open) => !open && setViewingHistory(null)}
          clienteNome={viewingHistory.nome}
          atendimentos={viewingHistory.atendimentos}
        />
      )}

      {deletingCliente && (
        <DeleteContactDialog
          open={!!deletingCliente}
          onOpenChange={(open) => !open && setDeletingCliente(null)}
          clienteId={deletingCliente.id}
          clienteNome={deletingCliente.nome}
          onSuccess={() => {
            fetchData();
            setDeletingCliente(null);
          }}
        />
      )}
    </MainLayout>
  );
}
