import { useMemo } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PasswordStrengthIndicatorProps {
  password: string;
}

interface Requirement {
  label: string;
  met: boolean;
}

export const PasswordStrengthIndicator = ({ password }: PasswordStrengthIndicatorProps) => {
  const requirements: Requirement[] = useMemo(() => [
    { label: "Mínimo 8 caracteres", met: password.length >= 8 },
    { label: "Uma letra maiúscula", met: /[A-Z]/.test(password) },
    { label: "Uma letra minúscula", met: /[a-z]/.test(password) },
    { label: "Um número", met: /[0-9]/.test(password) },
  ], [password]);

  const strength = useMemo(() => {
    const metCount = requirements.filter(r => r.met).length;
    if (metCount === 0) return { level: 0, label: "", color: "" };
    if (metCount === 1) return { level: 1, label: "Muito fraca", color: "bg-destructive" };
    if (metCount === 2) return { level: 2, label: "Fraca", color: "bg-orange-500" };
    if (metCount === 3) return { level: 3, label: "Média", color: "bg-yellow-500" };
    return { level: 4, label: "Forte", color: "bg-green-500" };
  }, [requirements]);

  const isValid = requirements.every(r => r.met);

  if (!password) return null;

  return (
    <div className="space-y-3 mt-2">
      {/* Strength bar */}
      <div className="space-y-1">
        <div className="flex gap-1">
          {[1, 2, 3, 4].map((level) => (
            <div
              key={level}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                level <= strength.level ? strength.color : "bg-muted"
              )}
            />
          ))}
        </div>
        {strength.label && (
          <p className={cn(
            "text-xs font-medium",
            strength.level <= 2 ? "text-destructive" : 
            strength.level === 3 ? "text-yellow-600" : "text-green-600"
          )}>
            Força: {strength.label}
          </p>
        )}
      </div>

      {/* Requirements checklist */}
      <div className="grid grid-cols-2 gap-1">
        {requirements.map((req, index) => (
          <div
            key={index}
            className={cn(
              "flex items-center gap-1.5 text-xs",
              req.met ? "text-green-600" : "text-muted-foreground"
            )}
          >
            {req.met ? (
              <Check className="h-3 w-3" />
            ) : (
              <X className="h-3 w-3" />
            )}
            <span>{req.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const validatePasswordStrength = (password: string): boolean => {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password)
  );
};
