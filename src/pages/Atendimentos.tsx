import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, AlertCircle } from "lucide-react";

export default function Atendimentos() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Atendimentos</h1>
          <p className="text-muted-foreground mt-2">
            Visualize e gerencie todos os atendimentos em andamento
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="border-secondary bg-gradient-to-br from-secondary/10 to-transparent">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-secondary">
                <MessageSquare className="h-5 w-5" />
                IA Respondendo
              </CardTitle>
              <CardDescription>Atendimentos em andamento pela IA</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-secondary">0</p>
            </CardContent>
          </Card>

          <Card className="border-altese-gray-medium bg-gradient-to-br from-altese-gray-light to-transparent">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-altese-gray-dark">
                <MessageSquare className="h-5 w-5" />
                Aguardando Cliente
              </CardTitle>
              <CardDescription>Esperando resposta do cliente</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-altese-gray-dark">0</p>
            </CardContent>
          </Card>

          <Card className="border-success bg-gradient-to-br from-success/10 to-transparent">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-success">
                <MessageSquare className="h-5 w-5" />
                Vendedor Intervindo
              </CardTitle>
              <CardDescription>Atendimentos com intervenção humana</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-success">0</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
