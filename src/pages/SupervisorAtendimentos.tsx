import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Users, Loader2, ChevronLeft, ChevronRight, User, Phone, Search, Tag } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AtendimentoChatModal } from "@/components/supervisor/AtendimentoChatModal";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  placa: string | null;
  resumo_necessidade: string | null;
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

export default function SupervisorAtendimentos() {
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([]);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [vendedoresAtribuidos, setVendedoresAtribuidos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMarca, setSelectedMarca] = useState<string | null>(null);
  const [selectedVendedor, setSelectedVendedor] = useState<Vendedor | null>(null);
  const [selectedAtendimento, setSelectedAtendimento] = useState<Atendimento | null>(null);
  
  // Estados para busca
  const [searchMarca, setSearchMarca] = useState("");
  const [searchVendedor, setSearchVendedor] = useState("");
  
  // Estados para controlar colunas colapsadas
  const [collapsedColumns, setCollapsedColumns] = useState({
    marcas: false,
    vendedores: true,
    chat: true
  });

  const toggleColumn = (column: keyof typeof collapsedColumns) => {
    setCollapsedColumns(prev => {
      const newState = { ...prev };
      const isCurrentlyCollapsed = prev[column];
      
      if (isCurrentlyCollapsed) {
        // Abrindo uma coluna
        if (column === 'vendedores' && !selectedMarca) {
          return prev; // Não permite abrir vendedores sem marca selecionada
        }
        if (column === 'chat' && !selectedVendedor) {
          return prev; // Não permite abrir chat sem vendedor selecionado
        }
        
        // Se abrindo Marcas, fechar Vendedores e Chat obrigatoriamente
        if (column === 'marcas') {
          return {
            marcas: false,
            vendedores: true,
            chat: true
          };
        }
        
        // Se abrindo Vendedores, fechar Marcas obrigatoriamente
        if (column === 'vendedores') {
          return {
            marcas: true,
            vendedores: false,
            chat: prev.chat
          };
        }
        
        // Se abrindo Chat, sem restrições especiais
        if (column === 'chat') {
          newState[column] = false;
        }
      } else {
        // Fechando uma coluna - não permite fechar se é a única coluna aberta
        const openColumns = Object.values(prev).filter(v => !v).length;
        if (openColumns <= 1) {
          return prev;
        }
        
        newState[column] = true;
      }
      
      return newState;
    });
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Realtime subscription for vendedor status updates
  useEffect(() => {
    const channel = supabase
      .channel('config-vendedores-changes-atendimentos')
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
    }
  };

  const vendedoresFiltrados = vendedores.filter(v => 
    vendedoresAtribuidos.includes(v.id)
  );

  // Fetch atendimentos do vendedor selecionado para mostrar no card de contato
  const atendimentosDoVendedor = selectedVendedor 
    ? atendimentos.filter(a => a.vendedor_fixo_id === selectedVendedor.id)
    : [];

  // Filtrar marcas com busca
  const marcasFiltradas = Array.from(
    new Set(
      vendedoresFiltrados
        .map(v => v.especialidade_marca)
        .filter(Boolean)
    )
  ).sort().filter(marca => 
    marca?.toLowerCase().includes(searchMarca.toLowerCase())
  );

  // Filtrar vendedores com busca
  const vendedoresFiltradosPorBusca = vendedoresFiltrados
    .filter(v => v.especialidade_marca === selectedMarca)
    .filter(v => 
      v.nome.toLowerCase().includes(searchVendedor.toLowerCase()) ||
      v.email.toLowerCase().includes(searchVendedor.toLowerCase())
    );

  // Calcular largura das colunas
  const getColumnStyle = (column: keyof typeof collapsedColumns) => {
    if (collapsedColumns[column]) {
      return { width: '60px', minWidth: '60px', flexShrink: 0 };
    }
    
    // Marcas: max 280px
    if (column === 'marcas') {
      return { 
        width: '280px',
        maxWidth: '280px',
        minWidth: '280px',
        flexShrink: 0
      };
    }
    
    // Vendedores: max 320px
    if (column === 'vendedores') {
      return { 
        width: '320px',
        maxWidth: '320px',
        minWidth: '320px',
        flexShrink: 0
      };
    }
    
    // Chat: ocupa o resto do espaço
    return { 
      flex: 1, 
      minWidth: 0
    };
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Atendimentos</h1>
            <p className="text-muted-foreground">
              Acompanhe os atendimentos dos seus vendedores em tempo real
            </p>
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
          <div className="flex gap-4 w-full">
            {/* Column 1: Marcas */}
            <Card style={getColumnStyle('marcas')} className={`transition-all duration-300 ${collapsedColumns.marcas ? 'h-screen' : ''}`}>
              {collapsedColumns.marcas ? (
                <div className="flex flex-col items-center justify-start h-full py-4 gap-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleColumn('marcas')}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Tag className="h-5 w-5 text-muted-foreground" />
                  <div className="writing-mode-vertical-rl rotate-180 text-sm font-medium text-muted-foreground whitespace-nowrap">
                    Marcas
                  </div>
                </div>
              ) : (
                <>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <CardTitle className="text-base">Marcas</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleColumn('marcas')}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="p-4 pb-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Buscar marca..."
                          value={searchMarca}
                          onChange={(e) => setSearchMarca(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                    </div>
                    <ScrollArea className="h-[550px]">
                      <div className="space-y-1 p-4 pt-2">
                        {marcasFiltradas.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-8">
                            {searchMarca ? 'Nenhuma marca encontrada' : 'Nenhuma marca cadastrada'}
                          </p>
                        ) : (
                          marcasFiltradas.map((marca) => (
                            <button
                              key={marca}
                              onClick={() => {
                                setSelectedMarca(marca || null);
                                setSelectedVendedor(null);
                                setSelectedAtendimento(null);
                                // Abrir a coluna de vendedores e fechar marcas
                                setCollapsedColumns({
                                  marcas: true,
                                  vendedores: false,
                                  chat: true
                                });
                              }}
                              className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                                selectedMarca === marca
                                  ? 'bg-primary text-primary-foreground'
                                  : 'hover:bg-muted'
                              }`}
                            >
                              <div className="font-medium">{marca}</div>
                              <div className="text-xs opacity-75 mt-1">
                                {vendedoresFiltrados.filter(v => v.especialidade_marca === marca).length} vendedor(es)
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </>
              )}
            </Card>

            {/* Column 2: Vendedores */}
            <Card style={getColumnStyle('vendedores')} className={`transition-all duration-300 ${collapsedColumns.vendedores ? 'h-screen' : ''}`}>
              {collapsedColumns.vendedores ? (
                <div className="flex flex-col items-center justify-start h-full py-4 gap-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleColumn('vendedores')}
                    disabled={!selectedMarca}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <div className="writing-mode-vertical-rl rotate-180 text-sm font-medium text-muted-foreground whitespace-nowrap">
                    Vendedores
                  </div>
                </div>
              ) : (
                <>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <CardTitle className="text-base">
                      Vendedores
                      {selectedMarca && ` - ${selectedMarca}`}
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleColumn('vendedores')}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  </CardHeader>
                  <CardContent className="p-0">
                    {!selectedMarca ? (
                      <div className="flex flex-col items-center justify-center h-[600px] py-20">
                        <Users className="h-12 w-12 text-muted-foreground/40 mb-3" />
                        <p className="text-sm text-muted-foreground">
                          Selecione uma marca
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="p-4 pb-2">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Buscar vendedor..."
                              value={searchVendedor}
                              onChange={(e) => setSearchVendedor(e.target.value)}
                              className="pl-9"
                            />
                          </div>
                        </div>
                        <ScrollArea className="h-[550px]">
                          <div className="space-y-1 p-4 pt-2">
                            {vendedoresFiltradosPorBusca.length === 0 ? (
                              <p className="text-sm text-muted-foreground text-center py-8">
                                {searchVendedor ? 'Nenhum vendedor encontrado' : 'Nenhum vendedor cadastrado'}
                              </p>
                            ) : (
                              vendedoresFiltradosPorBusca.map((vendedor) => (
                                <button
                                  key={vendedor.id}
                              onClick={() => {
                                setSelectedVendedor(vendedor);
                                setSelectedAtendimento(null);
                                // Abrir a coluna de chat automaticamente
                                setCollapsedColumns(prev => ({
                                  marcas: true,
                                  vendedores: prev.vendedores,
                                  chat: false
                                }));
                              }}
                                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                                    selectedVendedor?.id === vendedor.id
                                      ? 'bg-primary text-primary-foreground'
                                      : 'hover:bg-muted'
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <div className={`h-2.5 w-2.5 rounded-full ${
                                      vendedor.status_online ? 'bg-green-500' : 'bg-gray-400'
                                    }`} />
                                    <div className="flex-1">
                                      <div className="font-medium">{vendedor.nome}</div>
                                      <div className="text-xs opacity-75 mt-1">{vendedor.email}</div>
                                    </div>
                                  </div>
                                </button>
                              ))
                            )}
                          </div>
                        </ScrollArea>
                      </>
                    )}
                  </CardContent>
                </>
              )}
            </Card>

          {/* Column 3: Chat ao Vivo */}
          <Card style={getColumnStyle('chat')} className={`transition-all duration-300 ${collapsedColumns.chat ? 'h-screen' : ''}`}>
            {collapsedColumns.chat ? (
              <div className="flex flex-col items-center justify-start h-full py-4 gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleColumn('chat')}
                  disabled={!selectedVendedor}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <MessageSquare className="h-5 w-5 text-muted-foreground" />
                <div className="writing-mode-vertical-rl rotate-180 text-sm font-medium text-muted-foreground whitespace-nowrap">
                  Chat ao Vivo
                </div>
              </div>
            ) : (
              <>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-base">
                    Chat ao Vivo
                    {selectedVendedor && ` - ${selectedVendedor.nome}`}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleColumn('chat')}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  {!selectedVendedor ? (
                    <div className="flex flex-col items-center justify-center h-[600px]">
                      <MessageSquare className="h-12 w-12 text-muted-foreground/40 mb-3" />
                      <p className="text-sm text-muted-foreground">
                        Selecione um vendedor
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-0 h-[calc(100vh-180px)]">
                      {/* Lista de Conversas */}
                      <div className="border-r">
                        <div className="p-3 border-b">
                          <h3 className="text-sm font-semibold flex items-center gap-2">
                            <MessageSquare className="h-4 w-4" />
                            Conversas Ativas ({atendimentosDoVendedor.length})
                          </h3>
                        </div>
                        <ScrollArea className="h-[calc(100vh-240px)]">
                          {atendimentosDoVendedor.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full px-4 py-12 text-muted-foreground">
                              <MessageSquare className="h-10 w-10 mb-3 opacity-50" />
                              <p className="text-sm">Nenhum atendimento ativo</p>
                            </div>
                          ) : (
                            <div className="space-y-2 px-3 py-2">
                              {atendimentosDoVendedor.map((atendimento) => (
                                <button
                                  key={atendimento.id}
                                  onClick={() => setSelectedAtendimento(atendimento)}
                                  className={`w-full text-left px-3 py-3 rounded-lg transition-all duration-200 ${
                                    selectedAtendimento?.id === atendimento.id 
                                      ? 'border-2 border-primary shadow-md bg-primary/5' 
                                      : 'border-2 border-border hover:border-primary/30 hover:shadow-sm'
                                  }`}
                                >
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1 min-w-0">
                                      <div className="font-semibold text-sm truncate">
                                        {atendimento.clientes?.nome || 'Cliente'}
                                      </div>
                                      {atendimento.clientes?.telefone && (
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                                          <Phone className="h-3 w-3" />
                                          <span>{atendimento.clientes.telefone}</span>
                                        </div>
                                      )}
                                      {atendimento.mensagens && atendimento.mensagens.length > 0 && (
                                        <div className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                          {atendimento.mensagens[atendimento.mensagens.length - 1].conteudo}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="text-xs text-muted-foreground truncate flex-1">
                                      {atendimento.marca_veiculo} {atendimento.modelo_veiculo}
                                    </p>
                                    <Badge variant="outline" className="text-xs">
                                      {atendimento.status.replace(/_/g, ' ')}
                                    </Badge>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </ScrollArea>
                      </div>

                      {/* Área de Chat */}
                      <div className="flex flex-col h-full">
                        {!selectedAtendimento ? (
                          <div className="flex flex-col items-center justify-center h-full">
                            <MessageSquare className="h-12 w-12 text-muted-foreground/40 mb-3" />
                            <p className="text-sm text-muted-foreground">
                              Selecione uma conversa para ver o chat
                            </p>
                          </div>
                        ) : (
                          <AtendimentoChatModal
                            atendimentoId={selectedAtendimento.id}
                            clienteNome={selectedAtendimento.clientes?.nome || 'Cliente'}
                            veiculoInfo={`${selectedAtendimento.marca_veiculo} ${selectedAtendimento.modelo_veiculo || ''}`}
                            status={selectedAtendimento.status}
                            open={true}
                            onOpenChange={() => {}}
                            embedded={true}
                          />
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </>
            )}
          </Card>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
