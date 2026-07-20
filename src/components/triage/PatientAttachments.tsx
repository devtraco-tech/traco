import { useRef } from "react";
import { usePatientAttachments } from "@/hooks/usePatientAttachments";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, FileText, ImageIcon, Trash2, Download, Loader2 } from "lucide-react";

type Props = { patientId: string };

export function PatientAttachments({ patientId }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { attachments, isLoading, upload, remove } = usePatientAttachments(patientId);

  const handleSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const f of files) {
      await upload.mutateAsync({ file: f });
    }
    if (inputRef.current) inputRef.current.value = "";
  };

  const isImage = (a: { file_type: string | null; file_name: string }) =>
    (a.file_type || "").startsWith("image/")
    || /\.(jpe?g|png|gif|webp|heic)$/i.test(a.file_name);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-bold">Fotos e documentos</div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={upload.isPending}
        >
          {upload.isPending ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Upload className="h-4 w-4 mr-1" />
          )}
          Enviar
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
          className="hidden"
          onChange={handleSelect}
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : attachments.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum arquivo enviado.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {attachments.map((a) => (
            <Card key={a.id} className="p-2 group relative">
              {isImage(a) ? (
                <a href={a.file_url} target="_blank" rel="noreferrer">
                  <img
                    src={a.file_url}
                    alt={a.file_name}
                    className="w-full h-24 object-cover rounded"
                  />
                </a>
              ) : (
                <a
                  href={a.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex flex-col items-center justify-center h-24 bg-muted rounded text-muted-foreground hover:text-foreground"
                >
                  <FileText className="h-8 w-8" />
                  <span className="text-[10px] mt-1">Documento</span>
                </a>
              )}
              <div className="text-xs mt-1 truncate" title={a.file_name}>
                {a.file_name}
              </div>
              <div className="flex items-center justify-between mt-1">
                <a
                  href={a.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary hover:underline flex items-center"
                >
                  <Download className="h-3 w-3 mr-1" /> Abrir
                </a>
                <button
                  onClick={() => {
                    if (confirm("Remover este arquivo?")) remove.mutate(a);
                  }}
                  className="text-rose-500 hover:text-rose-700"
                  title="Remover"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
