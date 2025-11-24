import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface DeleteContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clienteId: string;
  clienteNome: string;
  onSuccess: () => void;
}

export function DeleteContactDialog({
  open,
  onOpenChange,
  clienteId,
  clienteNome,
  onSuccess,
}: DeleteContactDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      // Delete cliente (cascade will delete related atendimentos and mensagens)
      const { error } = await supabase
        .from("clientes")
        .delete()
        .eq("id", clienteId);

      if (error) throw error;

      toast({
        title: "Contato excluído",
        description: `${clienteNome} foi removido com sucesso.`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao excluir contato:", error);
      toast({
        title: "Erro ao excluir contato",
        description: error instanceof Error ? error.message : "Não foi possível excluir o contato.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir contato?</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir <strong>{clienteNome}</strong>? Esta ação não pode ser
            desfeita e removerá:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Todos os atendimentos deste cliente</li>
              <li>Todas as mensagens e mídias trocadas</li>
              <li>Todo o histórico de interações</li>
            </ul>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
