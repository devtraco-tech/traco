import { useEffect, useState } from "react";

interface TeacherPhotoProps {
  photoUrl?: string;
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

/**
 * Componente para exibir foto de professor padronizada
 * 
 * Tamanho padrão: 400x400px (1:1 aspect ratio)
 * 
 * Sizes:
 * - sm: 64x64px (8rem)
 * - md: 128x128px (8rem)
 * - lg: 256x256px (16rem)
 * - xl: 400x400px (25rem)
 */
export const TeacherPhoto = ({
  photoUrl,
  name,
  size = "md",
  className = "",
}: TeacherPhotoProps) => {
  const sizeMap = {
    sm: "w-16 h-16",
    md: "w-32 h-32",
    lg: "w-64 h-64",
    xl: "w-full h-96",
  };

  const [imageError, setImageError] = useState(false);

  // Reset error when photoUrl changes
  useEffect(() => {
    setImageError(false);
  }, [photoUrl]);

  // Fallback: Avatar com inicial do nome
  if (!photoUrl || imageError) {
    return (
      <div
        className={`${sizeMap[size]} rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center ${className}`}
      >
        <span className="text-white font-bold text-2xl">
          {name.charAt(0).toUpperCase()}
        </span>
      </div>
    );
  }

  return (
    <div className={`${sizeMap[size]} rounded-lg overflow-hidden bg-gray-200 flex-shrink-0 ${className}`}>
      <img
        src={photoUrl}
        alt={`Foto de ${name}`}
        className="w-full h-full object-cover"
        onError={() => setImageError(true)}
      />
    </div>
  );
};
