import { validateReading } from "../validateReading";

describe("validateReading", () => {
  it("rejects an empty value", () => {
    expect(validateReading("")).toBe("A leitura é obrigatória.");
  });

  it("rejects a whitespace-only value", () => {
    expect(validateReading("   ")).toBe("A leitura é obrigatória.");
  });

  it("rejects a non-numeric value", () => {
    expect(validateReading("abc")).toBe(
      "Informe um valor numérico válido (somente números inteiros).",
    );
  });

  it("accepts a valid numeric string", () => {
    expect(validateReading("12932")).toBeNull();
  });

  it("rejects a decimal numeric string", () => {
    expect(validateReading("12932.5")).toBe(
      "Informe um valor numérico válido (somente números inteiros).",
    );
  });

  it("rejects a negative numeric string", () => {
    expect(validateReading("-100")).toBe(
      "Informe um valor numérico válido (somente números inteiros).",
    );
  });
});
