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
      /\b(falar|conversar)\s+com\s+(um\s+|uma\s+)?(humano|atendente|pessoa|consultor)|\b(atendente|humano)\b|\b(speak|talk)\s+(to|with)\s+(a\s+)?(human|person|agent|representative|advisor)|\bhuman agent\b|\b(hablar|conversar)\s+con\s+(un\s+|una\s+)?(humano|persona|agente|asesor|atendente)|\bagente humano\b/iu,
    interruptFlow: true,
  },
  {
    reason: "commercial_high_intent",
    pattern:
      /\b(quero|desejo|vou)\s+(me\s+)?(matricular|inscrever)|\bcomo\s+(faço|faco)\s+(a\s+)?(matrícula|matricula|inscrição|inscricao)|\b(i want to|how (can|do) i)\s+(enroll|register)|\b(quiero|deseo)\s+(inscribirme|matricularme)|\bcómo\s+(puedo\s+)?(inscribirme|matricularme)/iu,
  },
  {
    reason: "commercial_high_intent",
    pattern:
      /\b(desconto|negociar|parcelamento|parcelar|formas? de pagamento|meios? de pagamento|pagamento|pagar|pix|boleto|cart[aã]o|entrada|discount|negotiate|installments?|payment|pay|credit card|descuento|negociar|cuotas|formas? de pago|pago|pagar|tarjeta)\b/iu,
    interruptFlow: true,
  },
  {
    reason: "sensitive_topic",
    pattern:
      /\b(reembolso|cancelamento|reclamação|reclamacao|processo judicial|diagnóstico|diagnostico|tratamento médico|tratamento medico|refund|cancellation|complaint|lawsuit|diagnosis|medical treatment|reembolso|cancelación|cancelacion|queja|demanda|diagnóstico|diagnostico|tratamiento médico|tratamiento medico)\b/iu,
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
