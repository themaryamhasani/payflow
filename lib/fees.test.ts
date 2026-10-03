import { describe, expect, it } from "vitest";
import { cryptoFee, fxFee, settlementFee, VAT_RATE } from "@/lib/fees";

describe("fee engine", () => {
  it("builds an FX quote with spread and VAT only on the fee", () => {
    const quote = fxFee(20_000_000);
    const spread = quote.components.find((item) => item.code === "SPREAD");
    const vat = quote.components.find((item) => item.code === "VAT");

    expect(spread).toBeTruthy();
    expect(vat).toBeTruthy();
    expect(spread!.amount).toBeGreaterThan(0);
    expect(vat!.amount).toBe(Math.round((spread!.amount * VAT_RATE) / 1_000) * 1_000);
    expect(quote.total).toBe(spread!.amount + vat!.amount);
    expect(quote.total).toBeLessThan(20_000_000);
  });

  it("applies a volume discount on larger crypto orders", () => {
    const small = cryptoFee("USDT", 10_000_000);
    const large = cryptoFee("USDT", 250_000_000);
    const smallSpread = small.components.find((item) => item.code === "SPREAD")!.amount / 10_000_000;
    const largeSpread = large.components.find((item) => item.code === "SPREAD")!.amount / 250_000_000;
    expect(largeSpread).toBeLessThan(smallSpread);
    expect(large.components.some((item) => item.rule.includes("تخفیف"))).toBe(true);
  });

  it("composes settlement MDR, fixed fee, and VAT with inspectable rules", () => {
    const quote = settlementFee(165_000_000, {
      category: "RETAIL",
      captures: 2,
      monthlyVolume: 0,
    });
    const codes = quote.components.map((item) => item.code);
    expect(codes).toContain("MDR");
    expect(codes).toContain("FIXED");
    expect(codes).toContain("VAT");
    expect(quote.components.every((item) => item.rule.length > 0)).toBe(true);
    expect(quote.total).toBe(quote.components.reduce((sum, item) => sum + item.amount, 0));
  });
});
