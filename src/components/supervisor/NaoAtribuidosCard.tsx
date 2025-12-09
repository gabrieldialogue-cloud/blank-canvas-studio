import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, Phone, MessageSquare, Clock, Car } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Atendimento {
  id: string;
  marca_veiculo: string;
  modelo_veiculo: string | null;
  ano_veiculo?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  vendedor_fixo_id: string | null;
  clientes: {
    nome: string;
    telefone: string;
  } | null;
  mensagens: Array<{
    conteudo: string;
    created_at: string;
    remetente_tipo: string;
  }>;
}

interface NaoAtribuidosCardProps {
  atendimento: Atendimento;
  onViewChat: (atendimentoId: string) => void;
}

export function NaoAtribuidosCard({ atendimento, onViewChat }: NaoAtribuidosCardProps) {
  const getLastMessage = () => {
    if (!atendimento.mensagens || atendimento.mensagens.length === 0) return "Sem mensagens";
    const sorted = [...atendimento.mensagens].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    const last = sorted[0];
    return last.conteudo.substring(0, 80) + (last.conteudo.length > 80 ? "..." : "");
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      ia_respondendo: { label: "IA Respondendo", className: "bg-blue-500" },
      aguardando_cliente: { label: "Aguardando Cliente", className: "bg-yellow-500" },
      vendedor_intervindo: { label: "Vendedor Intervindo", className: "bg-green-500" },
      aguardando_orcamento: { label: "Aguardando Orçamento", className: "bg-orange-500" },
      aguardando_fechamento: { label: "Aguardando Fechamento", className: "bg-purple-500" },
      encerrado: { label: "Encerrado", className: "bg-gray-500" },
    };

    const config = statusConfig[status] || { label: status, className: "bg-gray-500" };
    return (
      <Badge className={`${config.className} text-white text-xs`}>{config.label}</Badge>
    );
  };

  const timeAgo = formatDistanceToNow(new Date(atendimento.created_at), {
    addSuffix: true,
    locale: ptBR,
  });

  return (
    <Card className="hover:shadow-md transition-shadow border-l-4 border-l-amber-500">
      <CardContent className="p-4 space-y-3">
        {/* Header com cliente e tempo */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
              <User className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="font-semibold text-sm">
                {atendimento.clientes?.nome || "Cliente não identificado"}
              </p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Phone className="h-3 w-3" />
                {atendimento.clientes?.telefone || "Sem telefone"}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            {getStatusBadge(atendimento.status)}
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {timeAgo}
            </span>
          </div>
        </div>

        {/* Info do veículo */}
        <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
          <Car className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">
            {atendimento.marca_veiculo ? (
              <>
                <span className="font-medium">{atendimento.marca_veiculo}</span>
                {atendimento.modelo_veiculo && (
                  <span className="text-muted-foreground"> - {atendimento.modelo_veiculo}</span>
                )}
                {atendimento.ano_veiculo && (
                  <span className="text-muted-foreground"> ({atendimento.ano_veiculo})</span>
                )}
              </>
            ) : (
              <span className="text-muted-foreground italic">Marca não identificada ainda</span>
            )}
          </span>
        </div>

        {/* Última mensagem */}
        <div className="flex items-start gap-2 text-sm">
          <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
          <p className="text-muted-foreground line-clamp-2">{getLastMessage()}</p>
        </div>

        {/* Ações */}
        <div className="flex justify-end pt-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onViewChat(atendimento.id)}
            className="gap-2"
          >
            <MessageSquare className="h-4 w-4" />
            Ver Conversa
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
