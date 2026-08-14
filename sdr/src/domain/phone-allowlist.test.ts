import { describe, expect, it } from "vitest";
import { isPhoneAllowed, maskPhoneNumber, normalizePhoneNumber } from "./phone-allowlist.js";

describe("lista de números permitidos", () => {
  it("compara números independentemente da formatação", () => {
    expect(normalizePhoneNumber("+55 (62) 99999-0000")).toBe("5562999990000");
    expect(isPhoneAllowed("+55 (62) 99999-0000", ["5562999990000"])).toBe(true);
  });

  it("bloqueia números ausentes e mascara logs", () => {
    expect(isPhoneAllowed("5562888880000", ["5562999990000"])).toBe(false);
    expect(maskPhoneNumber("5562999990000")).toBe("5562***0000");
  });
});
