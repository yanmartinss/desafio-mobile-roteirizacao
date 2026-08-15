export function validateReading(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return "A leitura é obrigatória.";
  }
  if (!/^[0-9]+$/.test(trimmed)) {
    return "Informe um valor numérico válido (somente números inteiros).";
  }
  return null;
}
