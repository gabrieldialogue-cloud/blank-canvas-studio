import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function Configuracoes() {
  // Simulação de status online baseado em atividade
  const isOnline = true; // Será detectado automaticamente pela atividade do vendedor
  const [especialidade, setEspecialidade] = useState<string>("Carregando...");

  useEffect(() => {
    fetchEspecialidade();
  }, []);

  const fetchEspecialidade = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!usuarioData) return;

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
    } catch (error) {
      console.error('Error fetching especialidade:', error);
      setEspecialidade("Erro ao carregar");
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

          <Card className="border-secondary bg-gradient-to-br from-secondary/5 to-transparent">
            <CardHeader>
              <CardTitle>Informações do Vendedor</CardTitle>
              <CardDescription>Visualize suas informações atribuídas pelo supervisor</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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

              <Separator />

              <div className="rounded-lg border border-secondary/30 bg-secondary/5 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary">
                    <Users className="h-4 w-4 text-secondary-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Supervisor
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Seu supervisor é atribuído pela gestão e poderá visualizar e intervir nos seus atendimentos quando necessário.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

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
