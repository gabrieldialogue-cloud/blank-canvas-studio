import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageSquare, User, Car } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AtendimentoCardProps {
  id: string;
  clienteNome: string;
  marcaVeiculo: string;
  ultimaMensagem: string;
  status: "ia_respondendo" | "aguardando_cliente" | "vendedor_intervindo" | "aguardando_orcamento" | "aguardando_fechamento";
  updatedAt: string;
  onClick: () => void;
}

const statusConfig = {
  ia_respondendo: {
    label: "IA Respondendo",
    className: "bg-status-ia text-white",
  },
  aguardando_cliente: {
    label: "Aguardando Cliente",
    className: "bg-status-waiting text-foreground",
  },
  vendedor_intervindo: {
    label: "Vendedor Intervindo",
    className: "bg-status-intervening text-white",
  },
  aguardando_orcamento: {
    label: "Aguardando Orçamento",
    className: "bg-accent text-accent-foreground",
  },
  aguardando_fechamento: {
    label: "Aguardando Fechamento",
    className: "bg-success text-success-foreground",
  },
};

export function AtendimentoCard({
  clienteNome,
  marcaVeiculo,
  ultimaMensagem,
  status,
  updatedAt,
  onClick,
}: AtendimentoCardProps) {
  const statusInfo = statusConfig[status];

  return (
    <Card className="cursor-pointer transition-all hover:shadow-md" onClick={onClick}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold text-lg text-foreground">{clienteNome}</h3>
            </div>

            <div className="flex items-center gap-3">
              <Car className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{marcaVeiculo}</span>
            </div>

            <div className="flex items-start gap-3">
              <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
              <p className="text-sm text-muted-foreground line-clamp-2">{ultimaMensagem}</p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Badge className={statusInfo.className}>{statusInfo.label}</Badge>
              <span className="text-xs text-muted-foreground">
                {format(new Date(updatedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </span>
            </div>
          </div>

          {status !== "vendedor_intervindo" && (
            <Button
              variant="default"
              size="sm"
              className="bg-success hover:bg-success/90"
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
            >
              Intervir
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
