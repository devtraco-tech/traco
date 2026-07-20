import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "./use-toast";

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

interface PhotoUploadOptions {
  bucket?: string;
  folder?: string;
  maxSize?: number;
}

/**
 * Hook para upload de fotos para Supabase Storage
 * 
 * Características:
 * - Upload de Blob direto para Storage
 * - Nomes de arquivo únicos (UUID)
 * - Rastreamento de progresso
 * - Tratamento de erros
 * - URLs públicas geradas automaticamente
 */
export const usePhotoUpload = (options: PhotoUploadOptions = {}) => {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);

  const {
    bucket = "teacher-photos",
    folder = "teachers",
    maxSize = 5 * 1024 * 1024, // 5MB
  } = options;

  /**
   * Valida tamanho do arquivo
   */
  const validateSize = (blob: Blob): boolean => {
    if (blob.size > maxSize) {
      toast({
        title: "Arquivo muito grande",
        description: `Máximo permitido: ${(maxSize / 1024 / 1024).toFixed(1)}MB`,
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  /**
   * Gera nome único para arquivo
   */
  const generateFileName = (): string => {
    const timestamp = new Date().getTime();
    const random = Math.random().toString(36).substring(2, 15);
    return `${timestamp}-${random}.jpg`;
  };

  /**
   * Faz upload de blob para Storage
   */
  const uploadBlob = async (blob: Blob, customFileName?: string): Promise<string> => {
    try {
      if (!validateSize(blob)) {
        throw new Error("Arquivo excede tamanho máximo");
      }

      setIsUploading(true);
      setProgress({ loaded: 0, total: blob.size, percentage: 0 });

      const fileName = customFileName || generateFileName();
      const filePath = `${folder}/${fileName}`;

      // Fazer upload
      const { error: uploadError, data } = await supabase.storage
        .from(bucket)
        .upload(filePath, blob, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Obter URL pública
      const {
        data: { publicUrl },
      } = supabase.storage.from(bucket).getPublicUrl(filePath);

      setProgress({ loaded: blob.size, total: blob.size, percentage: 100 });

      return publicUrl;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao fazer upload";
      toast({
        title: "Erro no upload",
        description: message,
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsUploading(false);
      setProgress(null);
    }
  };

  /**
   * Deleta arquivo do Storage
   */
  const deletePhoto = async (photoUrl: string): Promise<void> => {
    try {
      // Extrai caminho da URL pública
      const url = new URL(photoUrl);
      const pathParts = url.pathname.split("/");
      const filePath = pathParts.slice(pathParts.indexOf(folder)).join("/");

      const { error } = await supabase.storage.from(bucket).remove([filePath]);

      if (error) {
        throw error;
      }

      toast({
        title: "Foto deletada",
        description: "A foto foi removida com sucesso",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao deletar foto";
      toast({
        title: "Erro ao deletar",
        description: message,
        variant: "destructive",
      });
      throw error;
    }
  };

  /**
   * Constrói URL pública a partir do caminho do arquivo
   */
  const getPublicUrl = (filePath: string): string => {
    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return publicUrl;
  };

  return {
    uploadBlob,
    deletePhoto,
    getPublicUrl,
    isUploading,
    progress,
  };
};
