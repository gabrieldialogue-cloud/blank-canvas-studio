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
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

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
    read_at: string | null;
  }>;
}

export default function SupervisorAtendimentos() {
  const isMobile = useIsMobile();
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
  
  // Carregar estado das colunas do localStorage
  const [collapsedColumns, setCollapsedColumns] = useState(() => {
    const saved = localStorage.getItem('supervisor-collapsed-columns');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return { marcas: false, vendedores: true, chat: true };
      }
    }
    return { marcas: false, vendedores: true, chat: true };
  });

  // Salvar estado das colunas no localStorage sempre que mudar
  useEffect(() => {
    localStorage.setItem('supervisor-collapsed-columns', JSON.stringify(collapsedColumns));
  }, [collapsedColumns]);

  const toggleColumn = (column: keyof typeof collapsedColumns) => {
    setCollapsedColumns(prev => {
      const newState = { ...prev };
      const isCurrentlyCollapsed = prev[column];
      
      // Em telas grandes, permitir múltiplas colunas abertas
      if (!isMobile) {
        if (isCurrentlyCollapsed) {
          // Abrindo uma coluna
          if (column === 'vendedores' && !selectedMarca) {
            return prev; // Não permite abrir vendedores sem marca selecionada
          }
          if (column === 'chat' && !selectedVendedor) {
            return prev; // Não permite abrir chat sem vendedor selecionado
          }
          
          newState[column] = false;
        } else {
          // Fechando uma coluna
          const openColumns = Object.values(prev).filter(v => !v).length;
          if (openColumns <= 1) {
            return prev; // Não permite fechar se é a única coluna aberta
          }
          
          newState[column] = true;
        }
        
        return newState;
      }
      
      // Em telas pequenas, permitir no máximo 2 colunas abertas
      if (isCurrentlyCollapsed) {
        // Abrindo uma coluna
        if (column === 'vendedores' && !selectedMarca) {
          return prev; // Não permite abrir vendedores sem marca selecionada
        }
        if (column === 'chat' && !selectedVendedor) {
          return prev; // Não permite abrir chat sem vendedor selecionado
        }
        
        // Contar quantas colunas já estão abertas
        const currentOpenCount = Object.values(prev).filter(v => !v).length;
        
        if (currentOpenCount >= 2) {
          // Já tem 2 abertas, então fechar a primeira (da esquerda) ao abrir uma nova
          const hierarchy: (keyof typeof collapsedColumns)[] = ['marcas', 'vendedores', 'chat'];
          const openColumns = hierarchy.filter(col => !prev[col]);
          
          // Fechar a primeira coluna aberta (mais à esquerda)
          if (openColumns.length > 0) {
            newState[openColumns[0]] = true;
          }
        }
        
        newState[column] = false;
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
        mensagens (conteudo, created_at, remetente_tipo, read_at)
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

  // Calcular mensagens não lidas por vendedor
  const getUnreadCountForVendedor = (vendedorId: string) => {
    const vendedorAtendimentos = atendimentos.filter(a => a.vendedor_fixo_id === vendedorId);
    return vendedorAtendimentos.reduce((total, atendimento) => {
      const unreadInAtendimento = atendimento.mensagens.filter(
        msg => msg.remetente_tipo === 'cliente' && !msg.read_at
      ).length;
      return total + unreadInAtendimento;
    }, 0);
  };

  // Calcular mensagens não lidas por atendimento
  const getUnreadCountForAtendimento = (atendimento: Atendimento) => {
    return atendimento.mensagens.filter(
      msg => msg.remetente_tipo === 'cliente' && !msg.read_at
    ).length;
  };

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
        <div className="flex items-center justify-between bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-2xl p-6 border border-primary/20">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Atendimentos
            </h1>
            <p className="text-muted-foreground mt-2 text-lg">
              Acompanhe os atendimentos em tempo real
            </p>
          </div>
          <Badge className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-6 py-3 text-base shadow-lg shadow-primary/30">
            Supervisor
          </Badge>
        </div>

        {/* Breadcrumb de navegação */}
        {(selectedMarca || selectedVendedor || selectedAtendimento) && (
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setSelectedMarca(null);
                    setSelectedVendedor(null);
                    setSelectedAtendimento(null);
                    setCollapsedColumns({ marcas: false, vendedores: true, chat: true });
                  }}
                  className="flex items-center gap-1.5 hover:text-primary transition-colors"
                >
                  <Tag className="h-4 w-4" />
                  Marcas
                </BreadcrumbLink>
              </BreadcrumbItem>

              {selectedMarca && (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    {selectedVendedor ? (
                      <BreadcrumbLink
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setSelectedVendedor(null);
                          setSelectedAtendimento(null);
                          setCollapsedColumns(prev => ({ ...prev, vendedores: false, chat: true }));
                        }}
                        className="hover:text-primary transition-colors"
                      >
                        {selectedMarca}
                      </BreadcrumbLink>
                    ) : (
                      <BreadcrumbPage>{selectedMarca}</BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                </>
              )}

              {selectedVendedor && (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    {selectedAtendimento ? (
                      <BreadcrumbLink
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setSelectedAtendimento(null);
                        }}
                        className="flex items-center gap-1.5 hover:text-primary transition-colors"
                      >
                        <Users className="h-4 w-4" />
                        {selectedVendedor.nome}
                      </BreadcrumbLink>
                    ) : (
                      <BreadcrumbPage className="flex items-center gap-1.5">
                        <Users className="h-4 w-4" />
                        {selectedVendedor.nome}
                      </BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                </>
              )}

              {selectedAtendimento && (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage className="flex items-center gap-1.5">
                      <MessageSquare className="h-4 w-4" />
                      {selectedAtendimento.clientes?.nome || 'Cliente'}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              )}
            </BreadcrumbList>
          </Breadcrumb>
        )}

        {loading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </CardContent>
          </Card>
        ) : (
          <div className="flex gap-4 w-full" style={{ height: 'calc(100vh - 180px)' }}>
            {/* Column 1: Marcas */}
            <Card style={getColumnStyle('marcas')} className="transition-all duration-500 ease-in-out h-full flex flex-col bg-gradient-to-br from-card via-card to-muted/30 border-2 border-border/50 shadow-xl hover:shadow-2xl hover:border-primary/30">
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
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 bg-gradient-to-r from-primary/5 to-transparent border-b">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <Tag className="h-5 w-5 text-primary" />
                      Marcas
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleColumn('marcas')}
                      className="h-8 w-8 p-0 hover:bg-primary/10"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="p-4 pb-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-primary" />
                        <Input
                          placeholder="Buscar marca..."
                          value={searchMarca}
                          onChange={(e) => setSearchMarca(e.target.value)}
                          className="pl-9 border-primary/20 focus:border-primary bg-background/50 backdrop-blur-sm"
                        />
                      </div>
                    </div>
                    <ScrollArea className="flex-1" style={{ maxHeight: 'calc(100vh - 300px)' }}>
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
                                setCollapsedColumns(prev => ({
                                  ...prev,
                                  vendedores: false
                                }));
                              }}
                              className={`w-full text-left px-4 py-4 rounded-xl transition-all duration-300 transform hover:scale-105 ${
                                selectedMarca === marca
                                  ? 'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/30'
                                  : 'bg-gradient-to-r from-muted/50 to-muted/30 hover:from-muted hover:to-muted/50 border border-border/50'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                                  selectedMarca === marca ? 'bg-white/20' : 'bg-primary/10'
                                }`}>
                                  <Tag className={`h-5 w-5 ${selectedMarca === marca ? 'text-white' : 'text-primary'}`} />
                                </div>
                                <div className="flex-1">
                                  <div className="font-bold text-base">{marca}</div>
                                  <div className={`text-sm mt-1 flex items-center gap-1 ${
                                    selectedMarca === marca ? 'text-primary-foreground/80' : 'text-muted-foreground'
                                  }`}>
                                    <Users className="h-3 w-3" />
                                    {vendedoresFiltrados.filter(v => v.especialidade_marca === marca).length} vendedor(es)
                                  </div>
                                </div>
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
            <Card style={getColumnStyle('vendedores')} className="transition-all duration-500 ease-in-out h-full flex flex-col bg-gradient-to-br from-card via-card to-muted/30 border-2 border-border/50 shadow-xl hover:shadow-2xl hover:border-primary/30">
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
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 bg-gradient-to-r from-primary/5 to-transparent border-b">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      Vendedores
                      {selectedMarca && <span className="text-sm font-normal text-muted-foreground">- {selectedMarca}</span>}
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleColumn('vendedores')}
                      className="h-8 w-8 p-0 hover:bg-primary/10"
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
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-primary" />
                            <Input
                              placeholder="Buscar vendedor..."
                              value={searchVendedor}
                              onChange={(e) => setSearchVendedor(e.target.value)}
                              className="pl-9 border-primary/20 focus:border-primary bg-background/50 backdrop-blur-sm"
                            />
                          </div>
                        </div>
                        <ScrollArea className="flex-1" style={{ maxHeight: 'calc(100vh - 300px)' }}>
                          <div className="space-y-1 p-4 pt-2">
                            {vendedoresFiltradosPorBusca.length === 0 ? (
                              <p className="text-sm text-muted-foreground text-center py-8">
                                {searchVendedor ? 'Nenhum vendedor encontrado' : 'Nenhum vendedor cadastrado'}
                              </p>
                            ) : (
                              vendedoresFiltradosPorBusca.map((vendedor) => {
                                const unreadCount = getUnreadCountForVendedor(vendedor.id);
                                return (
                                  <button
                                    key={vendedor.id}
                                    onClick={() => {
                                      setSelectedVendedor(vendedor);
                                      setSelectedAtendimento(null);
                                      setCollapsedColumns(prev => ({
                                        ...prev,
                                        chat: false
                                      }));
                                    }}
                                    className={`w-full text-left px-4 py-4 rounded-xl transition-all duration-300 transform hover:scale-105 relative overflow-hidden ${
                                      selectedVendedor?.id === vendedor.id
                                        ? 'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/30'
                                        : 'bg-gradient-to-r from-muted/50 to-muted/30 hover:from-muted hover:to-muted/50 border border-border/50'
                                    }`}
                                  >
                                    {unreadCount > 0 && (
                                      <div className="absolute top-2 right-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-full h-6 w-6 flex items-center justify-center text-xs font-bold animate-pulse shadow-lg shadow-red-500/50">
                                        {unreadCount}
                                      </div>
                                    )}
                                    <div className="flex items-center gap-3">
                                      <div className={`relative h-12 w-12 rounded-full flex items-center justify-center ${
                                        selectedVendedor?.id === vendedor.id ? 'bg-white/20' : 'bg-primary/10'
                                      }`}>
                                        <User className={`h-6 w-6 ${selectedVendedor?.id === vendedor.id ? 'text-white' : 'text-primary'}`} />
                                        <div className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 ${
                                          selectedVendedor?.id === vendedor.id ? 'border-white' : 'border-card'
                                        } ${vendedor.status_online ? 'bg-green-500' : 'bg-gray-400'}`} />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="font-bold text-base truncate">{vendedor.nome}</div>
                                        <div className={`text-sm mt-1 truncate ${
                                          selectedVendedor?.id === vendedor.id ? 'text-primary-foreground/80' : 'text-muted-foreground'
                                        }`}>
                                          {vendedor.email}
                                        </div>
                                      </div>
                                    </div>
                                  </button>
                                );
                              })
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
          <Card style={getColumnStyle('chat')} className="transition-all duration-500 ease-in-out h-full flex flex-col bg-gradient-to-br from-card via-card to-muted/30 border-2 border-border/50 shadow-xl hover:shadow-2xl hover:border-primary/30">
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
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 bg-gradient-to-r from-primary/5 to-transparent border-b">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    Chat ao Vivo
                    {selectedVendedor && <span className="text-sm font-normal text-muted-foreground">- {selectedVendedor.nome}</span>}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleColumn('chat')}
                    className="h-8 w-8 p-0 hover:bg-primary/10"
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
                    <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-0 h-[calc(100vh-180px)]">
                      {/* Lista de Conversas */}
                      <div className="border-r bg-gradient-to-b from-muted/20 to-transparent">
                        <div className="p-3 border-b bg-gradient-to-r from-primary/5 to-transparent">
                          <h3 className="text-sm font-bold flex items-center gap-2 text-foreground">
                            <MessageSquare className="h-4 w-4 text-primary" />
                            Conversas ({atendimentosDoVendedor.length})
                          </h3>
                        </div>
                        <ScrollArea className="h-[calc(100vh-240px)]">
                          {atendimentosDoVendedor.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full px-3 py-8 text-muted-foreground">
                              <MessageSquare className="h-8 w-8 mb-2 opacity-50" />
                              <p className="text-xs">Nenhum atendimento</p>
                            </div>
                          ) : (
                            <div className="space-y-1.5 px-2 py-2">
                              {atendimentosDoVendedor.map((atendimento) => {
                                const unreadCount = getUnreadCountForAtendimento(atendimento);
                                return (
                           <button
                                    key={atendimento.id}
                                    onClick={() => setSelectedAtendimento(atendimento)}
                                    className={`w-full text-left px-3 py-3 rounded-xl transition-all duration-300 relative overflow-hidden ${
                                      selectedAtendimento?.id === atendimento.id 
                                        ? 'bg-gradient-to-r from-primary/20 to-primary/10 border-2 border-primary shadow-md' 
                                        : 'bg-gradient-to-r from-muted/30 to-transparent border border-border hover:border-primary/50 hover:shadow-sm'
                                    }`}
                                  >
                                    {unreadCount > 0 && (
                                      <div className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-full h-6 w-6 flex items-center justify-center text-xs font-bold animate-pulse shadow-lg shadow-red-500/50 z-10">
                                        {unreadCount}
                                      </div>
                                    )}
                                    <div className="flex items-start justify-between mb-2">
                                      <div className="flex-1 min-w-0">
                                        <div className="font-bold text-sm truncate flex items-center gap-2">
                                          <User className="h-4 w-4 text-primary" />
                                          {atendimento.clientes?.nome || 'Cliente'}
                                        </div>
                                      {atendimento.clientes?.telefone && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            navigator.clipboard.writeText(atendimento.clientes?.telefone || '');
                                            const button = e.currentTarget;
                                            button.classList.add('text-blue-500', 'scale-110');
                                            setTimeout(() => {
                                              button.classList.remove('text-blue-500', 'scale-110');
                                            }, 1500);
                                          }}
                                          className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1.5 hover:text-primary transition-all duration-200 cursor-pointer"
                                          title="Clique para copiar"
                                        >
                                          <Phone className="h-3 w-3" />
                                          <span className="font-medium">{atendimento.clientes.telefone}</span>
                                        </button>
                                      )}
                                      {atendimento.mensagens && atendimento.mensagens.length > 0 && (
                                        <div className="text-xs text-muted-foreground mt-2 line-clamp-2 italic">
                                          {atendimento.mensagens[atendimento.mensagens.length - 1].conteudo}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between gap-2 mt-2">
                                    <p className="text-xs text-muted-foreground truncate flex-1 font-medium">
                                      {atendimento.marca_veiculo} {atendimento.modelo_veiculo}
                                    </p>
                                    <Badge variant="outline" className="text-[10px] py-0.5 px-2 bg-primary/5 border-primary/30">
                                      {atendimento.status.replace(/_/g, ' ')}
                                    </Badge>
                                  </div>
                                </button>
                                );
                              })}
                            </div>
                          )}
                        </ScrollArea>
                      </div>

                      {/* Área de Chat */}
                      <div className="flex flex-col h-full overflow-hidden">
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
