/**
 * Image Utilities Hook
 * 
 * Padronização de fotos de professores
 */

interface ImageDimensions {
  width: number;
  height: number;
}

interface CropConfig {
  srcX: number;
  srcY: number;
  srcWidth: number;
  srcHeight: number;
  dstWidth: number;
  dstHeight: number;
}

/**
 * Redimensiona uma imagem mantendo aspecto
 * @param imageUrl - URL da imagem
 * @param maxWidth - Largura máxima
 * @param maxHeight - Altura máxima
 * @returns Dimensões calculadas
 */
export const calculateDimensions = (
  naturalWidth: number,
  naturalHeight: number,
  maxWidth: number,
  maxHeight: number
): ImageDimensions => {
  const aspectRatio = naturalWidth / naturalHeight;
  
  if (naturalWidth <= maxWidth && naturalHeight <= maxHeight) {
    return { width: naturalWidth, height: naturalHeight };
  }

  if (aspectRatio > maxWidth / maxHeight) {
    return {
      width: maxWidth,
      height: Math.round(maxWidth / aspectRatio),
    };
  }

  return {
    width: Math.round(maxHeight * aspectRatio),
    height: maxHeight,
  };
};

/**
 * Calcula a região de recorte centralizada para aspecto 1:1
 * @param imageWidth - Largura da imagem
 * @param imageHeight - Altura da imagem
 * @returns Configuração de recorte
 */
export const calculateCropBox = (
  imageWidth: number,
  imageHeight: number
): CropConfig => {
  const minDimension = Math.min(imageWidth, imageHeight);
  const cropX = (imageWidth - minDimension) / 2;
  const cropY = (imageHeight - minDimension) / 2;

  return {
    srcX: cropX,
    srcY: cropY,
    srcWidth: minDimension,
    srcHeight: minDimension,
    dstWidth: 400, // Tamanho final padrão
    dstHeight: 400,
  };
};

/**
 * Comprime uma imagem para blob
 * @param canvas - Canvas com imagem desenhada
 * @param quality - Qualidade (0-1)
 * @returns Promise com blob
 */
export const canvasToBlob = (
  canvas: HTMLCanvasElement,
  quality: number = 0.95
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to convert canvas to blob"));
        }
      },
      "image/jpeg",
      quality
    );
  });
};

/**
 * Cria URL a partir de blob
 * @param blob - Blob da imagem
 * @returns URL
 */
export const blobToUrl = (blob: Blob): string => {
  return URL.createObjectURL(blob);
};

/**
 * Otimiza imagem (redimensiona e comprime)
 * @param imageUrl - URL da imagem
 * @param targetWidth - Largura alvo (padrão 400)
 * @param targetHeight - Altura alvo (padrão 400)
 * @returns Promise com URL otimizada
 */
export const optimizeImage = (
  imageUrl: string,
  targetWidth: number = 400,
  targetHeight: number = 400
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = async () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }

        // Desenha a imagem redimensionada
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        const blob = await canvasToBlob(canvas, 0.9);
        const url = blobToUrl(blob);
        resolve(url);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error("Failed to load image"));
    };

    img.src = imageUrl;
  });
};

/**
 * Valida se a imagem é válida
 * @param file - Arquivo
 * @returns Booleano indicando se é válido
 */
export const isValidImageFile = (file: File): boolean => {
  const validTypes = ["image/jpeg", "image/png", "image/webp"];
  const maxSize = 5 * 1024 * 1024; // 5MB

  return validTypes.includes(file.type) && file.size <= maxSize;
};

/**
 * Obtém informações da imagem
 * @param imageUrl - URL da imagem
 * @returns Promise com dimensões
 */
export const getImageDimensions = (imageUrl: string): Promise<ImageDimensions> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };

    img.onerror = () => {
      reject(new Error("Failed to load image"));
    };

    img.src = imageUrl;
  });
};
