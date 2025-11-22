import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Phone, Mail, Car, MessageSquare, Calendar, User, Edit, History, Filter } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { format, isAfter, isBefore, startOfDay, endOfDay, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ContactEditDialog } from "@/components/contatos/ContactEditDialog";
import { ContactHistoryDialog } from "@/components/contatos/ContactHistoryDialog";

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
    mensagens?: Array<{
      id: string;
      conteudo: string;
      remetente_tipo: string;
      created_at: string;
    }>;
  }>;
}

export default function Contatos() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [marcaFilter, setMarcaFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [viewingHistory, setViewingHistory] = useState<Cliente | null>(null);

  useEffect(() => {
    fetchClientes();
  }, []);

  const fetchClientes = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("clientes")
      .select(`
        *,
        atendimentos (
          id,
          marca_veiculo,
          modelo_veiculo,
          status,
          created_at,
          mensagens (
            id,
            conteudo,
            remetente_tipo,
            created_at
          )
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching clientes:", error);
    } else {
      setClientes(data || []);
    }
    setIsLoading(false);
  };

  // Get unique marcas for filter
  const uniqueMarcas = Array.from(
    new Set(
      clientes.flatMap((c) => c.atendimentos.map((a) => a.marca_veiculo)).filter((m) => m && m !== "A definir")
    )
  ).sort();

  const filteredClientes = clientes.filter((cliente) => {
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

    // Status filter
    if (statusFilter !== "all") {
      const hasStatus = cliente.atendimentos.some((a) => a.status === statusFilter);
      if (!hasStatus) return false;
    }

    // Date filter
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

    // Marca filter
    if (marcaFilter !== "all") {
      const hasMarca = cliente.atendimentos.some((a) => a.marca_veiculo === marcaFilter);
      if (!hasMarca) return false;
    }

    return true;
  });

  const getInitials = (nome: string) => {
    return nome
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
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

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Contatos</h1>
            <p className="text-muted-foreground">
              Todos os clientes e histórico completo de interações
            </p>
          </div>
          <Badge variant="secondary" className="text-lg px-4 py-2">
            {filteredClientes.length} de {clientes.length} {clientes.length === 1 ? "cliente" : "clientes"}
          </Badge>
        </div>

        {/* Search Bar */}
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
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

            {/* Advanced Filters */}
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

        {/* Contacts List */}
        <ScrollArea className="h-[calc(100vh-380px)]">
          <div className="grid gap-4">
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
                      : "Nenhum contato registrado ainda. Os contatos aparecerão aqui quando clientes iniciarem conversas."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredClientes.map((cliente) => (
                <Card key={cliente.id} className="hover:border-primary/50 transition-colors">
                  <CardHeader>
                    <div className="flex items-start gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {getInitials(cliente.nome)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-1">{cliente.nome}</CardTitle>
                        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5" />
                            {cliente.telefone}
                          </div>
                          {cliente.email && (
                            <div className="flex items-center gap-1">
                              <Mail className="h-3.5 w-3.5" />
                              {cliente.email}
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            Cliente desde {format(new Date(cliente.created_at), "dd/MM/yyyy", { locale: ptBR })}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingCliente(cliente)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setViewingHistory(cliente)}
                        >
                          <History className="h-4 w-4 mr-2" />
                          Histórico
                        </Button>
                      </div>
                      <Badge variant="outline">
                        <MessageSquare className="h-3 w-3 mr-1" />
                        {cliente.atendimentos.length} atendimento{cliente.atendimentos.length !== 1 ? "s" : ""}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {cliente.atendimentos.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground mb-2">Atendimentos Recentes:</p>
                        <div className="space-y-2">
                          {cliente.atendimentos.slice(0, 3).map((atendimento) => (
                            <div
                              key={atendimento.id}
                              className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                            >
                              <div className="flex items-center gap-3 flex-1">
                                <Car className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="text-sm font-medium">
                                    {atendimento.marca_veiculo}
                                    {atendimento.modelo_veiculo && ` ${atendimento.modelo_veiculo}`}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {format(new Date(atendimento.created_at), "dd/MM/yyyy 'às' HH:mm", {
                                      locale: ptBR,
                                    })}
                                  </p>
                                </div>
                              </div>
                              <Badge className={getStatusColor(atendimento.status)}>
                                {getStatusLabel(atendimento.status)}
                              </Badge>
                            </div>
                          ))}
                          {cliente.atendimentos.length > 3 && (
                            <p className="text-xs text-muted-foreground text-center pt-2">
                              + {cliente.atendimentos.length - 3} atendimento
                              {cliente.atendimentos.length - 3 !== 1 ? "s" : ""} anteriores
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Nenhum atendimento registrado ainda.</p>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Dialogs */}
      {editingCliente && (
        <ContactEditDialog
          open={!!editingCliente}
          onOpenChange={(open) => !open && setEditingCliente(null)}
          clienteId={editingCliente.id}
          currentNome={editingCliente.nome}
          currentEmail={editingCliente.email}
          onSuccess={fetchClientes}
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
    </MainLayout>
  );
}
