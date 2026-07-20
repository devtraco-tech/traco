import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Modal Kit — primitivos reutilizáveis para o padrão de modais
 * "Clínico Alta Fidelidade": cabeçalho fixo, corpo rolável, rodapé fixo,
 * campos legíveis e seleção tátil clara.
 *
 * Uso dentro de <DialogContent className="modal-shell">:
 *   <ModalHeaderBar>...</ModalHeaderBar>
 *   <ModalBody>...</ModalBody>
 *   <ModalFooterBar>...</ModalFooterBar>
 */

/* -------------------------------------------------------------------------- */
/* Estrutura                                                                   */
/* -------------------------------------------------------------------------- */

export function ModalHeaderBar({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "shrink-0 flex items-center justify-between gap-4 px-6 py-5 border-b border-border bg-background",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function ModalBody({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex-1 overflow-y-auto bg-muted/30 px-6 py-6 space-y-8", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function ModalFooterBar({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "shrink-0 flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-background",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function ModalAvatar({
  initials,
  active = false,
  className,
}: {
  initials: React.ReactNode;
  active?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("relative shrink-0", className)}>
      <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-lg border-2 border-emerald-50 uppercase">
        {initials}
      </div>
      {active && (
        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-white rounded-full flex items-center justify-center">
          <Check className="w-3 h-3 text-white" strokeWidth={3} />
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Seções e informação                                                        */
/* -------------------------------------------------------------------------- */

export function SectionTitle({
  children,
  count,
  className,
}: {
  children: React.ReactNode;
  count?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground">{children}</h3>
      {count !== undefined && count !== null && (
        <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
          {count}
        </span>
      )}
    </div>
  );
}

export function InfoCard({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4 bg-background p-5 rounded-2xl border border-border shadow-sm",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function InfoField({
  label,
  value,
  className,
  valueClassName,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  className?: string;
  valueClassName?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em]">{label}</span>
      <div className={cn("text-sm font-semibold text-foreground break-words", valueClassName)}>
        {value ?? "--"}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Seleção tátil                                                              */
/* -------------------------------------------------------------------------- */

export function SelectableCard({
  label,
  description,
  selected,
  onClick,
  icon,
  className,
}: {
  label: React.ReactNode;
  description?: React.ReactNode;
  selected: boolean;
  onClick?: () => void;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center justify-center text-center gap-2 p-4 rounded-xl border-2 transition-all active:scale-[0.98]",
        selected
          ? "border-emerald-500 bg-emerald-50/60 text-emerald-700 shadow-sm ring-1 ring-emerald-100"
          : "border-border bg-background text-muted-foreground hover:border-slate-300",
        className,
      )}
    >
      {selected && (
        <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
          <Check className="w-2.5 h-2.5 text-white" strokeWidth={4} />
        </span>
      )}
      {icon ? (
        <span className="mb-0.5">{icon}</span>
      ) : (
        !selected && <span className="w-5 h-5 rounded-full border-2 border-slate-200" />
      )}
      <span className="text-xs font-bold uppercase leading-tight">{label}</span>
      {description && <span className="text-[11px] font-medium opacity-70 leading-tight">{description}</span>}
    </button>
  );
}

export function CheckRow({
  label,
  description,
  checked,
  onChange,
  className,
}: {
  label: React.ReactNode;
  description?: React.ReactNode;
  checked: boolean;
  onChange?: (checked: boolean) => void;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all select-none",
        checked ? "border-emerald-500 bg-emerald-50/60" : "border-border bg-background hover:border-slate-300",
        className,
      )}
    >
      <span
        className={cn(
          "shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors",
          checked ? "border-emerald-500 bg-emerald-500" : "border-slate-300 bg-background",
        )}
      >
        {checked && <Check className="w-3 h-3 text-white" strokeWidth={4} />}
      </span>
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={(e) => onChange?.(e.target.checked)}
      />
      <span className="flex flex-col">
        <span className={cn("text-sm font-semibold", checked ? "text-emerald-800" : "text-foreground")}>{label}</span>
        {description && <span className="text-xs text-muted-foreground">{description}</span>}
      </span>
    </label>
  );
}

/* -------------------------------------------------------------------------- */
/* Urgência segmentada                                                        */
/* -------------------------------------------------------------------------- */

type UrgencyLevel = "baixa" | "media" | "alta";

const URGENCY_STYLES: Record<UrgencyLevel, { label: string; active: string }> = {
  baixa: { label: "Baixa", active: "border-emerald-400 bg-emerald-50 text-emerald-700" },
  media: { label: "Média", active: "border-amber-400 bg-amber-50 text-amber-700" },
  alta: { label: "Alta", active: "border-red-400 bg-red-50 text-red-700" },
};

export function SegmentedUrgency({
  value,
  onChange,
  className,
}: {
  value: UrgencyLevel;
  onChange?: (value: UrgencyLevel) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex gap-2", className)}>
      {(Object.keys(URGENCY_STYLES) as UrgencyLevel[]).map((level) => {
        const active = value === level;
        return (
          <button
            key={level}
            type="button"
            aria-pressed={active}
            onClick={() => onChange?.(level)}
            className={cn(
              "flex-1 py-3 px-2 rounded-lg border text-[11px] font-bold uppercase transition-all",
              active
                ? cn("border-2", URGENCY_STYLES[level].active)
                : "border-border bg-background text-muted-foreground hover:bg-muted/50",
            )}
          >
            {URGENCY_STYLES[level].label}
          </button>
        );
      })}
    </div>
  );
}
