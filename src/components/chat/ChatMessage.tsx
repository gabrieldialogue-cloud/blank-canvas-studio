import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bot, User, Headphones, UserCircle } from "lucide-react";

interface ChatMessageProps {
  remetenteTipo: "ia" | "cliente" | "vendedor" | "supervisor";
  conteudo: string;
  createdAt: string;
}

const remetenteConfig = {
  ia: {
    icon: Bot,
    bgClass: "bg-status-ia",
    textClass: "text-white",
    label: "IA",
    align: "left" as const,
  },
  cliente: {
    icon: User,
    bgClass: "bg-muted",
    textClass: "text-foreground",
    label: "Cliente",
    align: "left" as const,
  },
  vendedor: {
    icon: Headphones,
    bgClass: "bg-success",
    textClass: "text-white",
    label: "Você",
    align: "right" as const,
  },
  supervisor: {
    icon: UserCircle,
    bgClass: "bg-accent",
    textClass: "text-white",
    label: "Supervisor",
    align: "right" as const,
  },
};

export function ChatMessage({ remetenteTipo, conteudo, createdAt }: ChatMessageProps) {
  const config = remetenteConfig[remetenteTipo];
  const Icon = config.icon;

  return (
    <div className={cn("flex gap-3 mb-4", config.align === "right" && "flex-row-reverse")}>
      <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", config.bgClass)}>
        <Icon className="h-4 w-4 text-white" />
      </div>

      <div className={cn("flex flex-col gap-1 max-w-[70%]", config.align === "right" && "items-end")}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">{config.label}</span>
          <span className="text-xs text-muted-foreground">
            {format(new Date(createdAt), "HH:mm", { locale: ptBR })}
          </span>
        </div>
        
        <div className={cn("rounded-lg px-4 py-2.5", config.bgClass, config.textClass)}>
          <p className="text-sm whitespace-pre-wrap break-words">{conteudo}</p>
        </div>
      </div>
    </div>
  );
}
