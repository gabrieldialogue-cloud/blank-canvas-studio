import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bot, User, Headphones, UserCircle, File, Download, FileText, FileSpreadsheet, FileImage, Archive, Check, CheckCheck } from "lucide-react";

interface ChatMessageProps {
  remetenteTipo: "ia" | "cliente" | "vendedor" | "supervisor";
  conteudo: string;
  createdAt: string;
  attachmentUrl?: string | null;
  attachmentType?: string | null;
  attachmentFilename?: string | null;
  searchTerm?: string;
  isHighlighted?: boolean;
  readAt?: string | null;
  showSenderName?: boolean;
  clientePushName?: string | null;
  clienteProfilePicture?: string | null;
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

export function ChatMessage({ 
  remetenteTipo, 
  conteudo, 
  createdAt, 
  attachmentUrl, 
  attachmentType, 
  attachmentFilename,
  searchTerm = "",
  isHighlighted = false,
  readAt,
  showSenderName = true,
  clientePushName,
  clienteProfilePicture
}: ChatMessageProps) {
  const config = remetenteConfig[remetenteTipo];
  const Icon = config.icon;

  const isImage = attachmentType === 'image';
  const isDocument = attachmentType === 'document';

  // Highlight text function
  const highlightText = (text: string, search: string) => {
    if (!search.trim()) return text;
    
    const regex = new RegExp(`(${search})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-300 dark:bg-yellow-600 px-1 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

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
    <div className={cn(
      "flex gap-3",
      showSenderName ? "mb-3" : "mb-0",
      config.align === "right" && "flex-row-reverse",
      isHighlighted && "bg-yellow-100 dark:bg-yellow-900/20 p-2 rounded-lg -mx-2"
    )}>
      {showSenderName ? (
        remetenteTipo === "cliente" && clienteProfilePicture ? (
          <img 
            src={clienteProfilePicture} 
            alt="Perfil" 
            className="h-10 w-10 rounded-full object-cover border border-border shrink-0 self-center"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              const parent = e.currentTarget.parentElement;
              if (parent) {
                const div = document.createElement("div");
                div.className = `flex h-10 w-10 shrink-0 items-center justify-center rounded-full self-center ${config.bgClass}`;
                div.innerHTML = `<svg class="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>`;
                parent.insertBefore(div, parent.firstChild);
              }
            }}
          />
        ) : (
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full self-center", config.bgClass)}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        )
      ) : (
        <div className="w-10 shrink-0" />
      )}

      <div className={cn("flex flex-col gap-1 max-w-[70%]", config.align === "right" && "items-end")}>
        {showSenderName && (
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-foreground">
              {remetenteTipo === "cliente" && clientePushName ? clientePushName : config.label}
            </span>
          </div>
        )}
        
        {attachmentUrl && isImage && (
          <div className="rounded-lg overflow-hidden border border-border max-w-xs mb-2">
            <img 
              src={attachmentUrl} 
              alt="Anexo"
              className="w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => window.open(attachmentUrl, "_blank")}
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
              const link = document.createElement("a");
              link.href = attachmentUrl;
              link.download = fileInfo.fileName;
              link.target = "_blank";
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
          <div className={cn("rounded-lg px-4 py-2.5 relative", config.bgClass, config.textClass)}>
            <p className="text-sm whitespace-pre-wrap break-words">
              {highlightText(conteudo, searchTerm)}
            </p>
            <div className="flex items-center justify-between gap-4 mt-1">
              <span className="text-[10px] opacity-60">
                {format(new Date(createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
              </span>
              {(remetenteTipo === "cliente" || remetenteTipo === "ia") && (
                <span className="flex items-center gap-0.5">
                  {readAt ? (
                    <CheckCheck className="h-3 w-3 text-blue-400" />
                  ) : (
                    <Check className="h-3 w-3 opacity-60" />
                  )}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
