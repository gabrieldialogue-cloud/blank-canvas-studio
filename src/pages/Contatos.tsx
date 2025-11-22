import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Phone, Mail, Car, FileText, AlertCircle, Calendar, MessageSquare } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Contatos() {

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Contatos</h1>
            <p className="text-muted-foreground">
              Todos os clientes e histórico completo de interações
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, telefone, placa, modelo..."
                className="pl-10 bg-background/50"
              />
            </div>
          </CardContent>
        </Card>

        {/* Contacts List */}
        <div className="grid gap-4">
          <Card className="border-dashed">
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">
                Nenhum contato registrado ainda. Os contatos aparecerão aqui quando clientes iniciarem conversas.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
