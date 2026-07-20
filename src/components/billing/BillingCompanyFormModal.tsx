import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { BillingCompany } from "@/hooks/useBillingCompanies";

interface BillingCompanyFormModalProps {
  company: BillingCompany | null;
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<BillingCompany, "id" | "created_at" | "updated_at">) => void;
  isSubmitting: boolean;
}

export const BillingCompanyFormModal = ({
  company,
  open,
  onClose,
  onSubmit,
  isSubmitting,
}: BillingCompanyFormModalProps) => {
  const [formData, setFormData] = useState({
    name: "",
    cnpj: "",
    address: "",
    phone: "",
    email: "",
    contact_person: "",
  });

  useEffect(() => {
    if (company) {
      setFormData({
        name: company.name || "",
        cnpj: company.cnpj || "",
        address: company.address || "",
        phone: company.phone || "",
        email: company.email || "",
        contact_person: company.contact_person || "",
      });
    } else {
      setFormData({
        name: "",
        cnpj: "",
        address: "",
        phone: "",
        email: "",
        contact_person: "",
      });
    }
  }, [company, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const formatCNPJ = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length <= 14) {
      return cleaned
        .replace(/^(\d{2})(\d)/, "$1.$2")
        .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
        .replace(/\.(\d{3})(\d)/, ".$1/$2")
        .replace(/(\d{4})(\d)/, "$1-$2");
    }
    return value;
  };

  const formatPhone = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length <= 11) {
      return cleaned
        .replace(/^(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{5})(\d)/, "$1-$2");
    }
    return value;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {company ? "Editar Empresa" : "Nova Empresa de Cobrança"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="name">Razão Social *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input
                id="cnpj"
                value={formData.cnpj}
                onChange={(e) => setFormData({ ...formData, cnpj: formatCNPJ(e.target.value) })}
                placeholder="00.000.000/0000-00"
              />
            </div>

            <div>
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                placeholder="(00) 00000-0000"
              />
            </div>

            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="contact_person">Pessoa de Contato</Label>
              <Input
                id="contact_person"
                value={formData.contact_person}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="address">Endereço</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {company ? "Atualizar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
