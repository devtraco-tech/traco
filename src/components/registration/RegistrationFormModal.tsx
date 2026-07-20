import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCourses } from "@/hooks/useCourses";
import { useProfiles } from "@/hooks/useProfiles";
import { useRegistrations } from "@/hooks/useRegistrations";
import { AlertCircle } from "lucide-react";

interface RegistrationFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { course_id: string; user_id: string; notes?: string }) => void;
  isSubmitting: boolean;
}

export const RegistrationFormModal = ({
  open,
  onClose,
  onSubmit,
  isSubmitting,
}: RegistrationFormModalProps) => {
  const { courses } = useCourses();
  const { profiles } = useProfiles();
  const { getAvailableVacancies } = useRegistrations();
  
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [notes, setNotes] = useState("");
  const [vacancyInfo, setVacancyInfo] = useState<{ total: number; occupied: number; available: number } | null>(null);

  useEffect(() => {
    if (selectedCourse) {
      getAvailableVacancies(selectedCourse).then(setVacancyInfo);
    } else {
      setVacancyInfo(null);
    }
  }, [selectedCourse]);

  useEffect(() => {
    if (!open) {
      setSelectedCourse("");
      setSelectedUser("");
      setNotes("");
      setVacancyInfo(null);
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      course_id: selectedCourse,
      user_id: selectedUser,
      notes: notes.trim() || undefined,
    });
  };

  const approvedCourses = courses?.filter(c => c.status === "approved" || c.status === "in_progress");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Nova Matrícula</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="course">Curso *</Label>
            <select
              id="course"
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              required
              className="w-full h-10 px-3 rounded-md border border-input bg-background mt-2"
            >
              <option value="">Selecione um curso</option>
              {approvedCourses?.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title} - {course.area}
                </option>
              ))}
            </select>
          </div>

          {vacancyInfo && (
            <div className={`p-3 rounded-md ${vacancyInfo.available > 0 ? "bg-green-500/10 text-green-700" : "bg-red-500/10 text-red-700"}`}>
              <div className="flex items-center gap-2">
                {vacancyInfo.available <= 0 && <AlertCircle className="h-4 w-4" />}
                <p className="text-sm font-medium">
                  Vagas: {vacancyInfo.available} disponíveis de {vacancyInfo.total} 
                  ({vacancyInfo.occupied} ocupadas)
                </p>
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="user">Estudante *</Label>
            <select
              id="user"
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              required
              className="w-full h-10 px-3 rounded-md border border-input bg-background mt-2"
            >
              <option value="">Selecione um estudante</option>
              {profiles?.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name} - {profile.email}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Adicione observações sobre a matrícula..."
              className="mt-2"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !selectedCourse || !selectedUser || (vacancyInfo && vacancyInfo.available <= 0)}
            >
              Matricular
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
