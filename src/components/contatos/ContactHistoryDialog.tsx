import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Car, Calendar, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Atendimento {
  id: string;
  marca_veiculo: string;
  modelo_veiculo: string | null;
  status: string;
  created_at: string;
  mensagens?: Array<{
    id: string;
    conteudo: string;
    remetente_tipo: string;
    created_at: string;
  }>;
}

interface ContactHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clienteNome: string;
  atendimentos: Atendimento[];
}

export function ContactHistoryDialog({
  open,
  onOpenChange,
  clienteNome,
  atendimentos,
}: ContactHistoryDialogProps) {
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      ia_respondendo: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      aguardando_cliente: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      vendedor_intervindo: "bg-purple-500/10 text-purple-500 border-purple-500/20",
      aguardando_orcamento: "bg-orange-500/10 text-orange-500 border-orange-500/20",
      aguardando_fechamento: "bg-green-500/10 text-green-500 border-green-500/20",
      encerrado: "bg-gray-500/10 text-gray-500 border-gray-500/20",
    };
    return colors[status] || "bg-gray-500/10 text-gray-500";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      ia_respondendo: "IA Respondendo",
      aguardando_cliente: "Aguardando Cliente",
      vendedor_intervindo: "Vendedor Intervindo",
      aguardando_orcamento: "Aguardando Orçamento",
      aguardando_fechamento: "Aguardando Fechamento",
      encerrado: "Encerrado",
    };
    return labels[status] || status;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Histórico Completo - {clienteNome}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-4">
            {atendimentos.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum atendimento registrado
              </p>
            ) : (
              atendimentos.map((atendimento) => (
                <Card key={atendimento.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Car className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-semibold">
                            {atendimento.marca_veiculo}
                            {atendimento.modelo_veiculo && ` ${atendimento.modelo_veiculo}`}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {format(new Date(atendimento.created_at), "dd/MM/yyyy 'às' HH:mm", {
                              locale: ptBR,
                            })}
                          </div>
                        </div>
                      </div>
                      <Badge className={getStatusColor(atendimento.status)}>
                        {getStatusLabel(atendimento.status)}
                      </Badge>
                    </div>

                    {atendimento.mensagens && atendimento.mensagens.length > 0 && (
                      <div className="mt-4 pt-4 border-t">
                        <div className="flex items-center gap-2 text-sm font-medium mb-3">
                          <MessageSquare className="h-4 w-4" />
                          {atendimento.mensagens.length} mensagens
                        </div>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {atendimento.mensagens.slice(0, 5).map((msg) => (
                            <div
                              key={msg.id}
                              className={`text-sm p-2 rounded ${
                                msg.remetente_tipo === "cliente"
                                  ? "bg-muted"
                                  : "bg-primary/10 text-right"
                              }`}
                            >
                              <p className="text-xs text-muted-foreground mb-1">
                                {msg.remetente_tipo === "cliente" ? "Cliente" : "Você"}
                              </p>
                              <p className="line-clamp-2">{msg.conteudo}</p>
                            </div>
                          ))}
                          {atendimento.mensagens.length > 5 && (
                            <p className="text-xs text-muted-foreground text-center">
                              + {atendimento.mensagens.length - 5} mensagens
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
