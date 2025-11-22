import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, RefreshCw, AlertCircle, ThumbsUp } from "lucide-react";

export default function PosVenda() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Pós-venda</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie garantias, trocas, reembolsos e satisfação dos clientes
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-destructive bg-gradient-to-br from-destructive/10 to-transparent">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                Reembolsos
              </CardTitle>
              <CardDescription>Solicitações de reembolso</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-destructive">0</p>
            </CardContent>
          </Card>

          <Card className="border-accent bg-gradient-to-br from-accent/10 to-transparent">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-accent">
                <RefreshCw className="h-5 w-5" />
                Trocas
              </CardTitle>
              <CardDescription>Pedidos de troca</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-accent">0</p>
            </CardContent>
          </Card>

          <Card className="border-primary bg-gradient-to-br from-primary/10 to-transparent">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Package className="h-5 w-5" />
                Garantia
              </CardTitle>
              <CardDescription>Casos de garantia</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary">0</p>
            </CardContent>
          </Card>

          <Card className="border-success bg-gradient-to-br from-success/10 to-transparent">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-success">
                <ThumbsUp className="h-5 w-5" />
                Resolvidos
              </CardTitle>
              <CardDescription>Casos finalizados</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-success">0</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Solicitações Ativas</CardTitle>
            <CardDescription>Casos de pós-venda em andamento</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-dashed border-border bg-muted/30 p-12 text-center">
              <p className="text-muted-foreground">
                Nenhuma solicitação de pós-venda no momento
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
