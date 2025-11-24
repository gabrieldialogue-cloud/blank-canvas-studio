import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageSquare, User, Car, Image as ImageIcon, Clock, Mic } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AtendimentoCardProps {
  id: string;
  clienteNome: string;
  marcaVeiculo: string;
  ultimaMensagem: string;
  status: "ia_respondendo" | "aguardando_cliente" | "vendedor_intervindo" | "aguardando_orcamento" | "aguardando_fechamento";
  updatedAt: string;
  onClick: () => void;
  attachmentUrl?: string | null;
  attachmentType?: string | null;
  profilePictureUrl?: string | null;
  pushName?: string | null;
}

const statusConfig = {
  ia_respondendo: {
    label: "IA Respondendo",
    className: "bg-gradient-to-r from-secondary to-primary text-white border-0", // Gradiente azul
  },
  aguardando_cliente: {
    label: "Aguardando Cliente",
    className: "bg-gradient-to-r from-muted to-muted-foreground/20 text-foreground border-0", // Gradiente cinza
  },
  vendedor_intervindo: {
    label: "Vendedor Intervindo",
    className: "bg-gradient-to-r from-success to-success/80 text-white border-0", // Gradiente verde
  },
  aguardando_orcamento: {
    label: "Aguardando Orçamento",
    className: "bg-gradient-to-r from-accent to-accent/80 text-white border-0", // Gradiente laranja
  },
  aguardando_fechamento: {
    label: "Aguardando Fechamento",
    className: "bg-gradient-to-r from-primary to-primary/80 text-white border-0", // Gradiente azul Altese
  },
};

export function AtendimentoCard({
  clienteNome,
  marcaVeiculo,
  ultimaMensagem,
  status,
  updatedAt,
  onClick,
  attachmentUrl,
  attachmentType,
  profilePictureUrl,
  pushName,
}: AtendimentoCardProps) {
  const statusInfo = statusConfig[status];
  const timeAgo = formatDistanceToNow(new Date(updatedAt), { addSuffix: true, locale: ptBR });
  const hasImageAttachment = attachmentType?.startsWith('image/');
  const isAudio = attachmentType === 'audio';

  return (
    <Card className="cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] bg-gradient-to-b from-accent/15 to-transparent" onClick={onClick}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-3">
              {profilePictureUrl ? (
                <img 
                  src={profilePictureUrl} 
                  alt="Perfil" 
                  className="h-10 w-10 rounded-full object-cover border-2 border-accent/30"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const parent = e.currentTarget.parentElement;
                    if (parent) {
                      const icon = document.createElement('div');
                      icon.className = 'h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center';
                      icon.innerHTML = '<svg class="h-5 w-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>';
                      parent.appendChild(icon);
                    }
                  }}
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center">
                  <User className="h-5 w-5 text-accent" />
                </div>
              )}
              <h3 className="font-semibold text-lg text-foreground">{pushName || clienteNome}</h3>
            </div>

            <div className="flex items-center gap-3">
              <Car className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{marcaVeiculo}</span>
            </div>

            <div className="flex items-start gap-3">
              <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="flex-1 flex items-center gap-3">
                <p className="text-sm text-muted-foreground line-clamp-2 flex-1">{ultimaMensagem}</p>
                {hasImageAttachment && attachmentUrl && (
                  <div className="flex-shrink-0 w-12 h-12 rounded-md overflow-hidden border border-border bg-muted flex items-center justify-center">
                    <img 
                      src={attachmentUrl} 
                      alt="Preview" 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const parent = e.currentTarget.parentElement;
                        if (parent) {
                          parent.innerHTML = '<svg class="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>';
                        }
                      }}
                    />
                  </div>
                )}
                {isAudio && (
                  <div className="flex-shrink-0 w-12 h-12 rounded-md border border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                    <Mic className="w-5 h-5 text-primary" />
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2 flex-wrap">
              <Badge className={statusInfo.className}>{statusInfo.label}</Badge>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{timeAgo}</span>
              </div>
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
