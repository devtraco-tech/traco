import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileUploadField } from "../FileUploadField";

interface StepProps {
  data: any;
  onNext: (data: any) => void;
  onPrevious: () => void;
  isAdmin?: boolean;
  canEditCourses?: boolean;
}

export const ScheduleStep = ({ data, onNext, onPrevious }: StepProps) => {
  const [formData, setFormData] = useState({
    schedule_file_url: data.schedule_file_url || "",
    materials_file_url: data.materials_file_url || "",
    project_file_url: data.project_file_url || "",
    competitors: data.competitors || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Arquivos do Curso</h3>
        
        <FileUploadField
          label="Cronograma"
          value={formData.schedule_file_url}
          onChange={(url) => setFormData({ ...formData, schedule_file_url: url })}
        />
        
        <FileUploadField
          label="Lista de Materiais"
          value={formData.materials_file_url}
          onChange={(url) => setFormData({ ...formData, materials_file_url: url })}
        />
        
        <FileUploadField
          label="Arquivo de Projeto"
          value={formData.project_file_url}
          onChange={(url) => setFormData({ ...formData, project_file_url: url })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="competitors">Concorrentes</Label>
        <p className="text-sm text-muted-foreground">
          Liste as instituições concorrentes e produtos similares oferecidos ao seu público-alvo
        </p>
        <Textarea
          id="competitors"
          placeholder="Digite os nomes das instituições concorrentes..."
          value={formData.competitors}
          onChange={(e) => setFormData({ ...formData, competitors: e.target.value })}
          rows={4}
        />
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
