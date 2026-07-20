import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Profile } from "@/hooks/useProfiles";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Lock } from "lucide-react";

interface ChangePasswordModalProps {
  user: Profile | null;
  open: boolean;
  onClose: () => void;
}

export function ChangePasswordModal({
  user,
  open,
  onClose,
}: ChangePasswordModalProps) {
  const { toast } = useToast();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (newPassword.length < 6) {
      toast({
        title: "Erro",
        description: "A senha deve ter no mínimo 6 caracteres",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke("admin-update-password", {
        body: {
          userId: user.id,
          newPassword: newPassword,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Erro ao atualizar senha");
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      toast({
        title: "Sucesso",
        description: `Senha de ${user.name} atualizada com sucesso`,
      });

      setNewPassword("");
      setConfirmPassword("");
      onClose();
    } catch (error: any) {
      console.error("Error updating password:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar senha",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setNewPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Alterar Senha
          </DialogTitle>
          <DialogDescription>
            Definir nova senha para o usuário
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Usuário</Label>
              <div className="text-sm p-3 bg-muted rounded-md">
                <div className="font-medium">{user?.name}</div>
                <div className="text-muted-foreground">{user?.email}</div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">Nova Senha</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Digite a nova senha"
                  minLength={6}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Senha</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirme a nova senha"
                minLength={6}
                required
              />
            </div>

            {newPassword && newPassword.length < 6 && (
              <p className="text-sm text-destructive">
                A senha deve ter no mínimo 6 caracteres
              </p>
            )}

            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-sm text-destructive">
                As senhas não coincidem
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || newPassword.length < 6 || newPassword !== confirmPassword}
            >
              {isSubmitting ? "Salvando..." : "Alterar Senha"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
