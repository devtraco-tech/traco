import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useTeachers, Teacher } from "@/hooks/useTeachers";
import { TeacherFormModal } from "@/components/teacher/TeacherFormModal";

interface StepProps {
  data: any;
  onNext: (data: any) => void;
  onPrevious: () => void;
  isAdmin?: boolean;
  canEditCourses?: boolean;
}

export const CourseDetailsStep = ({ data, onNext, onPrevious }: StepProps) => {
  const { teachers, createTeacher } = useTeachers(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    classCount: data.classCount || "",
    totalWorkload: data.totalWorkload || "",
    theoreticalWorkload: data.theoreticalWorkload || "",
    practicalWorkload: data.practicalWorkload || "",
    nature: data.nature || "",
    language: data.language || "",
    teacher_id: data.teacher_id || "",
    otherProfessors: data.otherProfessors || "",
    maxStudents: data.maxStudents || "",
    courseMaterials: data.courseMaterials ?? false,
    requiredEquipment: data.requiredEquipment || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext(formData);
  };

  const handleCreateTeacher = (teacherData: Omit<Teacher, "id" | "created_at" | "updated_at">) => {
    createTeacher.mutate(teacherData, {
      onSuccess: (newTeacher) => {
        setModalOpen(false);
        setFormData({ ...formData, teacher_id: newTeacher.id });
      },
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2">
          <Label htmlFor="classCount">Número de turmas*</Label>
          <Input
            id="classCount"
            type="number"
            value={formData.classCount}
            onChange={(e) => setFormData({ ...formData, classCount: e.target.value })}
            placeholder="Ex: 1"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="totalWorkload">Carga horária total (horas)*</Label>
          <Input
            id="totalWorkload"
            type="number"
            value={formData.totalWorkload}
            onChange={(e) => setFormData({ ...formData, totalWorkload: e.target.value })}
            placeholder="Ex: 360"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="theoreticalWorkload">Carga horária teórica (horas)</Label>
          <Input
            id="theoreticalWorkload"
            type="number"
            value={formData.theoreticalWorkload}
            onChange={(e) => setFormData({ ...formData, theoreticalWorkload: e.target.value })}
            placeholder="Ex: 180"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="practicalWorkload">Carga horária prática (horas)</Label>
          <Input
            id="practicalWorkload"
            type="number"
            value={formData.practicalWorkload}
            onChange={(e) => setFormData({ ...formData, practicalWorkload: e.target.value })}
            placeholder="Ex: 180"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="nature">Natureza*</Label>
          <Input
            id="nature"
            type="text"
            value={formData.nature}
            onChange={(e) => setFormData({ ...formData, nature: e.target.value })}
            placeholder="Ex: Teórico-prática"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="language">Idioma*</Label>
          <Select value={formData.language} onValueChange={(value) => setFormData({ ...formData, language: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o idioma" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Português">Português</SelectItem>
              <SelectItem value="Inglês">Inglês</SelectItem>
              <SelectItem value="Espanhol">Espanhol</SelectItem>
            </SelectContent>
          </Select>
        </div>

      </div>

      <div className="space-y-4 mt-6">
        <Label>Professor Principal</Label>
        <p className="text-sm text-muted-foreground">
          Selecione o professor responsável pelo curso
        </p>
        <Select value={formData.teacher_id} onValueChange={(value) => setFormData({ ...formData, teacher_id: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione um professor" />
          </SelectTrigger>
          <SelectContent>
            {teachers?.map((teacher) => (
              <SelectItem key={teacher.id} value={teacher.id}>
                {teacher.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" variant="secondary" className="w-full" onClick={() => setModalOpen(true)}>
          Cadastrar Novo Professor
        </Button>
      </div>

      <div className="space-y-4 mt-6">
        <Label>Demais professores</Label>
        <Textarea
          placeholder="Digite os nomes dos professores..."
          value={formData.otherProfessors}
          onChange={(e) => setFormData({ ...formData, otherProfessors: e.target.value })}
          rows={4}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="maxStudents">Número de vagas mín/máximas/estudante*</Label>
          <p className="text-xs text-muted-foreground">Exemplo: 5/25/4</p>
          <Input
            id="maxStudents"
            value={formData.maxStudents}
            onChange={(e) => setFormData({ ...formData, maxStudents: e.target.value })}
            placeholder="Ex: 5/25/4"
            required
          />
        </div>

        <div className="space-y-2 flex items-center gap-2 pt-8">
          <Switch
            id="courseMaterials"
            checked={formData.courseMaterials}
            onCheckedChange={(checked) => setFormData({ ...formData, courseMaterials: checked })}
          />
          <Label htmlFor="courseMaterials">Materiais fornecidos pelo curso?</Label>
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="requiredEquipment">Equipamentos necessários</Label>
          <p className="text-xs text-muted-foreground">
            Informe os preços de algum equipamento a ser ABO dique, Lampejo, motor da implantada, etc
          </p>
          <Input
            id="requiredEquipment"
            value={formData.requiredEquipment}
            onChange={(e) => setFormData({ ...formData, requiredEquipment: e.target.value })}
            placeholder="Ex: Motor de implante, kit cirúrgico"
          />
        </div>
      </div>

      <div className="flex justify-between pt-6">
        <Button type="button" variant="outline" onClick={onPrevious}>
          Anterior
        </Button>
        <Button type="submit">Próximo</Button>
      </div>

      <TeacherFormModal
        teacher={null}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreateTeacher}
        isSubmitting={createTeacher.isPending}
      />
    </form>
  );
};
