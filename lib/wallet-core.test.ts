import { describe, expect, it } from "vitest";
import { applyLines } from "@/lib/wallet-core";
import { createState, TREASURY } from "@/lib/wallet-state";

describe("applyLines", () => {
  it("posts a balanced transfer atomically and updates both balances", () => {
    const state = createState(new Date("2026-10-03T10:00:00.000Z"));
    const sara = "USR-1001";
    const kian = "USR-1002";
    const beforeSara = state.balances[sara]!;
    const beforeKian = state.balances[kian]!;
    const amount = 25_000_000;

    const posted = applyLines(state, state.seq + 1, [
      { ownerId: sara, side: "DEBIT", amount, instrument: "IRR" },
      { ownerId: kian, side: "CREDIT", amount, instrument: "IRR" },
    ]);

    expect(posted.ok).toBe(true);
    if (!posted.ok) return;
    expect(posted.result.lines).toHaveLength(2);
    expect(posted.result.balances[sara]).toBe(beforeSara - amount);
    expect(posted.result.balances[kian]).toBe(beforeKian + amount);
    expect(state.balances[sara]).toBe(beforeSara);
  });

  it("rejects a customer debit that would go negative and writes no lines", () => {
    const state = createState(new Date("2026-10-03T10:00:00.000Z"));
    const sara = "USR-1001";
    const held = state.balances[sara]!;

    const posted = applyLines(state, state.seq + 1, [
      { ownerId: sara, side: "DEBIT", amount: held + 1, instrument: "IRR" },
      { ownerId: TREASURY, side: "CREDIT", amount: held + 1, instrument: "IRR" },
    ]);

    expect(posted.ok).toBe(false);
    if (posted.ok) return;
    expect(posted.failure.ownerId).toBe(sara);
    expect(posted.failure.held).toBe(held);
    expect(posted.failure.needed).toBe(held + 1);
  });

  it("allows an internal book to go negative as the other side of a liability", () => {
    const state = createState(new Date("2026-10-03T10:00:00.000Z"));
    const sara = "USR-1001";
    const amount = 10_000;

    const posted = applyLines(state, state.seq + 1, [
      { ownerId: TREASURY, side: "DEBIT", amount, instrument: "IRR" },
      { ownerId: sara, side: "CREDIT", amount, instrument: "IRR" },
    ]);

    expect(posted.ok).toBe(true);
    if (!posted.ok) return;
    expect(posted.result.balances[TREASURY]).toBe((state.balances[TREASURY] ?? 0) - amount);
    expect(posted.result.balances[sara]).toBe((state.balances[sara] ?? 0) + amount);
  });
});
