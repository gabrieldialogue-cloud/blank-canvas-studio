import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

export default function Configuracoes() {
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
          <Card>
            <CardHeader>
              <CardTitle>Informações do Vendedor</CardTitle>
              <CardDescription>Configure suas informações básicas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="especialidade">Especialidade (Marca)</Label>
                <Select>
                  <SelectTrigger id="especialidade">
                    <SelectValue placeholder="Selecione a marca" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fiat">Fiat</SelectItem>
                    <SelectItem value="volkswagen">Volkswagen</SelectItem>
                    <SelectItem value="gm">GM - Chevrolet</SelectItem>
                    <SelectItem value="ford">Ford</SelectItem>
                    <SelectItem value="toyota">Toyota</SelectItem>
                    <SelectItem value="importados">Importados</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="prioridade">Prioridade na Fila</Label>
                <Select>
                  <SelectTrigger id="prioridade">
                    <SelectValue placeholder="Selecione a prioridade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Prioridade 1 (Alta)</SelectItem>
                    <SelectItem value="2">Prioridade 2 (Média)</SelectItem>
                    <SelectItem value="3">Prioridade 3 (Baixa)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="status-online">Status Online</Label>
                  <p className="text-sm text-muted-foreground">
                    Marque como online para receber novos atendimentos
                  </p>
                </div>
                <Switch id="status-online" />
              </div>

              <Button className="w-full bg-success hover:bg-success/90">
                Salvar Alterações
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notificações</CardTitle>
              <CardDescription>Configure como você quer ser notificado</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Novos Atendimentos</Label>
                  <p className="text-sm text-muted-foreground">
                    Receba notificação quando um novo atendimento for atribuído
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Solicitações de Orçamento</Label>
                  <p className="text-sm text-muted-foreground">
                    Notificar quando um orçamento for solicitado
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Mensagens de Clientes</Label>
                  <p className="text-sm text-muted-foreground">
                    Alertas quando clientes enviarem mensagens
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
