import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bot, User, Headphones, UserCircle, File, Download } from "lucide-react";

interface ChatMessageProps {
  remetenteTipo: "ia" | "cliente" | "vendedor" | "supervisor";
  conteudo: string;
  createdAt: string;
  attachmentUrl?: string | null;
  attachmentType?: string | null;
}

const remetenteConfig = {
  ia: {
    icon: Bot,
    bgClass: "bg-secondary", // Azul claro
    textClass: "text-white",
    label: "IA",
    align: "left" as const,
  },
  cliente: {
    icon: User,
    bgClass: "bg-altese-gray-light", // Cinza claro
    textClass: "text-altese-gray-dark",
    label: "Cliente",
    align: "left" as const,
  },
  vendedor: {
    icon: Headphones,
    bgClass: "bg-success", // Verde
    textClass: "text-white",
    label: "Você",
    align: "right" as const,
  },
  supervisor: {
    icon: UserCircle,
    bgClass: "bg-accent", // Laranja
    textClass: "text-white",
    label: "Supervisor",
    align: "right" as const,
  },
};

export function ChatMessage({ remetenteTipo, conteudo, createdAt, attachmentUrl, attachmentType }: ChatMessageProps) {
  const config = remetenteConfig[remetenteTipo];
  const Icon = config.icon;

  const isImage = attachmentType === 'image';
  const isDocument = attachmentType === 'document';

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
        
        {attachmentUrl && isImage && (
          <div className="rounded-lg overflow-hidden border border-border max-w-sm mb-2">
            <img 
              src={attachmentUrl} 
              alt="Anexo"
              className="w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => window.open(attachmentUrl, '_blank')}
            />
          </div>
        )}

        {attachmentUrl && isDocument && (
          <div
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2.5 border border-border transition-colors mb-2 cursor-pointer",
              config.bgClass,
              config.textClass
            )}
            onClick={() => {
              // Create a temporary link to download the file
              const link = document.createElement('a');
              link.href = attachmentUrl;
              link.download = attachmentUrl.split('/').pop() || 'documento';
              link.target = '_blank';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
          >
            <File className="h-4 w-4" />
            <div className="flex-1 min-w-0">
              <span className="text-sm">Documento anexado</span>
              <p className="text-xs opacity-75">Clique para baixar</p>
            </div>
            <Download className="h-4 w-4" />
          </div>
        )}
        
        {conteudo && (
          <div className={cn("rounded-lg px-4 py-2.5", config.bgClass, config.textClass)}>
            <p className="text-sm whitespace-pre-wrap break-words">{conteudo}</p>
          </div>
        )}
      </div>
    </div>
  );
}
