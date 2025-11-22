import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function ResetUsersButton() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('reset-users', {
        body: {
          email: 'gabriel.dialogue@gmail.com',
          password: '0409L@ve',
        },
      });

      if (error) throw error;

      toast({
        title: "Sistema resetado",
        description: "Todas as contas foram removidas e a conta super-admin foi criada com sucesso.",
      });

      // Logout and redirect to auth
      setTimeout(() => {
        supabase.auth.signOut();
        window.location.href = '/auth';
      }, 2000);
    } catch (error) {
      console.error('Error resetting users:', error);
      toast({
        title: "Erro ao resetar sistema",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button 
          variant="destructive" 
          className="gap-2"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Resetando...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              Resetar Sistema
            </>
          )}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Tem certeza absoluta?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p className="font-semibold text-destructive">Esta ação é IRREVERSÍVEL!</p>
            <p>Isto irá:</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Deletar TODAS as contas existentes</li>
              <li>Deletar TODOS os atendimentos</li>
              <li>Deletar TODOS os clientes</li>
              <li>Deletar TODAS as mensagens</li>
              <li>Deletar TODAS as configurações de vendedores</li>
              <li>Criar uma nova conta super-admin: gabriel.dialogue@gmail.com</li>
            </ul>
            <p className="font-semibold mt-4">Todos os dados serão perdidos permanentemente.</p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleReset}
            className="bg-destructive hover:bg-destructive/90"
          >
            Sim, resetar tudo
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
