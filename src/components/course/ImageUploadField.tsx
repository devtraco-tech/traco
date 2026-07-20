import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Upload, X } from "lucide-react";
import { useFileUpload } from "@/hooks/useFileUpload";

interface ImageUploadFieldProps {
  label: string;
  value?: string;
  onChange: (url: string) => void;
  required?: boolean;
}

export const ImageUploadField = ({ label, value, onChange, required }: ImageUploadFieldProps) => {
  const [preview, setPreview] = useState<string | undefined>(value);
  const { uploadFile, isUploading } = useFileUpload();

  // Sync preview with value prop
  useEffect(() => {
    setPreview(value);
  }, [value]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Por favor, selecione apenas imagens");
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("A imagem deve ter no máximo 5MB");
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to Supabase
    const url = await uploadFile(file, "course-photos");
    if (url) {
      onChange(url);
    }
  };

  const handleRemove = () => {
    setPreview(undefined);
    onChange("");
  };

  return (
    <div className="space-y-2">
      <Label>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      
      {preview ? (
        <div className="relative">
          <img
            src={preview}
            alt="Preview"
            className="w-full h-48 object-cover rounded-lg"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2"
            onClick={handleRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <label
          htmlFor={`upload-${label}`}
          className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer block hover:border-primary hover:bg-muted/50 transition-colors"
        >
          <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <span className="text-sm text-muted-foreground hover:text-foreground">
            Clique para fazer upload ou arraste uma imagem
          </span>
          <input
            id={`upload-${label}`}
            type="file"
            accept="image/*"
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
