import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera } from "lucide-react";

export default function Perfil() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Perfil</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie suas informações pessoais
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Foto de Perfil</CardTitle>
              <CardDescription>Atualize sua foto de perfil</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <div className="relative">
                <Avatar className="h-32 w-32">
                  <AvatarImage src="" alt="User" />
                  <AvatarFallback className="bg-primary text-primary-foreground text-3xl">
                    U
                  </AvatarFallback>
                </Avatar>
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute bottom-0 right-0 rounded-full"
                >
                  <Camera className="h-4 w-4" />
                </Button>
              </div>
              <Button className="w-full bg-success hover:bg-success/90">
                Fazer Upload
              </Button>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Informações Pessoais</CardTitle>
              <CardDescription>Atualize seus dados pessoais</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome Completo</Label>
                <Input id="nome" placeholder="João Silva" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="joao@altese.com.br" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input id="telefone" placeholder="(11) 98765-4321" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clinica">Nome da Filial/Loja</Label>
                <Input id="clinica" placeholder="Altese - Unidade São Paulo" />
              </div>

              <Button className="w-full bg-success hover:bg-success/90">
                Salvar Alterações
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Alterar Senha</CardTitle>
            <CardDescription>Atualize sua senha de acesso</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="senha-atual">Senha Atual</Label>
              <Input id="senha-atual" type="password" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="senha-nova">Nova Senha</Label>
              <Input id="senha-nova" type="password" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="senha-confirmar">Confirmar Nova Senha</Label>
              <Input id="senha-confirmar" type="password" />
            </div>

            <Button className="w-full bg-success hover:bg-success/90">
              Atualizar Senha
            </Button>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
