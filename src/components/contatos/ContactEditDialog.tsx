import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ContactEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clienteId: string;
  currentNome: string;
  currentEmail: string | null;
  onSuccess: () => void;
}

export function ContactEditDialog({
  open,
  onOpenChange,
  clienteId,
  currentNome,
  currentEmail,
  onSuccess,
}: ContactEditDialogProps) {
  const [nome, setNome] = useState(currentNome);
  const [email, setEmail] = useState(currentEmail || "");
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (!nome.trim()) {
      toast.error("O nome não pode estar vazio");
      return;
    }

    setIsLoading(true);
    const { error } = await supabase
      .from("clientes")
      .update({
        nome: nome.trim(),
        email: email.trim() || null,
      })
      .eq("id", clienteId);

    if (error) {
      console.error("Error updating cliente:", error);
      toast.error("Erro ao atualizar contato");
    } else {
      toast.success("Contato atualizado com sucesso!");
      onSuccess();
      onOpenChange(false);
    }
    setIsLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Contato</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome do cliente"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email (opcional)</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
