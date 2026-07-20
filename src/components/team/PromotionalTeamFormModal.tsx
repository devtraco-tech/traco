import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { PromotionalTeam } from "@/hooks/usePromotionalTeams";

interface PromotionalTeamFormModalProps {
  team: PromotionalTeam | null;
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<PromotionalTeam, "id" | "created_at" | "updated_at">) => void;
  isSubmitting: boolean;
}

export const PromotionalTeamFormModal = ({
  team,
  open,
  onClose,
  onSubmit,
  isSubmitting,
}: PromotionalTeamFormModalProps) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    contact_person: "",
    email: "",
    phone: "",
  });

  useEffect(() => {
    if (team) {
      setFormData({
        name: team.name || "",
        description: team.description || "",
        contact_person: team.contact_person || "",
        email: team.email || "",
        phone: team.phone || "",
      });
    } else {
      setFormData({
        name: "",
        description: "",
        contact_person: "",
        email: "",
        phone: "",
      });
    }
  }, [team, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {team ? "Editar Equipe Promotora" : "Nova Equipe Promotora"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Equipe*</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Equipe Ortodontia"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descreva a equipe e suas responsabilidades"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact_person">Pessoa de Contato</Label>
              <Input
                id="contact_person"
                value={formData.contact_person}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                placeholder="Nome do responsável"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="equipe@exemplo.com"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : team ? "Atualizar" : "Criar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
