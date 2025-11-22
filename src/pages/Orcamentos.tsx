import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Clock, CheckCircle2, AlertCircle } from "lucide-react";

export default function Orcamentos() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Orçamentos</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie todos os orçamentos solicitados pelos clientes
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="border-accent bg-gradient-to-br from-accent/10 to-transparent">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-accent">
                <Clock className="h-5 w-5" />
                Aguardando Resposta
              </CardTitle>
              <CardDescription>Orçamentos pendentes de envio</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-accent">0</p>
            </CardContent>
          </Card>

          <Card className="border-primary bg-gradient-to-br from-primary/10 to-transparent">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <FileText className="h-5 w-5" />
                Em Análise
              </CardTitle>
              <CardDescription>Cliente analisando proposta</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary">0</p>
            </CardContent>
          </Card>

          <Card className="border-success bg-gradient-to-br from-success/10 to-transparent">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-success">
                <CheckCircle2 className="h-5 w-5" />
                Aprovados
              </CardTitle>
              <CardDescription>Orçamentos aceitos pelo cliente</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-success">0</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Orçamentos</CardTitle>
            <CardDescription>Todos os orçamentos solicitados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-dashed border-border bg-muted/30 p-12 text-center">
              <p className="text-muted-foreground">
                Nenhum orçamento registrado no momento
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
