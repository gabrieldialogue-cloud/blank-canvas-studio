import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Send, Loader2 } from "lucide-react";
import { useState } from "react";

interface ImagePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  fileName: string;
  onConfirm: () => void;
  isSending: boolean;
}

export function ImagePreviewDialog({
  open,
  onOpenChange,
  imageUrl,
  fileName,
  onConfirm,
  isSending,
}: ImagePreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl z-[999] sm:max-w-3xl bg-card/95 backdrop-blur-xl border border-border/60 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between text-base sm:text-lg">
            <span>Confirme a imagem antes de enviar</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              disabled={isSending}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="relative rounded-xl overflow-hidden border border-border bg-muted/30 max-h-[70vh] flex items-center justify-center">
            {imageUrl && (
              <img
                src={imageUrl}
                alt="Preview"
                className="w-full h-full object-contain"
              />
            )}
          </div>
          
          <div className="text-xs sm:text-sm text-muted-foreground">
            <p className="font-medium">Nome do arquivo:</p>
            <p className="truncate">{fileName}</p>
          </div>
        </div>
        
        <DialogFooter className="gap-2 sm:gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSending}
          >
            Cancelar
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isSending}
            className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Enviar imagem
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
