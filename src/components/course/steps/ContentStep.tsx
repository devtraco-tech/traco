import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageUploadField } from "../ImageUploadField";
import { useToast } from "@/hooks/use-toast";

interface StepProps {
  data: any;
  onNext: (data: any) => void;
  onPrevious: () => void;
  isAdmin?: boolean;
  canEditCourses?: boolean;
}

export const ContentStep = ({ data, onNext, onPrevious }: StepProps) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    photo_1_url: data.photo_1_url || "",
    photo_2_url: data.photo_2_url || "",
    photo_3_url: data.photo_3_url || "",
    photo_4_url: data.photo_4_url || "",
    banner_desktop_url: data.banner_desktop_url || "",
    banner_mobile_url: data.banner_mobile_url || "",
    description: data.description || "",
    differentials: data.differentials || "",
    program: data.program || "",
    periodicity: data.periodicity || "",
    duration: data.duration || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate that at least 1 photo is uploaded
    if (!formData.photo_1_url || formData.photo_1_url.trim().length === 0) {
      toast({
        title: "Foto obrigatória",
        description: "Por favor, faça upload de pelo menos 1 foto antes de continuar.",
        variant: "destructive",
      });
      return;
    }
    
    onNext(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label className="text-lg font-semibold">Fotos do Curso*</Label>
          <p className="text-sm text-muted-foreground mt-1">
            Selecione pelo menos 1 imagem de alta qualidade para a comunicação do seu curso. Você pode adicionar até 4 fotos.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ImageUploadField
            label="Foto 1 (Obrigatória)"
            value={formData.photo_1_url}
            onChange={(url) => setFormData({ ...formData, photo_1_url: url })}
            required
          />
          
          <ImageUploadField
            label="Foto 2 (Opcional)"
            value={formData.photo_2_url}
            onChange={(url) => setFormData({ ...formData, photo_2_url: url })}
          />
          
          <ImageUploadField
            label="Foto 3 (Opcional)"
            value={formData.photo_3_url}
            onChange={(url) => setFormData({ ...formData, photo_3_url: url })}
          />
          
          <ImageUploadField
            label="Foto 4 (Opcional)"
            value={formData.photo_4_url}
            onChange={(url) => setFormData({ ...formData, photo_4_url: url })}
          />
        </div>
      </div>

      {/* Banners do Site */}
      <div className="space-y-4 pt-6 border-t">
        <div>
          <Label className="text-lg font-semibold">🖼️ Banners do Site</Label>
          <p className="text-sm text-muted-foreground mt-1">
            Imagens que aparecerão no header da página pública do curso. Use imagens nas dimensões recomendadas para melhor visualização.
          </p>
        </div>
        
        <div className="grid grid-cols-1 gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">🖥️</span>
              <Label>Banner Desktop</Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Dimensões recomendadas: 1920x600px (formato paisagem)
            </p>
            <ImageUploadField
              label=""
              value={formData.banner_desktop_url}
              onChange={(url) => setFormData({ ...formData, banner_desktop_url: url })}
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">📱</span>
              <Label>Banner Mobile</Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Dimensões recomendadas: 800x600px (formato mais compacto)
            </p>
            <ImageUploadField
              label=""
              value={formData.banner_mobile_url}
              onChange={(url) => setFormData({ ...formData, banner_mobile_url: url })}
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Apresentação do Curso*</Label>
        <Textarea
          id="description"
          placeholder="Descreva a apresentação do curso"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={4}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="differentials">Diferenciais</Label>
        <Textarea
          id="differentials"
          placeholder="Liste os principais diferenciais do curso"
          value={formData.differentials}
          onChange={(e) => setFormData({ ...formData, differentials: e.target.value })}
          rows={4}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="program">Programa do Curso*</Label>
        <Textarea
          id="program"
          placeholder="Descreva o programa completo do curso..."
          value={formData.program}
          onChange={(e) => setFormData({ ...formData, program: e.target.value })}
          rows={8}
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="periodicity">Periodicidade*</Label>
          <Input
            id="periodicity"
            placeholder="Ex: Semanal, Quinzenal, Mensal"
            value={formData.periodicity}
            onChange={(e) => setFormData({ ...formData, periodicity: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="duration">Duração*</Label>
          <Input
            id="duration"
            placeholder="Ex: 40 horas, 3 meses, 6 semanas"
            value={formData.duration}
            onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="flex justify-between pt-6">
        <Button type="button" variant="outline" onClick={onPrevious}>
          Anterior
        </Button>
        <Button type="submit">Próximo</Button>
      </div>
    </form>
  );
};
