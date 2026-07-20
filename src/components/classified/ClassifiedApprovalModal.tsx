import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useApproveClassified, useRejectClassified, type Classified } from "@/hooks/useClassifieds";
import { CheckCircle, XCircle } from "lucide-react";

interface ClassifiedApprovalModalProps {
  classified: Classified;
  open: boolean;
  onClose: () => void;
}

export function ClassifiedApprovalModal({ classified, open, onClose }: ClassifiedApprovalModalProps) {
  const [notes, setNotes] = useState("");
  const [action, setAction] = useState<"approve" | "reject" | null>(null);
  const approveClassified = useApproveClassified();
  const rejectClassified = useRejectClassified();

  const handleApprove = () => {
    approveClassified.mutate(
      { id: classified.id, notes },
      {
        onSuccess: () => {
          onClose();
          setNotes("");
          setAction(null);
        },
      }
    );
  };

  const handleReject = () => {
    if (!notes.trim()) {
      return;
    }
    rejectClassified.mutate(
      { id: classified.id, notes },
      {
        onSuccess: () => {
          onClose();
          setNotes("");
          setAction(null);
        },
      }
    );
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      vaga: "Vaga",
      produto: "Produto",
      servico: "Serviço",
      outros: "Outros",
    };
    return labels[category] || category;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Revisar Classificado</DialogTitle>
          <DialogDescription>
            Analise o conteúdo e aprove ou rejeite o anúncio
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">{classified.title}</h3>
            <div className="flex gap-2 mb-4">
              <Badge variant="outline">{getCategoryLabel(classified.category)}</Badge>
              {classified.price && (
                <Badge variant="secondary">R$ {classified.price.toLocaleString("pt-BR")}</Badge>
              )}
              {classified.location && (
                <Badge variant="outline">{classified.location}</Badge>
              )}
            </div>
          </div>

          {(classified.photo_1_url || classified.photo_2_url || classified.photo_3_url) && (
            <div>
              <Label className="mb-2 block">Fotos:</Label>
              <div className="grid grid-cols-3 gap-2">
                {classified.photo_1_url && (
                  <img src={classified.photo_1_url} alt="Foto 1" className="w-full h-32 object-cover rounded" />
                )}
                {classified.photo_2_url && (
                  <img src={classified.photo_2_url} alt="Foto 2" className="w-full h-32 object-cover rounded" />
                )}
                {classified.photo_3_url && (
                  <img src={classified.photo_3_url} alt="Foto 3" className="w-full h-32 object-cover rounded" />
                )}
              </div>
            </div>
          )}

          <div>
            <Label className="mb-2 block">Descrição:</Label>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{classified.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-1 block">Contato:</Label>
              <p className="text-sm">{classified.contact_name}</p>
              <p className="text-sm text-muted-foreground">{classified.contact_email}</p>
              {classified.contact_phone && (
                <p className="text-sm text-muted-foreground">{classified.contact_phone}</p>
              )}
            </div>
            {classified.expires_at && (
              <div>
                <Label className="mb-1 block">Expira em:</Label>
                <p className="text-sm">{new Date(classified.expires_at).toLocaleDateString("pt-BR")}</p>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="review-notes" className="mb-2 block">
              Notas de Revisão {action === "reject" && <span className="text-destructive">*</span>}
            </Label>
            <Textarea
              id="review-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                action === "reject"
                  ? "Explique o motivo da rejeição..."
                  : "Adicione comentários sobre a revisão (opcional)"
              }
              rows={4}
            />
            {action === "reject" && !notes.trim() && (
              <p className="text-sm text-destructive mt-1">Obrigatório informar o motivo da rejeição</p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="outline"
            className="text-destructive hover:bg-destructive/10"
            onClick={() => {
              setAction("reject");
              if (notes.trim()) handleReject();
            }}
            disabled={approveClassified.isPending || rejectClassified.isPending}
          >
            <XCircle className="h-4 w-4 mr-2" />
            Rejeitar
          </Button>
          <Button
            variant="default"
            className="bg-green-600 hover:bg-green-700"
            onClick={() => {
              setAction("approve");
              handleApprove();
            }}
            disabled={approveClassified.isPending || rejectClassified.isPending}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Aprovar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
