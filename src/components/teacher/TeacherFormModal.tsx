import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { Teacher } from "@/hooks/useTeachers";
import { PhotoUpload } from "./PhotoUpload";

interface TeacherFormModalProps {
  teacher: Teacher | null;
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Teacher, "id" | "created_at" | "updated_at">) => void;
  isSubmitting: boolean;
}

export const TeacherFormModal = ({
  teacher,
  open,
  onClose,
  onSubmit,
  isSubmitting,
}: TeacherFormModalProps) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    cro: "",
    bio: "",
    photo_url: "",
    is_active: true,
  });
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [newSpecialty, setNewSpecialty] = useState("");

  useEffect(() => {
    if (teacher) {
      setFormData({
        name: teacher.name || "",
        email: teacher.email || "",
        phone: teacher.phone || "",
        cro: teacher.cro || "",
        bio: teacher.bio || "",
        photo_url: teacher.photo_url || "",
        is_active: teacher.is_active ?? true,
      });
      setSpecialties(teacher.specialties || []);
    } else {
      // Reset form when modal opens without a teacher (new teacher mode)
      setFormData({
        name: "",
        email: "",
        phone: "",
        cro: "",
        bio: "",
        photo_url: "",
        is_active: true,
      });
      setSpecialties([]);
      setNewSpecialty("");
    }
  }, [teacher, open]);

  const handleAddSpecialty = () => {
    if (newSpecialty.trim() && !specialties.includes(newSpecialty.trim())) {
      setSpecialties([...specialties, newSpecialty.trim()]);
      setNewSpecialty("");
    }
  };

  const handleRemoveSpecialty = (specialty: string) => {
    setSpecialties(specialties.filter((s) => s !== specialty));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      return; // Let HTML5 validation handle this
    }
    
    onSubmit({
      ...formData,
      specialties,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[95vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <DialogTitle>
            {teacher ? "Editar Professor" : "Novo Professor"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto flex-1 px-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="name">Nome Completo *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
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
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="cro">CRO</Label>
              <Input
                id="cro"
                value={formData.cro}
                onChange={(e) => setFormData({ ...formData, cro: e.target.value })}
              />
            </div>

            <div className="col-span-2">
              <PhotoUpload
                currentPhotoUrl={formData.photo_url}
                onPhotoChange={(url) => setFormData({ ...formData, photo_url: url })}
                teacherId={teacher?.id}
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="bio">Biografia</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                rows={3}
              />
            </div>

            <div className="col-span-2">
              <Label>Especialidades</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={newSpecialty}
                  onChange={(e) => setNewSpecialty(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddSpecialty())}
                  placeholder="Digite uma especialidade"
                />
                <Button type="button" onClick={handleAddSpecialty}>
                  Adicionar
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {specialties.map((specialty) => (
                  <Badge key={specialty} variant="secondary" className="gap-1">
                    {specialty}
                    <button
                      type="button"
                      onClick={() => handleRemoveSpecialty(specialty)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </form>

        <DialogFooter className="border-t px-6 py-4 flex-shrink-0 bg-background">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting} onClick={handleSubmit}>
            {teacher ? "Atualizar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
