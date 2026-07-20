import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ZoomIn, ZoomOut, Download } from "lucide-react";

interface ImageCropperProps {
  open: boolean;
  imageSrc: string;
  onClose: () => void;
  onCropComplete: (croppedImageUrl: string) => void;
  aspectRatio?: number; // Default 1:1 (square)
}

/**
 * Image Cropper Component
 * 
 * Padrão de Foto do Professor:
 * - Aspecto: 1:1 (quadrado)
 * - Tamanho recomendado: 400x400px
 * - Foco: Rosto do professor centralizado
 * 
 * Funcionalidades:
 * - Zoom (50% - 200%)
 * - Movimento livre
 * - Preview em tempo real
 * - Recorte automático no padrão 1:1
 */
export const ImageCropper = ({
  open,
  imageSrc,
  onClose,
  onCropComplete,
  aspectRatio = 1,
}: ImageCropperProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [zoom, setZoom] = useState(100);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);

  // Size of the crop area (will be square if aspectRatio = 1)
  const CROP_SIZE = 200;
  const CANVAS_SIZE = 350;

  useEffect(() => {
    if (open && imageSrc) {
      const img = new Image();
      img.onload = () => {
        if (imageRef.current) {
          imageRef.current.src = imageSrc;
          setImageLoaded(true);
          // Reset zoom and position when image loads
          setZoom(100);
          setOffsetX(0);
          setOffsetY(0);
        }
      };
      img.src = imageSrc;
    }
  }, [open, imageSrc]);

  // Draw preview
  useEffect(() => {
    if (!imageLoaded || !canvasRef.current || !imageRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const image = imageRef.current;

    // Draw the preview canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background grid
    ctx.fillStyle = "#f0f0f0";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw the image with zoom and offset
    const scale = zoom / 100;
    const scaledWidth = image.width * scale;
    const scaledHeight = image.height * scale;

    ctx.drawImage(
      image,
      offsetX,
      offsetY,
      scaledWidth,
      scaledHeight
    );

    // Draw crop frame (square)
    const frameSize = CROP_SIZE;
    const canvasCenter = CANVAS_SIZE / 2;
    const frameX = (canvas.width - frameSize) / 2;
    const frameY = (canvas.height - frameSize) / 2;

    // Draw semi-transparent overlay (dark areas outside crop)
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    // Top
    ctx.fillRect(0, 0, canvas.width, frameY);
    // Bottom
    ctx.fillRect(0, frameY + frameSize, canvas.width, frameY);
    // Left
    ctx.fillRect(0, frameY, frameX, frameSize);
    // Right
    ctx.fillRect(frameX + frameSize, frameY, frameX, frameSize);

    // Draw frame border
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.strokeRect(frameX, frameY, frameSize, frameSize);

    // Draw grid lines for better alignment
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 1;
    const thirdX = frameSize / 3;
    const thirdY = frameSize / 3;
    ctx.beginPath();
    ctx.moveTo(frameX + thirdX, frameY);
    ctx.lineTo(frameX + thirdX, frameY + frameSize);
    ctx.moveTo(frameX + 2 * thirdX, frameY);
    ctx.lineTo(frameX + 2 * thirdX, frameY + frameSize);
    ctx.moveTo(frameX, frameY + thirdY);
    ctx.lineTo(frameX + frameSize, frameY + thirdY);
    ctx.moveTo(frameX, frameY + 2 * thirdY);
    ctx.lineTo(frameX + frameSize, frameY + 2 * thirdY);
    ctx.stroke();
  }, [imageLoaded, zoom, offsetX, offsetY]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offsetX, y: e.clientY - offsetY });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !imageLoaded) return;

    const newOffsetX = e.clientX - dragStart.x;
    const newOffsetY = e.clientY - dragStart.y;

    setOffsetX(newOffsetX);
    setOffsetY(newOffsetY);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleCrop = () => {
    if (!canvasRef.current || !imageRef.current) return;

    const canvas = canvasRef.current;
    const image = imageRef.current;

    // Create a new canvas for the cropped image
    const cropCanvas = document.createElement("canvas");
    const cropCtx = cropCanvas.getContext("2d");
    if (!cropCtx) return;

    const frameSize = CROP_SIZE;
    const frameX = (canvas.width - frameSize) / 2;
    const frameY = (canvas.height - frameSize) / 2;

    // Set crop canvas size to 400x400px (standard size)
    cropCanvas.width = 400;
    cropCanvas.height = 400;

    // Calculate the crop position relative to the image
    const scale = zoom / 100;
    const cropStartX = (frameX - offsetX) / scale;
    const cropStartY = (frameY - offsetY) / scale;
    const cropSize = frameSize / scale;

    // Draw the cropped portion
    cropCtx.drawImage(
      image,
      cropStartX,
      cropStartY,
      cropSize,
      cropSize,
      0,
      0,
      400,
      400
    );

    // Convert to blob and create URL
    cropCanvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        onCropComplete(url);
        onClose();
      }
    }, "image/jpeg", 0.95);
  };

  const handleZoomChange = (value: number[]) => {
    setZoom(value[0]);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Recortar Foto</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Posicione o rosto no centro do quadrado
          </p>
        </DialogHeader>

        <div className="space-y-3">
          {/* Preview Canvas */}
          <div className="flex justify-center bg-muted rounded-lg overflow-hidden">
            <canvas
              ref={canvasRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className="cursor-move border border-border"
            />
          </div>

          {/* Hidden image for loading */}
          <img ref={imageRef} style={{ display: "none" }} alt="Foto do professor sendo recortada" />

          {/* Zoom Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Zoom</label>
              <span className="text-sm text-muted-foreground">{zoom}%</span>
            </div>
            <div className="flex items-center gap-2">
              <ZoomOut className="h-4 w-4 text-muted-foreground" />
              <Slider
                value={[zoom]}
                onValueChange={handleZoomChange}
                min={50}
                max={200}
                step={5}
                className="flex-1"
              />
              <ZoomIn className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Clique e arraste para posicionar a imagem
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleCrop} className="gap-2">
            <Download className="h-4 w-4" />
            Recortar e Usar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
