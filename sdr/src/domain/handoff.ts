import type { HandoffReason } from "./types.js";

export type HandoffDecision = {
  shouldHandoff: boolean;
  reason?: HandoffReason;
  interruptFlow?: boolean;
};

const RULES: Array<{ reason: HandoffReason; pattern: RegExp; interruptFlow?: boolean }> = [
  {
    reason: "explicit_request",
    pattern:
      /\b(falar|conversar)\s+com\s+(um\s+|uma\s+)?(humano|atendente|pessoa|consultor)|\b(atendente|humano)\b/iu,
    interruptFlow: true,
  },
  {
    reason: "commercial_high_intent",
    pattern:
      /\b(quero|desejo|vou)\s+(me\s+)?(matricular|inscrever)|\bcomo\s+(faço|faco)\s+(a\s+)?(matrícula|matricula|inscrição|inscricao)/iu,
  },
  {
    reason: "commercial_high_intent",
    pattern:
      /\b(desconto|negociar|parcelamento|parcelar|formas? de pagamento|meios? de pagamento|pagamento|pagar|pix|boleto|cart[aã]o|entrada)\b/iu,
    interruptFlow: true,
  },
  {
    reason: "sensitive_topic",
    pattern:
      /\b(reembolso|cancelamento|reclamação|reclamacao|processo judicial|diagnóstico|diagnostico|tratamento médico|tratamento medico)\b/iu,
    interruptFlow: true,
  },
];

export function evaluateHandoff(text: string): HandoffDecision {
  for (const rule of RULES) {
    if (rule.pattern.test(text)) {
      return {
        shouldHandoff: true,
        reason: rule.reason,
        ...(rule.interruptFlow ? { interruptFlow: true } : {}),
      };
    }
  }

  return { shouldHandoff: false };
}

export function shouldInterruptCurrentFlow(decision: HandoffDecision): boolean {
  return decision.shouldHandoff && decision.interruptFlow === true;
}
