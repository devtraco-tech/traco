/**
 * Remove tudo que não é dígito do CPF.
 */
export const normalizeCpf = (s: string | null | undefined): string => {
  if (!s) return "";
  return String(s).replace(/\D/g, "");
};

/**
 * Verifica se uma string contém 11 dígitos (formato válido de CPF, sem checagem dos dígitos verificadores).
 */
export const isValidCpfFormat = (s: string | null | undefined): boolean => {
  return normalizeCpf(s).length === 11;
};

/**
 * Formata CPF "12345678901" => "123.456.789-01"
 */
export const formatCpf = (s: string | null | undefined): string => {
  const n = normalizeCpf(s);
  if (n.length !== 11) return s || "";
  return `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6, 9)}-${n.slice(9, 11)}`;
};
