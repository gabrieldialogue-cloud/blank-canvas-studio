import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bot, User, Headphones, UserCircle, File, Download, FileText, FileSpreadsheet, FileImage, Archive } from "lucide-react";

interface ChatMessageProps {
  remetenteTipo: "ia" | "cliente" | "vendedor" | "supervisor";
  conteudo: string;
  createdAt: string;
  attachmentUrl?: string | null;
  attachmentType?: string | null;
  attachmentFilename?: string | null;
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

export function ChatMessage({ remetenteTipo, conteudo, createdAt, attachmentUrl, attachmentType, attachmentFilename }: ChatMessageProps) {
  const config = remetenteConfig[remetenteTipo];
  const Icon = config.icon;

  const isImage = attachmentType === 'image';
  const isDocument = attachmentType === 'document';

  // Extract file name and extension from filename or URL
  const getFileInfo = (url: string, filename?: string | null) => {
    // Use the actual filename from WhatsApp if available
    const actualFileName = filename || url.split('/').pop() || 'documento';
    const decodedName = decodeURIComponent(actualFileName);
    const nameParts = decodedName.split('.');
    const extension = nameParts.length > 1 ? nameParts[nameParts.length - 1].toUpperCase() : 'FILE';
    const displayName = nameParts.length > 1 ? nameParts.slice(0, -1).join('.') : decodedName;
    
    return { fileName: decodedName, extension, displayName };
  };

  // Get appropriate icon for file type
  const getDocumentIcon = (url: string) => {
    const ext = url.toLowerCase();
    if (ext.includes('.pdf')) return FileText;
    if (ext.includes('.doc') || ext.includes('.docx')) return FileText;
    if (ext.includes('.xls') || ext.includes('.xlsx')) return FileSpreadsheet;
    if (ext.includes('.zip') || ext.includes('.rar') || ext.includes('.7z')) return Archive;
    if (ext.includes('.jpg') || ext.includes('.jpeg') || ext.includes('.png')) return FileImage;
    return File;
  };

  const fileInfo = attachmentUrl && isDocument ? getFileInfo(attachmentUrl, attachmentFilename) : null;
  const DocumentIcon = attachmentUrl && isDocument ? getDocumentIcon(attachmentFilename || attachmentUrl) : File;

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

        {attachmentUrl && isDocument && fileInfo && (
          <div
            className={cn(
              "flex items-center gap-3 rounded-lg px-4 py-3 border border-border transition-colors mb-2 cursor-pointer hover:bg-accent/10",
              config.bgClass,
              config.textClass
            )}
            onClick={() => {
              // Create a temporary link to download the file
              const link = document.createElement('a');
              link.href = attachmentUrl;
              link.download = fileInfo.fileName;
              link.target = '_blank';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-background/20">
              <DocumentIcon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{fileInfo.displayName}</p>
              <p className="text-xs opacity-75">Clique para baixar</p>
            </div>
            <Download className="h-5 w-5 shrink-0" />
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
