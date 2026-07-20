/**
 * Componente de controle de acessibilidade de tamanho de fonte.
 * Persiste a preferência do usuário via localStorage e aplica
 * a escala diretamente no elemento <html> via a propriedade font-size.
 */
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ALargeSmall, Minus, Plus, RotateCcw } from "lucide-react";

/** Tamanho base do navegador em px (100% = 16px) */
const BASE_SIZE = 16;
const MIN_SIZE = 12;
const MAX_SIZE = 24;
const STEP = 1;
const STORAGE_KEY = "app-font-size-px";

function getStoredSize(): number {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const val = parseInt(stored, 10);
      if (!isNaN(val) && val >= MIN_SIZE && val <= MAX_SIZE) return val;
    }
  } catch {}
  return BASE_SIZE;
}

function applySize(px: number) {
  document.documentElement.style.fontSize = `${px}px`;
}

export function FontSizeControl() {
  const [size, setSize] = useState<number>(getStoredSize);

  // Aplica e persiste ao montar e sempre que mudar
  useEffect(() => {
    applySize(size);
    try {
      localStorage.setItem(STORAGE_KEY, String(size));
    } catch {}
  }, [size]);

  const increase = () => setSize((s) => Math.min(s + STEP, MAX_SIZE));
  const decrease = () => setSize((s) => Math.max(s - STEP, MIN_SIZE));
  const reset = () => setSize(BASE_SIZE);

  const isBase = size === BASE_SIZE;
  const isMax = size === MAX_SIZE;
  const isMin = size === MIN_SIZE;

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className="flex items-center gap-1 border border-border rounded-lg px-1 py-0.5 bg-background"
        role="group"
        aria-label="Controle de tamanho de fonte"
      >
        {/* Ícone decorativo */}
        <ALargeSmall className="h-3.5 w-3.5 text-muted-foreground mx-0.5 shrink-0" aria-hidden="true" />

        {/* Diminuir */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              id="font-size-decrease"
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded"
              onClick={decrease}
              disabled={isMin}
              aria-label="Diminuir tamanho da fonte"
            >
              <Minus className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Diminuir fonte</TooltipContent>
        </Tooltip>

        {/* Indicador de nível */}
        <span
          className="text-[10px] font-bold text-muted-foreground w-7 text-center tabular-nums select-none"
          aria-live="polite"
          aria-label={`Tamanho atual da fonte: ${size} pixels`}
        >
          {size}px
        </span>

        {/* Aumentar */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              id="font-size-increase"
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded"
              onClick={increase}
              disabled={isMax}
              aria-label="Aumentar tamanho da fonte"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Aumentar fonte</TooltipContent>
        </Tooltip>

        {/* Restaurar */}
        {!isBase && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                id="font-size-reset"
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded text-muted-foreground hover:text-foreground"
                onClick={reset}
                aria-label="Restaurar tamanho original da fonte"
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Restaurar original</TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}

/**
 * Hook para aplicar o tamanho salvo assim que o app carrega,
 * mesmo antes do componente de controle montar.
 * Use no ponto mais alto da árvore (ex: App.tsx ou ThemeProvider).
 */
export function useInitFontSize() {
  useEffect(() => {
    applySize(getStoredSize());
  }, []);
}
