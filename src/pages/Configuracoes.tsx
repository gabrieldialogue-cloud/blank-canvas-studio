import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff, Users } from "lucide-react";

export default function Configuracoes() {
  // Simulação de status online baseado em atividade
  const isOnline = true; // Será detectado automaticamente pela atividade do vendedor

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
              <CardDescription>Configure sua especialidade e supervisor</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="especialidade">Especialidade (Marca)</Label>
                <Select>
                  <SelectTrigger id="especialidade">
                    <SelectValue placeholder="Selecione a marca que você atende" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fiat">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-primary"></div>
                        Fiat
                      </div>
                    </SelectItem>
                    <SelectItem value="volkswagen">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-secondary"></div>
                        Volkswagen
                      </div>
                    </SelectItem>
                    <SelectItem value="gm">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-accent"></div>
                        GM - Chevrolet
                      </div>
                    </SelectItem>
                    <SelectItem value="ford">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-success"></div>
                        Ford
                      </div>
                    </SelectItem>
                    <SelectItem value="toyota">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-destructive"></div>
                        Toyota
                      </div>
                    </SelectItem>
                    <SelectItem value="importados">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-altese-gray-medium"></div>
                        Importados
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Esta é a marca de veículos que você é especialista e irá atender
                </p>
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

              <Button className="w-full bg-success hover:bg-success/90">
                Salvar Alterações
              </Button>
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
