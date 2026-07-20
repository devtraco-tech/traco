import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Upload, X, AlertCircle, Loader2 } from "lucide-react";
import { ImageCropper } from "./ImageCropper";
import { usePhotoUpload } from "@/hooks/usePhotoUpload";

interface PhotoUploadProps {
  currentPhotoUrl?: string;
  onPhotoChange: (photoUrl: string) => void;
  teacherId?: string;
}

/**
 * Photo Upload Component para Professores
 * 
 * Características:
 * - Upload de arquivo local
 * - URL externa
 * - Preview em tempo real
 * - Recorte interativo (1:1 aspect ratio)
 * - Validação de tamanho e tipo
 * - Otimização automática (400x400px)
 * - Persistência em Supabase Storage
 */
export const PhotoUpload = ({ currentPhotoUrl, onPhotoChange, teacherId }: PhotoUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string>(currentPhotoUrl || "");
  const [selectedImage, setSelectedImage] = useState<string>("");
  const [cropperOpen, setCropperOpen] = useState(false);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const { uploadBlob, deletePhoto, isUploading } = usePhotoUpload({
    folder: teacherId ? `teachers/${teacherId}` : "teachers",
  });

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

  const validateFile = (file: File): boolean => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Formato inválido. Use JPG, PNG ou WebP.");
      return false;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError("Arquivo muito grande. Máximo 5MB.");
      return false;
    }
    return true;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError("");
    const file = e.target.files?.[0];
    if (!file) return;

    if (!validateFile(file)) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      setSelectedImage(url);
      setCropperOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleUrlInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value.trim();
    if (url) {
      setError("");
      setSelectedImage(url);
      setCropperOpen(true);
    }
  };

  const handleCropComplete = async (croppedImageUrl: string) => {
    try {
      setLoading(true);
      setError("");

      // Converter Data URL para Blob
      const response = await fetch(croppedImageUrl);
      const blob = await response.blob();

      // Upload para Storage
      const publicUrl = await uploadBlob(blob);

      // Deletar foto anterior se existir
      if (currentPhotoUrl && currentPhotoUrl.includes(import.meta.env.VITE_SUPABASE_URL || "")) {
        try {
          await deletePhoto(currentPhotoUrl);
        } catch {
          // Se falhar ao deletar, continua mesmo assim
          console.warn("Erro ao deletar foto anterior");
        }
      }

      setPreviewUrl(publicUrl);
      onPhotoChange(publicUrl);
      setSelectedImage("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao fazer upload";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePhoto = async () => {
    try {
      if (previewUrl && previewUrl.includes(import.meta.env.VITE_SUPABASE_URL || "")) {
        await deletePhoto(previewUrl);
      }
      setPreviewUrl("");
      onPhotoChange("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      if (urlInputRef.current) {
        urlInputRef.current.value = "";
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao remover foto";
      setError(message);
    }
  };

  return (
    <div className="space-y-3">
      {/* Upload Options */}
      <Card className="border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Foto do Professor</CardTitle>
          <CardDescription className="text-xs">
            Aspecto: 1:1 | Tamanho: 400x400px
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Upload Methods */}
          <div className="space-y-2">
            {/* File Upload */}
            <div>
              <label className="text-xs font-medium mb-1 block">
                Upload de Arquivo
              </label>
              <div className="relative">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ALLOWED_TYPES.join(",")}
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={loading}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-xs"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading || isUploading}
                >
                  <Upload className="h-3 w-3 mr-2" />
                  Selecionar Arquivo
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Max 5MB (JPG, PNG, WebP)
              </p>
            </div>

            {/* URL Input */}
            <div>
              <label htmlFor="photo-url" className="text-xs font-medium mb-1 block">
                ou Cole a URL
              </label>
              <Input
                ref={urlInputRef}
                id="photo-url"
                type="url"
                placeholder="https://..."
                onChange={handleUrlInput}
                disabled={loading || isUploading}
                size={50}
                className="text-xs h-8"
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex gap-2 p-2 bg-red-50 border border-red-200 rounded text-xs">
              <AlertCircle className="h-3 w-3 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-800">{error}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview */}
      {previewUrl && (
        <Card className="border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col items-center gap-3">
              <div className="relative w-24 h-24 rounded overflow-hidden border border-primary bg-gray-100">
                <img
                  src={previewUrl}
                  alt="Foto do professor"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="text-center text-xs text-muted-foreground">
                <p>400x400px | Quadrado (1:1)</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 justify-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => {
                  setSelectedImage(previewUrl);
                  setCropperOpen(true);
                }}
                disabled={isUploading}
              >
                Ajustar
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs text-red-600 hover:text-red-700"
                onClick={handleRemovePhoto}
                disabled={isUploading}
              >
                {isUploading ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <X className="h-3 w-3 mr-1" />
                )}
                {isUploading ? "Removendo..." : "Remover"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Specs - Only show if no preview */}
      {!previewUrl && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-3">
            <div className="space-y-1 text-xs text-blue-900">
              <div className="flex gap-2">
                <span className="font-medium">✓</span>
                <span>Quadrado 1:1 | 400x400px</span>
              </div>
              <div className="flex gap-2">
                <span className="font-medium">✓</span>
                <span>JPG, PNG, WebP até 5MB</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Image Cropper Modal */}
      <ImageCropper
        open={cropperOpen}
        imageSrc={selectedImage}
        onClose={() => {
          setCropperOpen(false);
          setSelectedImage("");
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
          if (urlInputRef.current) {
            urlInputRef.current.value = "";
          }
        }}
        onCropComplete={handleCropComplete}
        aspectRatio={1}
      />
    </div>
  );
};
