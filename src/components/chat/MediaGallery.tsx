import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Download, Image as ImageIcon, File, FileText } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MediaItem {
  id: string;
  url: string;
  type: 'image' | 'document';
  createdAt: string;
  remetenteTipo: string;
  filename?: string | null;
}

interface MediaGalleryProps {
  mensagens: Array<{
    id: string;
    attachment_url: string | null;
    attachment_type: string | null;
    attachment_filename: string | null;
    created_at: string;
    remetente_tipo: string;
  }>;
  onLoadMore?: () => void;
  hasMoreMedia?: boolean;
}

export function MediaGallery({ mensagens, onLoadMore, hasMoreMedia = false }: MediaGalleryProps) {
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);

  // Filter messages with attachments
  const mediaItems: MediaItem[] = mensagens
    .filter((msg) => msg.attachment_url && msg.attachment_type)
    .map((msg) => ({
      id: msg.id,
      url: msg.attachment_url!,
      type: msg.attachment_type as 'image' | 'document',
      createdAt: msg.created_at,
      remetenteTipo: msg.remetente_tipo,
      filename: msg.attachment_filename,
    }));

  const images = mediaItems.filter((item) => item.type === 'image');
  const documents = mediaItems.filter((item) => item.type === 'document');

  if (mediaItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <FileText className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-sm">Nenhuma mídia compartilhada ainda</p>
      </div>
    );
  }

  return (
    <>
      <ScrollArea className="h-[500px]">
        <div className="space-y-6 p-4">
          {hasMoreMedia && (
            <div className="flex justify-center pb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={onLoadMore}
                className="text-xs"
              >
                Carregar mídias antigas
              </Button>
            </div>
          )}
          
          {/* Images Section */}
          {images.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Imagens ({images.length})
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {images.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedMedia(item)}
                    className="relative aspect-square rounded-lg overflow-hidden border border-border hover:border-primary transition-colors group"
                  >
                    <img
                      src={item.url}
                      alt="Mídia compartilhada"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                      <Download className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                      <p className="text-[10px] text-white font-medium">
                        {format(new Date(item.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Documents Section */}
          {documents.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <File className="h-4 w-4" />
                Documentos ({documents.length})
              </h3>
              <div className="space-y-2">
                {documents.map((item) => {
                  const fileName = item.filename || item.url.split('/').pop() || 'Documento';
                  const decodedName = decodeURIComponent(fileName);
                  return (
                    <a
                      key={item.id}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary hover:bg-accent/50 transition-colors"
                    >
                      <File className="h-5 w-5 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{decodedName}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.remetenteTipo === 'vendedor' ? 'Você' : 'Cliente'} • {format(new Date(item.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                      <Download className="h-4 w-4 text-muted-foreground shrink-0" />
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Image Preview Dialog */}
      <Dialog open={!!selectedMedia} onOpenChange={() => setSelectedMedia(null)}>
        <DialogContent className="max-w-4xl p-0">
          {selectedMedia && (
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 z-10 bg-background/80 hover:bg-background"
                onClick={() => setSelectedMedia(null)}
              >
                <X className="h-4 w-4" />
              </Button>
              <img
                src={selectedMedia.url}
                alt="Visualização completa"
                className="w-full h-auto max-h-[80vh] object-contain"
              />
              <div className="p-4 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {selectedMedia.remetenteTipo === 'vendedor' ? 'Enviado por você' : 'Enviado pelo cliente'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(selectedMedia.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={async () => {
                      try {
                        const response = await fetch(selectedMedia.url);
                        const blob = await response.blob();
                        const url = window.URL.createObjectURL(blob);
                        const link = document.createElement("a");
                        link.href = url;
                        link.download = selectedMedia.filename || `imagem-${format(new Date(selectedMedia.createdAt), "ddMMyyyy-HHmmss")}.jpg`;
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
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
