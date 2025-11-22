import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bot, User, Headphones, UserCircle, File, Download, FileText, FileSpreadsheet, FileImage, Archive, Check, CheckCheck, Clock } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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
  deliveredAt?: string | null;
  showSenderName?: boolean;
  clientePushName?: string | null;
  clienteProfilePicture?: string | null;
  status?: "enviando" | "enviada" | "entregue" | "lida";
}

const remetenteConfig = {
  ia: {
    icon: Bot,
    bubbleTone: "bg-primary text-primary-foreground border-primary/40 shadow-primary/30",
    label: "IA",
    align: "left" as const,
  },
  cliente: {
    icon: User,
    bubbleTone: "bg-card text-card-foreground border-border shadow-sm",
    label: "Cliente",
    align: "left" as const,
  },
  vendedor: {
    icon: Headphones,
    bubbleTone: "bg-altese-orange text-accent-foreground border-altese-orange/40 shadow-altese-orange/30",
    label: "Você",
    align: "right" as const,
  },
  supervisor: {
    icon: UserCircle,
    bubbleTone: "bg-accent text-accent-foreground border-accent/40 shadow-accent/30",
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
  deliveredAt,
  showSenderName = true,
  clientePushName,
  clienteProfilePicture,
  status
}: ChatMessageProps) {
  const [showImageDialog, setShowImageDialog] = useState(false);
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
    <>
      <div className={cn(
        "flex gap-2 sm:gap-3 animate-fade-in",
        showSenderName ? "mb-3 sm:mb-4" : "mb-1.5 sm:mb-2",
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
                div.className = "flex h-10 w-10 shrink-0 items-center justify-center rounded-full self-center bg-accent/20";
                div.innerHTML = '<svg class="h-5 w-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>';
                parent.insertBefore(div, parent.firstChild);
              }
            }}
          />
        ) : (
          <div className={cn("flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full self-center", 
            remetenteTipo === "cliente" ? "bg-accent/20" : "bg-primary text-primary-foreground"
          )}>
            <Icon className={cn("h-4 w-4 sm:h-5 sm:w-5", remetenteTipo === "cliente" ? "text-accent" : "text-primary-foreground")} />
          </div>
        )
      ) : (
        <div className="w-8 sm:w-10 shrink-0" />
      )}

      <div className={cn("flex flex-col gap-1 max-w-[85%] sm:max-w-[75%] md:max-w-[70%]", config.align === "right" && "items-end")}>
        {showSenderName && (
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm sm:text-base font-semibold text-foreground">
              {remetenteTipo === "cliente" && clientePushName ? clientePushName : config.label}
            </span>
          </div>
        )}
        
        {attachmentUrl && isImage && (
          <div 
            className="rounded-xl overflow-hidden border border-border max-w-[200px] sm:max-w-[250px] mb-2 cursor-pointer group relative"
            onClick={() => setShowImageDialog(true)}
          >
            <img 
              src={attachmentUrl} 
              alt="Anexo"
              className="w-full h-auto group-hover:opacity-90 transition-opacity"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
              <Download className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        )}

        {attachmentUrl && isDocument && fileInfo && (
          <div
            className={cn(
              "flex items-center gap-3 rounded-lg px-4 py-3 border transition-colors mb-2 cursor-pointer hover:bg-accent/10",
              remetenteTipo === "cliente" && "bg-card text-card-foreground border-border",
              remetenteTipo === "ia" && "bg-primary text-primary-foreground border-primary/40",
              remetenteTipo === "vendedor" && "bg-success text-success-foreground border-success/40",
              remetenteTipo === "supervisor" && "bg-accent text-accent-foreground border-accent/40"
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
          <div
            className={cn(
              "rounded-2xl px-3 py-2 sm:px-4 sm:py-2.5 relative border shadow-md",
              config.bubbleTone
            )}
          >
            <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap break-words">
              {highlightText(conteudo, searchTerm)}
            </p>
            <div className="flex items-center justify-between gap-3 mt-1.5">
              <span className="text-[10px] sm:text-[11px] opacity-80">
                {format(new Date(createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
              </span>
              {(remetenteTipo === "vendedor" || remetenteTipo === "supervisor" || remetenteTipo === "ia") && (
                <span className="flex items-center gap-0.5">
                  {status === "enviando" ? (
                    <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 opacity-60 animate-pulse" />
                  ) : status === "lida" || readAt ? (
                    <CheckCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                  ) : status === "entregue" || deliveredAt ? (
                    <CheckCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4 opacity-60" />
                  ) : (
                    <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 opacity-60" />
                  )}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>

    {/* Image Preview Dialog */}
    {attachmentUrl && isImage && (
      <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <DialogContent className="max-w-4xl p-0">
          <div className="relative">
            <img
              src={attachmentUrl}
              alt="Visualização completa"
              className="w-full h-auto max-h-[85vh] object-contain"
            />
            <div className="p-4 border-t bg-background">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    {remetenteTipo === "cliente" && clientePushName ? clientePushName : config.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <Button
                  variant="default"
                  size="sm"
                  onClick={async () => {
                    try {
                      const response = await fetch(attachmentUrl);
                      const blob = await response.blob();
                      const url = window.URL.createObjectURL(blob);
                      const link = document.createElement("a");
                      link.href = url;
                      link.download = `imagem-${format(new Date(createdAt), "ddMMyyyy-HHmmss")}.jpg`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      window.URL.revokeObjectURL(url);
                    } catch (error) {
                      console.error("Erro ao baixar imagem:", error);
                    }
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Baixar Imagem
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )}
  </>
  );
}
