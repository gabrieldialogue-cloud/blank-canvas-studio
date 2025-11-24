import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Users, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { VendedorChatModal } from "@/components/supervisor/VendedorChatModal";
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
          <div className="grid grid-cols-12 gap-4">
            {/* Column 1: Marcas */}
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle className="text-base">Marcas</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[600px]">
                  <div className="space-y-1 p-4">
                    {(() => {
                      const marcas = Array.from(
                        new Set(
                          vendedoresFiltrados
                            .map(v => v.especialidade_marca)
                            .filter(Boolean)
                        )
                      ).sort();
                      
                      if (marcas.length === 0) {
                        return (
                          <p className="text-sm text-muted-foreground text-center py-8">
                            Nenhuma marca cadastrada
                          </p>
                        );
                      }
                      
                      return marcas.map((marca) => (
                        <button
                          key={marca}
                          onClick={() => {
                            setSelectedMarca(marca || null);
                            setSelectedVendedor(null);
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
                      ));
                    })()}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Column 2: Vendedores */}
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle className="text-base">
                  Vendedores
                  {selectedMarca && ` - ${selectedMarca}`}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[600px]">
                  {!selectedMarca ? (
                    <div className="flex flex-col items-center justify-center h-full py-20">
                      <Users className="h-12 w-12 text-muted-foreground/40 mb-3" />
                      <p className="text-sm text-muted-foreground">
                        Selecione uma marca
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1 p-4">
                      {vendedoresFiltrados
                        .filter(v => v.especialidade_marca === selectedMarca)
                        .map((vendedor) => (
                          <button
                            key={vendedor.id}
                            onClick={() => setSelectedVendedor(vendedor)}
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
                        ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Column 3: Chat ao Vivo */}
            <Card className="col-span-6">
              <CardHeader>
                <CardTitle className="text-base">
                  Chat ao Vivo
                  {selectedVendedor && ` - ${selectedVendedor.nome}`}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!selectedVendedor ? (
                  <div className="flex flex-col items-center justify-center h-[600px]">
                    <MessageSquare className="h-12 w-12 text-muted-foreground/40 mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Selecione um vendedor para ver o chat
                    </p>
                  </div>
                ) : (
                  <VendedorChatModal
                    vendedorId={selectedVendedor.id}
                    vendedorNome={selectedVendedor.nome}
                    embedded={true}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
