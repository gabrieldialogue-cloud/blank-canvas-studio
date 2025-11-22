import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

const marcasDisponiveis = ["Toyota", "Honda", "Ford", "Chevrolet", "Volkswagen", "Fiat", "Hyundai", "Nissan", "Renault", "Jeep"];

export default function Configuracoes() {
  const isOnline = true;
  const [userRole, setUserRole] = useState<string>("");
  const [especialidade, setEspecialidade] = useState<string>("Carregando...");
  const [supervisorNome, setSupervisorNome] = useState<string>("Carregando...");
  const [marcasSelecionadas, setMarcasSelecionadas] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('id, role')
        .eq('user_id', user.id)
        .single();

      if (!usuarioData) return;
      
      setUserRole(usuarioData.role);

      if (usuarioData.role === 'supervisor') {
        // Buscar especialidades do supervisor (pode ter múltiplas)
        const { data: configData } = await supabase
          .from('config_vendedores')
          .select('especialidade_marca')
          .eq('usuario_id', usuarioData.id)
          .single();

        if (configData?.especialidade_marca) {
          // Se tiver vírgulas, é múltipla; caso contrário, única
          const marcas = configData.especialidade_marca.split(',').map(m => m.trim());
          setMarcasSelecionadas(marcas);
        }
      } else {
        // Vendedor - buscar especialidade e supervisor
        const { data: configData } = await supabase
          .from('config_vendedores')
          .select('especialidade_marca')
          .eq('usuario_id', usuarioData.id)
          .single();

        if (configData?.especialidade_marca) {
          setEspecialidade(configData.especialidade_marca);
        } else {
          setEspecialidade("Não definida");
        }

        // Buscar supervisor atribuído
        const { data: supervisorData } = await supabase
          .from('vendedor_supervisor')
          .select('supervisor_id, usuarios!vendedor_supervisor_supervisor_id_fkey(nome)')
          .eq('vendedor_id', usuarioData.id)
          .single();

        if (supervisorData?.usuarios) {
          setSupervisorNome((supervisorData.usuarios as any).nome);
        } else {
          setSupervisorNome("Não atribuído");
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setEspecialidade("Erro ao carregar");
    }
  };

  const handleMarcaToggle = (marca: string) => {
    setMarcasSelecionadas(prev => 
      prev.includes(marca) 
        ? prev.filter(m => m !== marca)
        : [...prev, marca]
    );
  };

  const handleSalvarEspecialidades = async () => {
    if (marcasSelecionadas.length === 0) {
      toast.error("Selecione ao menos uma marca");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!usuarioData) return;

      const especialidadeString = marcasSelecionadas.join(', ');

      // Check if config already exists
      const { data: existingConfig } = await supabase
        .from('config_vendedores')
        .select('id')
        .eq('usuario_id', usuarioData.id)
        .maybeSingle();

      let error;
      if (existingConfig) {
        // Update existing config
        const result = await supabase
          .from('config_vendedores')
          .update({ especialidade_marca: especialidadeString })
          .eq('usuario_id', usuarioData.id);
        error = result.error;
      } else {
        // Insert new config
        const result = await supabase
          .from('config_vendedores')
          .insert({ 
            usuario_id: usuarioData.id,
            especialidade_marca: especialidadeString 
          });
        error = result.error;
      }

      if (error) throw error;

      toast.success("Especialidades atualizadas com sucesso!");
    } catch (error) {
      console.error('Error saving specialties:', error);
      toast.error("Erro ao salvar especialidades");
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
          <p className="text-muted-foreground mt-2">
            Configure suas preferências e dados do vendedor
          </p>
        </div>

        <div className="grid gap-6">
          <Card className="border-primary bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Status de Conectividade</CardTitle>
                  <CardDescription>
                    Detectado automaticamente com base na sua atividade
                  </CardDescription>
                </div>
                <Badge
                  className={
                    isOnline
                      ? "bg-success text-success-foreground"
                      : "bg-altese-gray-medium text-altese-gray-dark"
                  }
                >
                  {isOnline ? (
                    <>
                      <Wifi className="h-4 w-4 mr-1" />
                      Online
                    </>
                  ) : (
                    <>
                      <WifiOff className="h-4 w-4 mr-1" />
                      Offline
                    </>
                  )}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Você está {isOnline ? "online" : "offline"} e{" "}
                {isOnline ? "pode" : "não pode"} receber novos atendimentos. O sistema detecta
                automaticamente sua presença através da sua atividade na plataforma.
              </p>
            </CardContent>
          </Card>

          {userRole === 'supervisor' ? (
            <Card className="border-secondary bg-gradient-to-br from-secondary/5 to-transparent">
              <CardHeader>
                <CardTitle>Especialidades do Supervisor</CardTitle>
                <CardDescription>Selecione as marcas que você gerencia</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                  <Label className="text-sm font-medium mb-3 block">Marcas de Veículos</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {marcasDisponiveis.map((marca) => (
                      <div key={marca} className="flex items-center space-x-2">
                        <Checkbox
                          id={marca}
                          checked={marcasSelecionadas.includes(marca)}
                          onCheckedChange={() => handleMarcaToggle(marca)}
                        />
                        <label
                          htmlFor={marca}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {marca}
                        </label>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    Você pode selecionar múltiplas marcas para gerenciar
                  </p>
                </div>
                <Button 
                  onClick={handleSalvarEspecialidades}
                  disabled={loading}
                  className="w-full bg-success hover:bg-success/90"
                >
                  {loading ? "Salvando..." : "Salvar Especialidades"}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-secondary bg-gradient-to-br from-secondary/5 to-transparent">
              <CardHeader>
                <CardTitle>Informações do Vendedor</CardTitle>
                <CardDescription>Visualize suas informações atribuídas pelo supervisor</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-accent/30 bg-accent/5 p-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Supervisor Responsável</Label>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className="text-base py-2 px-4 bg-accent">
                        {supervisorNome}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Este é o supervisor que gerencia seus atendimentos
                    </p>
                  </div>
                </div>
                
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Especialidade (Marca)</Label>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className="text-base py-2 px-4 bg-primary">
                        {especialidade}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Esta é a marca de veículos que você atende, definida pelo seu supervisor
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-accent bg-gradient-to-br from-accent/5 to-transparent">
            <CardHeader>
              <CardTitle>Notificações</CardTitle>
              <CardDescription>Configure como você quer ser notificado</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-secondary/30 bg-secondary/5 p-4">
                <div className="space-y-0.5">
                  <Label>Novos Atendimentos</Label>
                  <p className="text-sm text-muted-foreground">
                    Receba notificação quando um novo atendimento for atribuído
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-accent/30 bg-accent/5 p-4">
                <div className="space-y-0.5">
                  <Label>Solicitações de Orçamento</Label>
                  <p className="text-sm text-muted-foreground">
                    Notificar quando um orçamento for solicitado
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-success/30 bg-success/5 p-4">
                <div className="space-y-0.5">
                  <Label>Mensagens de Clientes</Label>
                  <p className="text-sm text-muted-foreground">
                    Alertas quando clientes enviarem mensagens
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 p-4">
                <div className="space-y-0.5">
                  <Label>Intervenções Necessárias</Label>
                  <p className="text-sm text-muted-foreground">
                    Notificar quando a IA solicitar ajuda humana
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <Button className="w-full bg-success hover:bg-success/90">
                Salvar Preferências
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
