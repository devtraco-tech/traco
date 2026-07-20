import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Rocket } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface CoursePublishModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (effectiveDate: Date) => void;
  courseTitle: string;
  isSubmitting: boolean;
}

export const CoursePublishModal = ({
  open,
  onClose,
  onConfirm,
  courseTitle,
  isSubmitting,
}: CoursePublishModalProps) => {
  const [date, setDate] = useState<Date>();

  const handleConfirm = () => {
    if (date) {
      onConfirm(date);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            Publicar Curso
          </DialogTitle>
          <DialogDescription>
            Você está prestes a publicar o curso <strong>"{courseTitle}"</strong>. 
            Todas as validações pendentes serão aprovadas automaticamente.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="effective-date" className="text-sm font-medium">
              Data Efetiva de Início*
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP", { locale: ptBR }) : <span>Selecione a data oficial</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              Esta é a data que será exibida para os estudantes no site público.
            </p>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={!date || isSubmitting}
            className="bg-primary hover:bg-primary/90"
          >
            {isSubmitting ? "Publicando..." : "Confirmar e Publicar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
