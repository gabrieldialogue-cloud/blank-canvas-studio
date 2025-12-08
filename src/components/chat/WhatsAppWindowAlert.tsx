import { AlertCircle, Clock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface WhatsAppWindowAlertProps {
  lastClientMessageAt: Date | null;
  hoursSinceLast: number;
}

export function WhatsAppWindowAlert({
  lastClientMessageAt,
  hoursSinceLast,
}: WhatsAppWindowAlertProps) {
  const formatLastMessage = () => {
    if (!lastClientMessageAt) {
      return "O cliente ainda não enviou nenhuma mensagem";
    }
    return `Última mensagem do cliente há ${formatDistanceToNow(lastClientMessageAt, { 
      locale: ptBR,
      addSuffix: false 
    })}`;
  };

  return (
    <div className="shrink-0 border-t border-border/40 bg-gradient-to-br from-background to-muted/20 p-4 shadow-[inset_0_8px_12px_-8px_rgba(0,0,0,0.1)]">
      <Alert variant="destructive" className="border-amber-500/50 bg-amber-500/10">
        <AlertCircle className="h-4 w-4 text-amber-500" />
        <AlertTitle className="text-amber-600 dark:text-amber-400 font-semibold">
          Janela de 24h do WhatsApp expirada
        </AlertTitle>
        <AlertDescription className="text-amber-600/80 dark:text-amber-400/80">
          <div className="flex items-center gap-2 mt-1">
            <Clock className="h-3.5 w-3.5" />
            <span className="text-sm">{formatLastMessage()}</span>
          </div>
          <p className="text-xs mt-2 opacity-80">
            A Meta só permite enviar mensagens gratuitas dentro de 24 horas após a última mensagem do cliente. 
            Aguarde o cliente enviar uma nova mensagem para continuar a conversa.
          </p>
        </AlertDescription>
      </Alert>
    </div>
  );
}
