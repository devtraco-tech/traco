import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Upload, X, FileText } from "lucide-react";
import { useFileUpload } from "@/hooks/useFileUpload";

interface FileUploadFieldProps {
  label: string;
  value?: string;
  onChange: (url: string) => void;
  accept?: string;
  required?: boolean;
}

export const FileUploadField = ({ label, value, onChange, accept = ".pdf,.doc,.docx,.xls,.xlsx", required }: FileUploadFieldProps) => {
  const [fileName, setFileName] = useState<string | undefined>(value ? value.split('/').pop() : undefined);
  const { uploadFile, isUploading } = useFileUpload();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert("O arquivo deve ter no máximo 10MB");
      return;
    }

    setFileName(file.name);

    // Upload to Supabase
    const url = await uploadFile(file, "course-documents");
    if (url) {
      onChange(url);
    }
  };

  const handleRemove = () => {
    setFileName(undefined);
    onChange("");
  };

  return (
    <div className="space-y-2">
      <Label>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      
      {fileName ? (
        <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted">
          <FileText className="h-5 w-5 text-primary" />
          <span className="flex-1 text-sm truncate">{fileName}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <label
          htmlFor={`upload-${label}`}
          className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer block hover:border-primary hover:bg-muted/50 transition-colors"
        >
          <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
          <span className="text-sm text-muted-foreground hover:text-foreground">
            Clique para fazer upload ou arraste o arquivo
          </span>
          <p className="text-xs text-muted-foreground mt-1">PDF, DOC, XLS até 10MB</p>
          <input
            id={`upload-${label}`}
            type="file"
            accept={accept}
            className="hidden"
            onChange={handleFileChange}
            disabled={isUploading}
          />
        </label>
      )}
      
      {isUploading && (
        <p className="text-sm text-muted-foreground">Fazendo upload...</p>
      )}
    </div>
  );
};
