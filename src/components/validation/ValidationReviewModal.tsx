import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Validation } from "@/hooks/useValidations";

interface ValidationReviewModalProps {
  validation: Validation | null;
  open: boolean;
  onClose: () => void;
  onReview: (validationId: string, status: "approved" | "rejected" | "pending_correction", reviewNotes: string) => void;
  isSubmitting: boolean;
}

export const ValidationReviewModal = ({
  validation,
  open,
  onClose,
  onReview,
  isSubmitting,
}: ValidationReviewModalProps) => {
  const [reviewNotes, setReviewNotes] = useState("");

  const handleReview = (status: "approved" | "rejected" | "pending_correction") => {
    if (!validation) return;
    onReview(validation.id, status, reviewNotes);
    setReviewNotes("");
  };

  if (!validation) return null;

  const statusColors = {
    pending_review: "bg-yellow-500",
    approved: "bg-green-500",
    rejected: "bg-red-500",
    pending_correction: "bg-orange-500",
  };

  const statusLabels = {
    pending_review: "Pendente",
    approved: "Aprovado",
    rejected: "Rejeitado",
    pending_correction: "Alterações Solicitadas",
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Revisar Validação</DialogTitle>
          <DialogDescription>
            Analise as informações do curso e aprove ou rejeite a validação
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-semibold">Curso</Label>
              <p className="text-sm">{validation.courses.title}</p>
            </div>
            <div>
              <Label className="text-sm font-semibold">Área</Label>
              <p className="text-sm">{validation.courses.area}</p>
            </div>
            <div>
              <Label className="text-sm font-semibold">Departamento</Label>
              <p className="text-sm">{validation.departments.name}</p>
            </div>
            <div>
              <Label className="text-sm font-semibold">Status Atual</Label>
              <Badge className={statusColors[validation.status]}>
                {statusLabels[validation.status]}
              </Badge>
            </div>
          </div>

          {validation.submission_notes && (
            <div>
              <Label className="text-sm font-semibold">Observações da Submissão</Label>
              <p className="text-sm bg-muted p-3 rounded-md">{validation.submission_notes}</p>
            </div>
          )}

          {validation.review_notes && (
            <div>
              <Label className="text-sm font-semibold">Notas de Revisão Anterior</Label>
              <p className="text-sm bg-muted p-3 rounded-md">{validation.review_notes}</p>
            </div>
          )}

          <div>
            <Label htmlFor="review-notes">Notas de Revisão</Label>
            <Textarea
              id="review-notes"
              placeholder="Adicione suas observações sobre esta validação..."
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              rows={4}
              className="mt-2"
            />
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button
            variant="destructive"
            onClick={() => handleReview("rejected")}
            disabled={isSubmitting || !reviewNotes.trim()}
          >
            <XCircle className="mr-2 h-4 w-4" />
            Rejeitar
          </Button>
          <Button
            variant="outline"
            onClick={() => handleReview("pending_correction")}
            disabled={isSubmitting || !reviewNotes.trim()}
          >
            <AlertCircle className="mr-2 h-4 w-4" />
            Solicitar Alterações
          </Button>
          <Button
            onClick={() => handleReview("approved")}
            disabled={isSubmitting}
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Aprovar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
