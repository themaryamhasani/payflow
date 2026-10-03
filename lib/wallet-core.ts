import { formatQuantity, maskName } from "@/lib/format";
import {
  ASSETS,
  CAPABILITIES,
  CURRENCIES,
  FUNDS,
  TIERS,
  type Capability,
  type Tier,
  instrumentDecimals,
  unitValue,
} from "@/lib/catalog";
import {
  SYSTEM_IDS,
  SYSTEM_NAMES,
  type Account,
  type LedgerLine,
  type ResultView,
  type Transaction,
  type TxStatus,
  type TxType,
  type WalletState,
  type WalletStatus,
} from "@/lib/wallet-types";

export function digest(value: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `pf1$${hash.toString(16)}`;
}

export function reference() {
  return `PF${Math.floor(100_000_000 + Math.random() * 900_000_000)}`;
}

export function traceOk(seq: number) {
  return `TRC-${10_000 + seq}`;
}

export function traceErr() {
  return `ERR-${Math.floor(10_000 + Math.random() * 89_999)}`;
}

export function isSystem(id: string) {
  return SYSTEM_IDS.includes(id);
}

export function currentUser(state: WalletState) {
  if (!state.session) return null;
  return state.accounts.find((account) => account.id === state.session?.userId) ?? null;
}

export function currentWallet(state: WalletState) {
  if (!state.session) return null;
  return state.wallets[state.session.userId] ?? null;
}

export function walletBalance(state: WalletState, userId?: string) {
  const id = userId ?? state.session?.userId;
  if (!id) return 0;
  return state.balances[id] ?? 0;
}

export function availableBalance(state: WalletState) {
  const wallet = currentWallet(state);
  if (!wallet || wallet.status !== "ACTIVE") return 0;
  return walletBalance(state);
}

export function positionOf(state: WalletState, userId: string, instrument: string) {
  if (instrument === "IRR") return state.balances[userId] ?? 0;
  return state.positions[userId]?.[instrument] ?? 0;
}

export function heldInstruments(state: WalletState, userId: string, codes: string[]) {
  return codes.filter((code) => positionOf(state, userId, code) > 0);
}

export function portfolioValue(state: WalletState, userId: string) {
  const rial = state.balances[userId] ?? 0;
  const rest = Object.entries(state.positions[userId] ?? {}).reduce(
    (sum, [code, units]) => sum + units * unitValue(code),
    0,
  );
  return rial + rest;
}

export function walletIdOf(state: WalletState, userId: string) {
  return state.wallets[userId]?.id ?? `WLT-${userId.slice(-4)}`;
}

export function accountName(state: WalletState, id: string | null) {
  if (!id) return "درگاه پرداخت";
  if (SYSTEM_NAMES[id]) return SYSTEM_NAMES[id];
  return state.accounts.find((account) => account.id === id)?.name ?? "کاربر ناشناس";
}

export function directoryFor(state: WalletState) {
  const id = state.session?.userId;
  return state.accounts.filter(
    (account) => account.id !== id && account.status === "ACTIVE" && !account.system,
  );
}

export function visibleTransactions(state: WalletState) {
  const id = state.session?.userId;
  if (!id) return [];
  return state.transactions.filter((tx) => tx.parties.includes(id)).sort((a, b) => b.seq - a.seq);
}

export function directionFor(tx: Transaction, userId: string): "DEBIT" | "CREDIT" {
  const rial = tx.ledger.find((line) => line.ownerId === userId && line.instrument === "IRR");
  if (rial) return rial.side;
  if (tx.senderId === userId) return "DEBIT";
  return "CREDIT";
}

export function kycOf(state: WalletState, userId: string) {
  return state.kyc[userId] ?? null;
}

export function tierOf(state: WalletState, userId: string): Tier {
  return state.kyc[userId]?.tier ?? 0;
}

export function tierInfoOf(state: WalletState, userId: string) {
  return TIERS[tierOf(state, userId)];
}

export function dailyLimitOf(state: WalletState, userId: string) {
  return TIERS[tierOf(state, userId)].dailyLimit;
}

export function orderLimitOf(state: WalletState, userId: string) {
  return TIERS[tierOf(state, userId)].orderLimit;
}

export function capabilityOpen(state: WalletState, userId: string, capability: Capability) {
  return tierOf(state, userId) >= CAPABILITIES[capability].minTier;
}

export function capabilityGate(state: WalletState, userId: string, capability: Capability) {
  const info = CAPABILITIES[capability];
  const tier = tierOf(state, userId);
  if (tier >= info.minTier) return null;
  return `برای ${info.label} باید سطح احراز هویت دست‌کم ${TIERS[info.minTier].label} باشد. سطح کنونی شما ${TIERS[tier].label} است.`;
}

export function merchantOf(state: WalletState, userId: string) {
  return state.merchants.find((item) => item.userId === userId) ?? null;
}

export function cardsOf(state: WalletState, userId: string) {
  return state.cards.filter((item) => item.userId === userId);
}

export function loansOf(state: WalletState, userId: string) {
  return state.loans.filter((item) => item.userId === userId);
}

export function remittancesOf(state: WalletState, userId: string) {
  return state.remittances.filter((item) => item.userId === userId);
}

export function outstandingDebt(state: WalletState, userId: string) {
  return loansOf(state, userId)
    .flatMap((loan) => loan.installments)
    .filter((item) => !item.paidAt)
    .reduce((sum, item) => sum + item.total + item.lateFee, 0);
}

/** Rial leaving the wallet toward another party today, which is what the daily cap governs. */
export function dailyUsed(state: WalletState) {
  const id = state.session?.userId;
  if (!id) return 0;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const from = start.getTime();
  return state.transactions
    .filter(
      (tx) =>
        (tx.type === "TRANSFER" || tx.type === "REMITTANCE") &&
        tx.senderId === id &&
        (tx.status === "SUCCESS" || tx.status === "ON_HOLD") &&
        new Date(tx.createdAt).getTime() >= from,
    )
    .reduce((sum, tx) => sum + tx.amount, 0);
}

export function statusLabel(status: WalletStatus) {
  switch (status) {
    case "ACTIVE":
      return "فعال";
    case "SUSPENDED":
      return "معلق";
    case "BLOCKED":
      return "مسدود";
    case "CLOSED":
      return "بسته";
  }
}

export function txStatusLabel(status: TxStatus) {
  switch (status) {
    case "CREATED":
      return "ایجاد شده";
    case "PENDING":
      return "در انتظار";
    case "PROCESSING":
      return "در حال انجام";
    case "SUCCESS":
      return "موفق";
    case "FAILED":
      return "ناموفق";
    case "CANCELLED":
      return "لغو شده";
    case "REVERSED":
      return "برگشت‌خورده";
    case "ON_HOLD":
      return "در بازبینی";
  }
}

const TYPE_LABELS: Record<TxType, string> = {
  TOP_UP: "شارژ",
  TRANSFER: "انتقال",
  REVERSAL: "برگشت وجه",
  FX_CONVERT: "تبدیل ارز",
  CRYPTO_BUY: "خرید رمزارز",
  CRYPTO_SELL: "فروش رمزارز",
  FUND_BUY: "صدور واحد صندوق",
  FUND_REDEEM: "ابطال واحد صندوق",
  REMITTANCE: "حواله بین‌المللی",
  LOAN_DISBURSE: "پرداخت اعتبار",
  INSTALLMENT: "پرداخت قسط",
  CARD_ISSUE: "صدور کارت",
  SETTLEMENT: "تسویه پذیرنده",
};

export function txTypeLabel(tx: Transaction, userId: string) {
  if (tx.type === "TRANSFER") return tx.senderId === userId ? "انتقال خروجی" : "انتقال ورودی";
  return TYPE_LABELS[tx.type];
}

export function instrumentUnitLabel(code: string) {
  if (code === "IRR") return "ریال";
  if (code in CURRENCIES) return CURRENCIES[code as keyof typeof CURRENCIES].label;
  if (code in ASSETS) return ASSETS[code as keyof typeof ASSETS].label;
  if (code in FUNDS) return "واحد";
  return code;
}

export function formatUnits(units: number, instrument: string) {
  return formatQuantity(units, instrumentDecimals(instrument));
}

export function effectLabel(tx: Transaction, userId: string) {
  if (tx.status === "PENDING" || tx.status === "PROCESSING" || tx.status === "CREATED") {
    return "موجودی هنوز تغییر نکرده";
  }
  if (tx.status === "ON_HOLD") return "مبلغ کنار گذاشته شده";
  if (tx.status !== "SUCCESS" && tx.status !== "REVERSED") return "بدون اثر بر موجودی";
  const line = tx.ledger.find((item) => item.ownerId === userId && item.instrument === "IRR");
  if (!line) {
    const other = tx.ledger.find((item) => item.ownerId === userId);
    if (!other) return "بدون اثر بر موجودی";
    return other.side === "DEBIT" ? "کاهش دارایی" : "افزایش دارایی";
  }
  return line.side === "DEBIT" ? "کسر از موجودی" : "افزایش موجودی";
}

export function counterpartyFor(state: WalletState, tx: Transaction, userId: string) {
  if (tx.type === "TOP_UP") return "درگاه پرداخت";
  const otherId = tx.senderId === userId ? tx.receiverId : tx.senderId;
  if (!otherId) return "درگاه پرداخت";
  return accountName(state, otherId);
}

export function counterpartyMasked(state: WalletState, tx: Transaction, userId: string) {
  const name = counterpartyFor(state, tx, userId);
  if (name === "درگاه پرداخت" || SYSTEM_NAMES[tx.senderId ?? ""] || SYSTEM_NAMES[tx.receiverId ?? ""]) {
    return name;
  }
  return maskName(name);
}

export function statusNote(status: WalletStatus) {
  switch (status) {
    case "ACTIVE":
      return "عملیات عادی مجاز است.";
    case "SUSPENDED":
      return "کیف پول در بررسی است. تا رفع محدودیت، انتقال خروجی ممکن نیست. شارژ همچنان ممکن است.";
    case "BLOCKED":
      return "کیف پول مسدود است. هیچ انتقال خروجی مجاز نیست. شارژ همچنان ممکن است.";
    case "CLOSED":
      return "کیف پول بسته است. عملیات جدید ممکن نیست.";
  }
}

export interface LineSpec {
  ownerId: string;
  side: "DEBIT" | "CREDIT";
  amount: number;
  instrument: string;
}

export interface PostResult {
  lines: LedgerLine[];
  balances: Record<string, number>;
  positions: Record<string, Record<string, number>>;
}

export interface PostFailure {
  ownerId: string;
  ownerName: string;
  instrument: string;
  needed: number;
  held: number;
}

/**
 * Applies every line or none. A customer account may never go negative; internal
 * books may, because they represent the other side of a liability.
 */
export function applyLines(
  state: WalletState,
  seq: number,
  specs: LineSpec[],
): { ok: true; result: PostResult } | { ok: false; failure: PostFailure } {
  const balances = { ...state.balances };
  const positions: Record<string, Record<string, number>> = {};
  for (const [owner, held] of Object.entries(state.positions)) {
    positions[owner] = { ...held };
  }
  const lines: LedgerLine[] = [];
  const suffix = "abcdefghij";

  for (const spec of specs) {
    const system = isSystem(spec.ownerId);
    const before =
      spec.instrument === "IRR"
        ? (balances[spec.ownerId] ?? 0)
        : (positions[spec.ownerId]?.[spec.instrument] ?? 0);
    if (spec.side === "DEBIT" && !system && before + 1e-9 < spec.amount) {
      return {
        ok: false,
        failure: {
          ownerId: spec.ownerId,
          ownerName: accountName(state, spec.ownerId),
          instrument: spec.instrument,
          needed: spec.amount,
          held: before,
        },
      };
    }
    const after = spec.side === "DEBIT" ? before - spec.amount : before + spec.amount;
    if (spec.instrument === "IRR") {
      balances[spec.ownerId] = after;
    } else {
      positions[spec.ownerId] = { ...(positions[spec.ownerId] ?? {}), [spec.instrument]: after };
    }
    lines.push({
      id: `LG-${seq}${suffix[lines.length] ?? lines.length}`,
      walletId: walletIdOf(state, spec.ownerId),
      ownerId: spec.ownerId,
      ownerName: accountName(state, spec.ownerId),
      side: spec.side,
      amount: spec.amount,
      before,
      after,
      instrument: spec.instrument,
      system: system || undefined,
    });
  }

  return { ok: true, result: { lines, balances, positions } };
}

export function resultOf(
  tx: Transaction,
  tone: ResultView["tone"],
  title: string,
  message: string,
  balanceChanged: boolean,
  extra: Partial<ResultView> = {},
): ResultView {
  return {
    tone,
    title,
    message,
    reference: tx.reference,
    traceId: tx.traceId,
    transactionId: tx.id,
    balanceChanged,
    code: tx.code,
    amount: tx.amount,
    ...extra,
  };
}

export function reject(state: WalletState, code: string, title: string, message: string): WalletState {
  return {
    ...state,
    lastResult: {
      tone: "bad",
      title,
      message,
      balanceChanged: false,
      code,
      balanceAfter: walletBalance(state),
    },
  };
}

export function rejectOps(state: WalletState, code: string, title: string, message: string): WalletState {
  return {
    ...state,
    opsResult: { tone: "bad", title, message, balanceChanged: false, code },
  };
}

export function replayResult(state: WalletState, prior: Transaction, userId: string): WalletState {
  const succeeded = prior.status === "SUCCESS" || prior.status === "ON_HOLD";
  return {
    ...state,
    lastResult: {
      tone: "neutral",
      title: "درخواست تکراری است",
      message: succeeded
        ? "همین کلید یکتاسازی قبلاً ثبت شده است. نتیجه قبلی برگشت و عمل تازه‌ای انجام نشد."
        : "همین درخواست قبلاً ناموفق بوده است. نتیجه قبلی برگشت و دارایی دوباره دست‌نخورده ماند.",
      reference: prior.reference,
      traceId: prior.traceId,
      transactionId: prior.id,
      balanceChanged: false,
      code: "IDEMPOTENT_REPLAY",
      amount: prior.amount,
      counterparty: counterpartyMasked(state, prior, userId),
      balanceAfter: walletBalance(state),
    },
  };
}

export function noticeFor(
  userId: string,
  id: string,
  title: string,
  body: string,
  transactionId?: string,
): WalletState["notices"][number] {
  return {
    id,
    userId,
    title,
    body,
    createdAt: new Date().toISOString(),
    read: false,
    delivery: "SENT",
    transactionId,
  };
}

export function accountById(state: WalletState, id: string): Account | null {
  return state.accounts.find((account) => account.id === id) ?? null;
}
