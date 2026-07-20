import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useProfiles } from "@/hooks/useProfiles";
import { Badge } from "@/components/ui/badge";

interface CourseCreatorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  courseTitle: string;
  currentCreatorId?: string;
  onSave: (courseId: string, newCreatorId: string) => void;
  isLoading?: boolean;
}

export function CourseCreatorModal({
  open,
  onOpenChange,
  courseId,
  courseTitle,
  currentCreatorId,
  onSave,
  isLoading,
}: CourseCreatorModalProps) {
  const { profiles, isLoading: profilesLoading } = useProfiles();
  const [selectedCreatorId, setSelectedCreatorId] = useState<string>("");

  useEffect(() => {
    if (currentCreatorId) {
      setSelectedCreatorId(currentCreatorId);
    }
  }, [currentCreatorId, open]);

  const handleSave = () => {
    if (selectedCreatorId) {
      onSave(courseId, selectedCreatorId);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Alterar Criador do Curso</DialogTitle>
          <DialogDescription>
            Selecione o usuário que será definido como criador do curso "{courseTitle}".
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="creator">Novo Criador</Label>
            <Select
              value={selectedCreatorId}
              onValueChange={setSelectedCreatorId}
              disabled={profilesLoading}
            >
              <SelectTrigger id="creator">
                <SelectValue placeholder={profilesLoading ? "Carregando..." : "Selecione um usuário"} />
              </SelectTrigger>
              <SelectContent>
                {profiles?.map((profile) => (
                  <SelectItem key={profile.id} value={profile.id}>
                    <div className="flex items-center gap-2">
                      <span>{profile.name}</span>
                      {profile.department?.name && (
                        <Badge variant="outline" className="text-xs">
                          {profile.department.name === 'coordenador' ? 'Coordenador' : profile.department.name}
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedCreatorId && profiles && (
            <p className="text-sm text-muted-foreground">
              Email: {profiles.find(p => p.id === selectedCreatorId)?.email}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={!selectedCreatorId || isLoading || selectedCreatorId === currentCreatorId}
          >
            {isLoading ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
