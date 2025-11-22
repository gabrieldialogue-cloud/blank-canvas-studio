import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Users, UserCog, Settings } from "lucide-react";

export default function Supervisor() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary shadow-lg">
                <UserCog className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Gestão de Vendedores</h1>
                <p className="text-muted-foreground">
                  Configure e gerencie a equipe de vendedores
                </p>
              </div>
            </div>
          </div>
          <Badge className="bg-primary text-primary-foreground px-4 py-2 text-sm">
            Supervisor
          </Badge>
        </div>

        <div className="grid gap-6">
          <Card className="border-primary bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Gerenciar Vendedores
              </CardTitle>
              <CardDescription>
                Atribua especialidades e configure vendedores
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="vendedor">Selecionar Vendedor</Label>
                  <Select>
                    <SelectTrigger id="vendedor">
                      <SelectValue placeholder="Escolha um vendedor para configurar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="loading">Carregando vendedores...</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Selecione um vendedor para atribuir especialidade e configurações
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="especialidade-vendedor">Especialidade (Marca)</Label>
                  <Select>
                    <SelectTrigger id="especialidade-vendedor">
                      <SelectValue placeholder="Atribuir marca de especialidade" />
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
                    Define qual marca de veículos este vendedor irá atender
                  </p>
                </div>

                <Button className="w-full bg-success hover:bg-success/90">
                  <Settings className="h-4 w-4 mr-2" />
                  Salvar Configurações
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-secondary bg-gradient-to-br from-secondary/5 to-transparent">
            <CardHeader>
              <CardTitle>Informações</CardTitle>
              <CardDescription>Status e métricas da equipe</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-secondary/30 bg-secondary/5 p-4">
                <p className="text-sm text-muted-foreground">
                  As configurações e atribuições de vendedores serão carregadas automaticamente quando conectadas ao banco de dados.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
