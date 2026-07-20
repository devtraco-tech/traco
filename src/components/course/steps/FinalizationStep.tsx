import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import { useState } from "react";

interface StepProps {
  data: any;
  onPrevious: () => void;
  onSubmit: (data: any) => void;
  isSubmitting?: boolean;
  isAdmin?: boolean;
  canEditCourses?: boolean;
}

export const FinalizationStep = ({ data, onPrevious, onSubmit, isSubmitting }: StepProps) => {
  const [observations, setObservations] = useState(data.observations || "");
  const [agreed, setAgreed] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ ...data, observations });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-accent/50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-success" />
          Resumo do Curso
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Nome:</p>
            <p className="font-medium text-foreground">{data.name || "teste"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Categoria:</p>
            <p className="font-medium text-foreground">{data.area || "Cirurgia"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Tipo de Curso:</p>
            <p className="font-medium text-foreground">{data.courseType || "Especialização"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Carga Horária:</p>
            <p className="font-medium text-foreground">{data.totalWorkload || "1"}h</p>
          </div>
          <div>
            <p className="text-muted-foreground">Idioma:</p>
            <p className="font-medium text-foreground">{data.language || "Português"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Vagas:</p>
            <p className="font-medium text-foreground">{data.maxStudents || "23/80"}</p>
          </div>
          <div className="md:col-span-2">
            <p className="text-muted-foreground">Preço:</p>
            <p className="font-medium text-foreground">R$ {data.totalValue || "2400"}</p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="observations">Observações Adicionais</Label>
        <Textarea
          id="observations"
          placeholder="Adicione qualquer observação adicional sobre o curso"
          value={observations}
          onChange={(e) => setObservations(e.target.value)}
          rows={4}
        />
      </div>

      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Checkbox
              id="agreement"
              checked={agreed}
              onCheckedChange={(checked) => setAgreed(checked as boolean)}
            />
            <label
              htmlFor="agreement"
              className="text-sm text-muted-foreground leading-relaxed cursor-pointer"
            >
              Declaro que todas as informações fornecidas no cadastro deste curso são verdadeiras e estou ciente de que o curso passará pela análise do departamento antes da aprovação.*
            </label>
          </div>
        </CardContent>
      </Card>

        <div className="flex gap-4">
          <Button type="button" variant="outline" onClick={onPrevious} className="flex-1">
            Anterior
          </Button>
          <Button type="submit" disabled={!agreed || isSubmitting} className="flex-1">
            {isSubmitting ? "Criando..." : "Finalizar e Criar Curso"}
          </Button>
        </div>
    </form>
  );
};
