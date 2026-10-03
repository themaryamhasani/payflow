import { formatGrouped, toPersianDigits } from "@/lib/format";
import {
  ASSETS,
  CARD_ISSUE_FEE,
  CATEGORIES,
  CORRIDORS,
  CREDIT_CEILING,
  CREDIT_RATE,
  CURRENCIES,
  FUNDS,
  TIERS,
  type Tier,
} from "@/lib/catalog";
import {
  cardIssueFee,
  cryptoFee,
  fundBuyFee,
  fundRedeemFee,
  fxFee,
  lateFee,
  remittanceFee,
  settlementFee,
  type FeeQuote,
} from "@/lib/fees";
import {
  ACQUIRER,
  CREDIT_BOOK,
  CUSTODY,
  MARKET,
  NOSTRO,
  TREASURY,
  type Account,
  type Action,
  type AuditAction,
  type AuditEntry,
  type Card,
  type Installment,
  type KycCheck,
  type Loan,
  type Remittance,
  type Transaction,
  type TxType,
  type WalletRecord,
  type WalletState,
} from "@/lib/wallet-types";
import {
  applyLines,
  capabilityGate,
  currentUser,
  currentWallet,
  dailyLimitOf,
  dailyUsed,
  formatUnits,
  loansOf,
  merchantOf,
  noticeFor,
  orderLimitOf,
  positionOf,
  reference,
  reject,
  rejectOps,
  replayResult,
  resultOf,
  statusNote,
  tierOf,
  traceErr,
  traceOk,
  walletBalance,
  type LineSpec,
} from "@/lib/wallet-core";

const DAY = 86_400_000;
const FX_MARKUP = 1.015;

export function validNationalId(value: string) {
  if (!/^\d{10}$/.test(value)) return false;
  if (/^(\d)\1{9}$/.test(value)) return false;
  let sum = 0;
  for (let index = 0; index < 9; index += 1) {
    sum += Number(value[index]) * (10 - index);
  }
  const remainder = sum % 11;
  const check = Number(value[9]);
  return remainder < 2 ? check === remainder : check === 11 - remainder;
}

function round(value: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function auditOf(
  seq: number,
  action: AuditAction,
  entity: string,
  from: string,
  to: string,
  reason: string,
): AuditEntry {
  return {
    id: `AUD-${seq}`,
    actor: "سامانه PayFlow",
    action,
    entity,
    from,
    to,
    reason,
    createdAt: new Date().toISOString(),
  };
}

interface CommitInput {
  type: TxType;
  /** Rial value of the movement, used for history and limits. */
  amount: number;
  fee: number;
  description: string;
  senderId: string | null;
  receiverId: string | null;
  specs: LineSpec[];
  key?: string;
  scope?: string;
  feeQuote?: FeeQuote;
  leg?: Transaction["leg"];
  status?: Transaction["status"];
  settlesAt?: string;
  linkId?: string;
  failTitle: string;
}

type Commit =
  | { ok: true; state: WalletState; tx: Transaction }
  | { ok: false; state: WalletState };

/**
 * Writes one transaction and all of its ledger lines together. When any line cannot
 * be posted, nothing moves and a failed record is kept so the attempt stays visible.
 */
function commit(state: WalletState, input: CommitInput): Commit {
  const userId = state.session!.userId;
  const seq = state.seq + 1;
  const posted = applyLines(state, seq, input.specs);
  const keyPath = input.key && input.scope ? `${userId}:${input.scope}:${input.key}` : null;

  if (!posted.ok) {
    const { failure } = posted;
    const tx: Transaction = {
      seq,
      id: `TX-${10_000 + seq}`,
      reference: reference(),
      traceId: traceErr(),
      type: input.type,
      status: "FAILED",
      amount: input.amount,
      fee: input.fee,
      description: input.description,
      senderId: input.senderId,
      receiverId: input.receiverId,
      parties: [userId],
      createdAt: new Date().toISOString(),
      idempotencyKey: input.key,
      code: "INSUFFICIENT_BALANCE",
      ledger: [],
      feeQuote: input.feeQuote,
    };
    const unit = failure.instrument === "IRR" ? "ریال" : failure.instrument;
    return {
      ok: false,
      state: {
        ...state,
        seq,
        transactions: [...state.transactions, tx],
        idempotency: keyPath ? { ...state.idempotency, [keyPath]: tx.id } : state.idempotency,
        lastResult: resultOf(
          tx,
          "bad",
          input.failTitle,
          `دارایی کافی نیست. برای این عمل ${formatUnits(failure.needed, failure.instrument)} ${unit} لازم بود و ${formatUnits(failure.held, failure.instrument)} ${unit} موجود است. هیچ سطر دفترکلی نوشته نشد.`,
          false,
          { balanceAfter: walletBalance(state) },
        ),
      },
    };
  }

  const tx: Transaction = {
    seq,
    id: `TX-${10_000 + seq}`,
    reference: reference(),
    traceId: traceOk(seq),
    type: input.type,
    status: input.status ?? "SUCCESS",
    amount: input.amount,
    fee: input.fee,
    description: input.description,
    senderId: input.senderId,
    receiverId: input.receiverId,
    parties: [userId],
    createdAt: new Date().toISOString(),
    idempotencyKey: input.key,
    code: input.status === "PENDING" ? "ACCEPTED" : input.status === "ON_HOLD" ? "COMPLIANCE_HOLD" : "SUCCESS",
    ledger: posted.result.lines,
    feeQuote: input.feeQuote,
    leg: input.leg,
    settlesAt: input.settlesAt,
    linkId: input.linkId,
  };
  const wallet = state.wallets[userId];

  return {
    ok: true,
    tx,
    state: {
      ...state,
      seq,
      balances: posted.result.balances,
      positions: posted.result.positions,
      wallets: wallet ? { ...state.wallets, [userId]: { ...wallet, version: wallet.version + 1 } } : state.wallets,
      transactions: [...state.transactions, tx],
      idempotency: keyPath ? { ...state.idempotency, [keyPath]: tx.id } : state.idempotency,
    },
  };
}

type Guard =
  | { ok: false; state: WalletState }
  | { ok: true; user: Account; wallet: WalletRecord };

function guard(state: WalletState, capability: Parameters<typeof capabilityGate>[2] | null): Guard {
  const user = currentUser(state);
  const wallet = currentWallet(state);
  if (!user || !wallet) return { ok: false, state };
  if (user.status !== "ACTIVE") {
    return {
      ok: false,
      state: reject(state, "USER_NOT_ACTIVE", "حساب فعال نیست", "تا فعال شدن حساب، عملیات مالی انجام نمی‌شود."),
    };
  }
  if (wallet.status !== "ACTIVE") {
    return {
      ok: false,
      state: reject(
        state,
        wallet.status === "CLOSED" ? "WALLET_CLOSED" : "WALLET_NOT_ACTIVE",
        "کیف پول فعال نیست",
        statusNote(wallet.status),
      ),
    };
  }
  if (capability) {
    const blocked = capabilityGate(state, user.id, capability);
    if (blocked) {
      return { ok: false, state: reject(state, "KYC_TIER_REQUIRED", "سطح احراز هویت کافی نیست", blocked) };
    }
  }
  return { ok: true, user, wallet };
}

function replay(state: WalletState, scope: string, key: string) {
  const userId = state.session?.userId;
  if (!userId) return null;
  const priorId = state.idempotency[`${userId}:${scope}:${key}`];
  if (!priorId) return null;
  const prior = state.transactions.find((tx) => tx.id === priorId);
  if (!prior) return null;
  return replayResult(state, prior, userId);
}

function orderTooLarge(state: WalletState, userId: string, rial: number) {
  const limit = orderLimitOf(state, userId);
  if (rial <= limit) return null;
  return `سقف هر سفارش در سطح ${TIERS[tierOf(state, userId)].label} برابر ${formatGrouped(limit)} ریال است.`;
}

/* ---------------------------------- identity --------------------------------- */

const CHECK_LABELS: Record<KycCheck["code"], string> = {
  NATIONAL_ID: "تطبیق کد ملی و تاریخ تولد",
  DOCUMENT: "اصالت تصویر کارت ملی",
  LIVENESS: "تصویر زنده و تطبیق چهره",
  ADDRESS: "تأیید نشانی محل سکونت",
  SANCTIONS: "پالایش فهرست‌های تحریمی",
  PEP: "بررسی اشخاص دارای نفوذ سیاسی",
};

function checksFor(target: Tier): KycCheck["code"][] {
  if (target <= 1) return ["NATIONAL_ID"];
  if (target === 2) return ["NATIONAL_ID", "DOCUMENT", "LIVENESS"];
  return ["NATIONAL_ID", "DOCUMENT", "LIVENESS", "ADDRESS", "SANCTIONS", "PEP"];
}

function kycSubmit(state: WalletState, action: Extract<Action, { type: "KYC_SUBMIT" }>): WalletState {
  const user = currentUser(state);
  if (!user) return state;
  const profile = state.kyc[user.id];
  if (!profile) return state;
  if (action.targetTier <= profile.tier) {
    return reject(state, "TIER_NOT_HIGHER", "این سطح از قبل دارید", "سطح درخواستی باید بالاتر از سطح کنونی باشد.");
  }
  if (!validNationalId(action.nationalId.trim())) {
    return reject(
      state,
      "INVALID_NATIONAL_ID",
      "کد ملی پذیرفته نشد",
      "رقم کنترلی کد ملی با بقیه ارقام هم‌خوان نیست. پیش از ارسال به سامانه بیرونی، همین‌جا رد شد.",
    );
  }
  if (action.targetTier === 3 && (!action.address.trim() || !action.incomeSource.trim())) {
    return reject(
      state,
      "MISSING_FIELDS",
      "اطلاعات کامل نیست",
      "برای تأیید کامل، نشانی و منبع درآمد الزامی است.",
    );
  }
  const seq = state.seq + 1;
  const checks: KycCheck[] = checksFor(action.targetTier).map((code) => ({
    code,
    label: CHECK_LABELS[code],
    outcome: "PENDING",
    note: "در انتظار پاسخ سامانه بیرونی",
  }));
  return {
    ...state,
    seq,
    kyc: {
      ...state.kyc,
      [user.id]: {
        ...profile,
        status: "IN_REVIEW",
        targetTier: action.targetTier,
        providerRef: `KYC-${100_000 + seq}`,
        checks,
        nationalId: action.nationalId.trim(),
        updatedAt: new Date().toISOString(),
      },
    },
    lastResult: {
      tone: "neutral",
      title: "پرونده به سامانه بیرونی رفت",
      message: `پرونده برای ${TIERS[action.targetTier].label} ساخته شد. تا پاسخ ${profile.provider}، سطح و سقف‌ها تغییر نمی‌کند و هیچ پولی جابه‌جا نمی‌شود.`,
      balanceChanged: false,
      code: "KYC_IN_REVIEW",
      reference: `KYC-${100_000 + seq}`,
    },
  };
}

function kycResult(state: WalletState, action: Extract<Action, { type: "KYC_RESULT" }>): WalletState {
  const user = currentUser(state);
  if (!user) return state;
  const profile = state.kyc[user.id];
  if (!profile || profile.status !== "IN_REVIEW" || profile.targetTier === null) return state;
  const target = profile.targetTier;
  const seq = state.seq + 1;

  if (action.outcome === "PASS") {
    const checks = profile.checks.map((check) => ({
      ...check,
      outcome: "PASS" as const,
      note: "تأییدشده توسط سامانه بیرونی",
    }));
    const wallet = state.wallets[user.id]!;
    return {
      ...state,
      seq,
      kyc: {
        ...state.kyc,
        [user.id]: { ...profile, tier: target, status: "VERIFIED", targetTier: null, checks, updatedAt: new Date().toISOString() },
      },
      wallets: { ...state.wallets, [user.id]: { ...wallet, dailyLimit: TIERS[target].dailyLimit, version: wallet.version + 1 } },
      audits: [
        auditOf(seq, "KYC_TIER", profile.providerRef ?? user.id, TIERS[profile.tier].label, TIERS[target].label, "پاسخ مثبت سامانه احراز هویت"),
        ...state.audits,
      ],
      notices: [noticeFor(user.id, `NT-KYC-${seq}`, "سطح احراز هویت بالا رفت", `سطح ${TIERS[target].label} فعال شد و سقف روزانه تغییر کرد.`), ...state.notices],
      lastResult: {
        tone: "ok",
        title: "احراز هویت تأیید شد",
        message: `سطح ${TIERS[target].label} فعال شد. سقف روزانه به ${formatGrouped(TIERS[target].dailyLimit)} ریال رسید و قابلیت‌های این سطح باز شدند.`,
        balanceChanged: false,
        code: "KYC_VERIFIED",
      },
    };
  }

  const failing = action.outcome === "FAIL" ? "SANCTIONS" : "LIVENESS";
  const checks = profile.checks.map((check) => {
    if (check.code === failing || (action.outcome === "FAIL" && check.code === "PEP")) {
      return {
        ...check,
        outcome: action.outcome === "FAIL" ? ("FAIL" as const) : ("REFER" as const),
        note: action.outcome === "FAIL" ? "نتیجه منفی، پرونده بسته شد" : "نیازمند بررسی انسانی",
      };
    }
    return { ...check, outcome: "PASS" as const, note: "تأییدشده توسط سامانه بیرونی" };
  });

  return {
    ...state,
    seq,
    kyc: {
      ...state.kyc,
      [user.id]: {
        ...profile,
        status: action.outcome === "FAIL" ? "REJECTED" : "REFERRED",
        targetTier: action.outcome === "FAIL" ? null : target,
        checks,
        updatedAt: new Date().toISOString(),
      },
    },
    audits: [
      auditOf(
        seq,
        "KYC_TIER",
        profile.providerRef ?? user.id,
        TIERS[profile.tier].label,
        action.outcome === "FAIL" ? "رد شده" : "ارجاع به بررسی",
        action.outcome === "FAIL" ? "پاسخ منفی سامانه احراز هویت" : "نیاز به بررسی انسانی",
      ),
      ...state.audits,
    ],
    lastResult: {
      tone: "bad",
      title: action.outcome === "FAIL" ? "احراز هویت رد شد" : "پرونده به بررسی انسانی رفت",
      message:
        action.outcome === "FAIL"
          ? "سطح احراز هویت تغییر نکرد و قابلیت‌های این سطح باز نشد. دلیل دقیق از مسیر پشتیبانی پیگیری می‌شود."
          : "یکی از بررسی‌ها قطعی نشد و پرونده در صف بررسی انسانی است. سطح کنونی دست‌نخورده می‌ماند.",
      balanceChanged: false,
      code: action.outcome === "FAIL" ? "KYC_REJECTED" : "KYC_REFERRED",
    },
  };
}

/* ------------------------------- currency pockets ----------------------------- */

function fxConvert(state: WalletState, action: Extract<Action, { type: "FX_CONVERT" }>): WalletState {
  const prior = replay(state, "fx", action.key);
  if (prior) return prior;
  const gate = guard(state, "FX");
  if (!gate.ok) return gate.state;
  const { user } = gate;

  if (action.from === action.to) {
    return reject(state, "SAME_CURRENCY", "تبدیل معنا ندارد", "ارز مبدأ و مقصد یکی است.");
  }
  if (action.amount <= 0) {
    return reject(state, "INVALID_AMOUNT", "مبلغ نامعتبر است", "مبلغ باید بزرگ‌تر از صفر باشد.");
  }

  const notional = action.amount * CURRENCIES[action.from].mid;
  const tooLarge = orderTooLarge(state, user.id, notional);
  if (tooLarge) {
    return reject(state, "ORDER_LIMIT_EXCEEDED", "سفارش از سقف سطح شما بزرگ‌تر است", tooLarge);
  }
  const quote = fxFee(notional);
  const netRial = notional - quote.total;
  if (netRial <= 0) {
    return reject(state, "AMOUNT_TOO_SMALL", "مبلغ از کارمزد کمتر است", "مبلغ تبدیل باید از کارمزد بیشتر باشد.");
  }
  const toUnits = round(netRial / CURRENCIES[action.to].mid, CURRENCIES[action.to].decimals);
  if (toUnits <= 0) {
    return reject(state, "AMOUNT_TOO_SMALL", "مبلغ بسیار کم است", "مقدار دریافتی پس از گرد شدن صفر می‌شود.");
  }

  const specs: LineSpec[] = [
    { ownerId: user.id, side: "DEBIT", amount: action.amount, instrument: action.from },
    { ownerId: MARKET, side: "CREDIT", amount: action.amount, instrument: action.from },
    { ownerId: MARKET, side: "DEBIT", amount: toUnits, instrument: action.to },
    { ownerId: user.id, side: "CREDIT", amount: toUnits, instrument: action.to },
    { ownerId: MARKET, side: "DEBIT", amount: quote.total, instrument: "IRR" },
    { ownerId: TREASURY, side: "CREDIT", amount: quote.total, instrument: "IRR" },
  ];

  const out = commit(state, {
    type: "FX_CONVERT",
    amount: notional,
    fee: quote.total,
    description: `${CURRENCIES[action.from].label} به ${CURRENCIES[action.to].label}`,
    senderId: user.id,
    receiverId: MARKET,
    specs,
    key: action.key,
    scope: "fx",
    feeQuote: quote,
    leg: { instrument: action.to, units: toUnits, rate: CURRENCIES[action.to].mid },
    failTitle: "تبدیل انجام نشد",
  });
  if (!out.ok) return out.state;

  return {
    ...out.state,
    notices: [
      noticeFor(user.id, `NT-${out.tx.id}`, "تبدیل ارز ثبت شد", `مرجع ${out.tx.reference}`, out.tx.id),
      ...out.state.notices,
    ],
    lastResult: resultOf(
      out.tx,
      "ok",
      "تبدیل انجام شد",
      "هر دو جیب با هم به‌روز شدند و کارمزد سطر مقابل خودش را در خزانه دارد.",
      true,
      {
        counterparty: "بازارساز PayFlow",
        balanceAfter: out.state.balances[user.id] ?? 0,
        secondary: `${formatUnits(toUnits, action.to)} ${CURRENCIES[action.to].label}`,
      },
    ),
  };
}

/* ----------------------------------- crypto ---------------------------------- */

function cryptoOrder(state: WalletState, action: Extract<Action, { type: "CRYPTO_ORDER" }>): WalletState {
  const prior = replay(state, "crypto", action.key);
  if (prior) return prior;
  const gate = guard(state, "CRYPTO");
  if (!gate.ok) return gate.state;
  const { user } = gate;
  const asset = ASSETS[action.asset];

  if (action.amount <= 0) {
    return reject(state, "INVALID_AMOUNT", "مقدار نامعتبر است", "مقدار باید بزرگ‌تر از صفر باشد.");
  }

  const notional = action.side === "BUY" ? action.amount : action.amount * asset.price;
  const tooLarge = orderTooLarge(state, user.id, notional);
  if (tooLarge) {
    return reject(state, "ORDER_LIMIT_EXCEEDED", "سفارش از سقف سطح شما بزرگ‌تر است", tooLarge);
  }
  const quote = cryptoFee(action.asset, notional);
  if (notional <= quote.total) {
    return reject(state, "AMOUNT_TOO_SMALL", "مبلغ از کارمزد کمتر است", "ارزش سفارش باید از کارمزد بیشتر باشد.");
  }

  if (action.side === "BUY") {
    const units = round((notional - quote.total) / asset.price, asset.decimals);
    if (units <= 0) {
      return reject(state, "AMOUNT_TOO_SMALL", "مبلغ بسیار کم است", "مقدار رمزارز پس از گرد شدن صفر می‌شود.");
    }
    const specs: LineSpec[] = [
      { ownerId: user.id, side: "DEBIT", amount: notional, instrument: "IRR" },
      { ownerId: MARKET, side: "CREDIT", amount: notional, instrument: "IRR" },
      { ownerId: MARKET, side: "DEBIT", amount: units, instrument: action.asset },
      { ownerId: user.id, side: "CREDIT", amount: units, instrument: action.asset },
      { ownerId: MARKET, side: "DEBIT", amount: quote.total, instrument: "IRR" },
      { ownerId: TREASURY, side: "CREDIT", amount: quote.total, instrument: "IRR" },
    ];
    const out = commit(state, {
      type: "CRYPTO_BUY",
      amount: notional,
      fee: quote.total,
      description: `خرید ${asset.label}`,
      senderId: user.id,
      receiverId: MARKET,
      specs,
      key: action.key,
      scope: "crypto",
      feeQuote: quote,
      leg: { instrument: action.asset, units, rate: asset.price },
      failTitle: "خرید انجام نشد",
    });
    if (!out.ok) return out.state;
    return {
      ...out.state,
      notices: [
        noticeFor(user.id, `NT-${out.tx.id}`, "خرید رمزارز ثبت شد", `مرجع ${out.tx.reference}`, out.tx.id),
        ...out.state.notices,
      ],
      lastResult: resultOf(out.tx, "ok", "خرید انجام شد", "ریال از کیف پول کسر و دارایی به حساب امانی شما اضافه شد.", true, {
        counterparty: "بازارساز PayFlow",
        balanceAfter: out.state.balances[user.id] ?? 0,
        secondary: `${formatUnits(units, action.asset)} ${asset.label}`,
      }),
    };
  }

  const net = notional - quote.total;
  const specs: LineSpec[] = [
    { ownerId: user.id, side: "DEBIT", amount: action.amount, instrument: action.asset },
    { ownerId: MARKET, side: "CREDIT", amount: action.amount, instrument: action.asset },
    { ownerId: MARKET, side: "DEBIT", amount: net, instrument: "IRR" },
    { ownerId: user.id, side: "CREDIT", amount: net, instrument: "IRR" },
    { ownerId: MARKET, side: "DEBIT", amount: quote.total, instrument: "IRR" },
    { ownerId: TREASURY, side: "CREDIT", amount: quote.total, instrument: "IRR" },
  ];
  const out = commit(state, {
    type: "CRYPTO_SELL",
    amount: notional,
    fee: quote.total,
    description: `فروش ${asset.label}`,
    senderId: MARKET,
    receiverId: user.id,
    specs,
    key: action.key,
    scope: "crypto",
    feeQuote: quote,
    leg: { instrument: action.asset, units: action.amount, rate: asset.price },
    failTitle: "فروش انجام نشد",
  });
  if (!out.ok) return out.state;
  return {
    ...out.state,
    notices: [
      noticeFor(user.id, `NT-${out.tx.id}`, "فروش رمزارز ثبت شد", `مرجع ${out.tx.reference}`, out.tx.id),
      ...out.state.notices,
    ],
    lastResult: resultOf(out.tx, "ok", "فروش انجام شد", "دارایی از حساب امانی کم و ریال به کیف پول اضافه شد.", true, {
      counterparty: "بازارساز PayFlow",
      balanceAfter: out.state.balances[user.id] ?? 0,
      secondary: `${formatGrouped(net)} ریال`,
    }),
  };
}

/* --------------------------------- investment -------------------------------- */

function firstBuyAt(state: WalletState, userId: string, fund: string) {
  const match = state.transactions
    .filter((tx) => tx.type === "FUND_BUY" && tx.parties.includes(userId) && tx.leg?.instrument === fund)
    .sort((a, b) => a.seq - b.seq)[0];
  return match ? new Date(match.createdAt).getTime() : Date.now();
}

function fundOrder(state: WalletState, action: Extract<Action, { type: "FUND_ORDER" }>): WalletState {
  const prior = replay(state, "fund", action.key);
  if (prior) return prior;
  const gate = guard(state, "FUND");
  if (!gate.ok) return gate.state;
  const { user } = gate;
  const fund = FUNDS[action.fund];
  const settlesAt = new Date(Date.now() + fund.settlementDays * DAY).toISOString();

  if (action.amount <= 0) {
    return reject(state, "INVALID_AMOUNT", "مقدار نامعتبر است", "مقدار باید بزرگ‌تر از صفر باشد.");
  }

  if (action.side === "BUY") {
    const tooLarge = orderTooLarge(state, user.id, action.amount);
    if (tooLarge) {
      return reject(state, "ORDER_LIMIT_EXCEEDED", "سفارش از سقف سطح شما بزرگ‌تر است", tooLarge);
    }
    const quote = fundBuyFee(action.amount);
    const net = action.amount - quote.total;
    if (net <= 0) {
      return reject(state, "AMOUNT_TOO_SMALL", "مبلغ از کارمزد کمتر است", "مبلغ صدور باید از کارمزد بیشتر باشد.");
    }
    const units = round(net / fund.nav, 4);
    const specs: LineSpec[] = [
      { ownerId: user.id, side: "DEBIT", amount: action.amount, instrument: "IRR" },
      { ownerId: CUSTODY, side: "CREDIT", amount: net, instrument: "IRR" },
      { ownerId: TREASURY, side: "CREDIT", amount: quote.total, instrument: "IRR" },
    ];
    const out = commit(state, {
      type: "FUND_BUY",
      amount: action.amount,
      fee: quote.total,
      description: `صدور واحد ${fund.label}`,
      senderId: user.id,
      receiverId: CUSTODY,
      specs,
      key: action.key,
      scope: "fund",
      feeQuote: quote,
      leg: { instrument: action.fund, units, rate: fund.nav },
      status: "PENDING",
      settlesAt,
      failTitle: "صدور انجام نشد",
    });
    if (!out.ok) return out.state;
    return {
      ...out.state,
      lastResult: resultOf(
        out.tx,
        "neutral",
        "سفارش صدور ثبت شد",
        `مبلغ از کیف پول کسر شد و نزد امین صندوق نشست. واحدها در تسویه ${toPersianDigits(fund.settlementDays)} روز کاری به دارایی شما اضافه می‌شوند.`,
        true,
        {
          counterparty: "امین صندوق",
          balanceAfter: out.state.balances[user.id] ?? 0,
          secondary: `${formatUnits(units, action.fund)} واحد در انتظار تسویه`,
        },
      ),
    };
  }

  const held = positionOf(state, user.id, action.fund);
  if (action.amount > held + 1e-9) {
    return reject(state, "INSUFFICIENT_UNITS", "واحد کافی ندارید", `موجودی واحد شما ${formatUnits(held, action.fund)} است.`);
  }
  const notional = action.amount * fund.nav;
  const heldDays = Math.floor((Date.now() - firstBuyAt(state, user.id, action.fund)) / DAY);
  const quote = fundRedeemFee(notional, heldDays);
  const specs: LineSpec[] = [
    { ownerId: user.id, side: "DEBIT", amount: action.amount, instrument: action.fund },
    { ownerId: CUSTODY, side: "CREDIT", amount: action.amount, instrument: action.fund },
  ];
  const out = commit(state, {
    type: "FUND_REDEEM",
    amount: notional,
    fee: quote.total,
    description: `ابطال واحد ${fund.label}`,
    senderId: CUSTODY,
    receiverId: user.id,
    specs,
    key: action.key,
    scope: "fund",
    feeQuote: quote,
    leg: { instrument: action.fund, units: action.amount, rate: fund.nav },
    status: "PENDING",
    settlesAt,
    failTitle: "ابطال انجام نشد",
  });
  if (!out.ok) return out.state;
  return {
    ...out.state,
    lastResult: resultOf(
      out.tx,
      "neutral",
      "سفارش ابطال ثبت شد",
      `واحدها کنار گذاشته شدند. مبلغ پس از کسر کارمزد در تسویه ${toPersianDigits(fund.settlementDays)} روز کاری به کیف پول برمی‌گردد.`,
      true,
      { counterparty: "امین صندوق", secondary: `${formatGrouped(notional - quote.total)} ریال در راه` },
    ),
  };
}

function fundSettle(state: WalletState, action: Extract<Action, { type: "FUND_SETTLE" }>): WalletState {
  const user = currentUser(state);
  if (!user) return state;
  const tx = state.transactions.find((item) => item.id === action.transactionId);
  if (!tx || tx.status !== "PENDING" || !tx.leg) return state;
  const seq = state.seq + 1;
  const fund = FUNDS[tx.leg.instrument as keyof typeof FUNDS];
  if (!fund) return state;

  const specs: LineSpec[] =
    tx.type === "FUND_BUY"
      ? [
          { ownerId: CUSTODY, side: "DEBIT", amount: tx.leg.units, instrument: tx.leg.instrument },
          { ownerId: user.id, side: "CREDIT", amount: tx.leg.units, instrument: tx.leg.instrument },
        ]
      : [
          { ownerId: CUSTODY, side: "DEBIT", amount: tx.amount, instrument: "IRR" },
          { ownerId: user.id, side: "CREDIT", amount: tx.amount - tx.fee, instrument: "IRR" },
          { ownerId: TREASURY, side: "CREDIT", amount: tx.fee, instrument: "IRR" },
        ];

  const posted = applyLines(state, seq, specs);
  if (!posted.ok) return state;
  const settled: Transaction = {
    ...tx,
    status: "SUCCESS",
    code: "SUCCESS",
    ledger: [...tx.ledger, ...posted.result.lines],
  };
  return {
    ...state,
    seq,
    balances: posted.result.balances,
    positions: posted.result.positions,
    transactions: state.transactions.map((item) => (item.id === tx.id ? settled : item)),
    notices: [
      noticeFor(
        user.id,
        `NT-SET-${seq}`,
        tx.type === "FUND_BUY" ? "واحدهای صندوق تسویه شد" : "مبلغ ابطال برگشت",
        `مرجع ${tx.reference}`,
        tx.id,
      ),
      ...state.notices,
    ],
    lastResult: resultOf(
      settled,
      "ok",
      tx.type === "FUND_BUY" ? "تسویه صدور انجام شد" : "تسویه ابطال انجام شد",
      tx.type === "FUND_BUY"
        ? "واحدها به دارایی شما اضافه شد. سطرهای تسویه به همان تراکنش اول چسبیده‌اند."
        : "مبلغ پس از کسر کارمزد به کیف پول برگشت.",
      true,
      { balanceAfter: posted.result.balances[user.id] ?? 0 },
    ),
  };
}

/* ----------------------------------- credit ---------------------------------- */

function creditRequest(state: WalletState, action: Extract<Action, { type: "CREDIT_REQUEST" }>): WalletState {
  const prior = replay(state, "credit", action.key);
  if (prior) return prior;
  const gate = guard(state, "CREDIT");
  if (!gate.ok) return gate.state;
  const { user } = gate;

  const ceiling = CREDIT_CEILING[tierOf(state, user.id)];
  const open = loansOf(state, user.id)
    .filter((loan) => loan.status === "ACTIVE")
    .reduce((sum, loan) => sum + loan.installments.filter((item) => !item.paidAt).reduce((inner, item) => inner + item.principal, 0), 0);
  const room = ceiling - open;

  if (action.amount <= 0) {
    return reject(state, "INVALID_AMOUNT", "مبلغ نامعتبر است", "مبلغ باید بزرگ‌تر از صفر باشد.");
  }
  if (action.amount > room) {
    return reject(
      state,
      "CREDIT_LIMIT_EXCEEDED",
      "اعتبار کافی نیست",
      `سقف اعتبار سطح شما ${formatGrouped(ceiling)} ریال است و ${formatGrouped(open)} ریال آن درگیر اقساط باز است. ظرفیت آزاد ${formatGrouped(Math.max(0, room))} ریال.`,
    );
  }

  const rate = CREDIT_RATE[action.term];
  const profit = Math.round((action.amount * rate * action.term) / 12);
  const perInstallment = Math.round((action.amount + profit) / action.term);
  const installments: Installment[] = Array.from({ length: action.term }, (_, index) => {
    const principal = Math.round(action.amount / action.term);
    return {
      no: index + 1,
      dueAt: new Date(Date.now() + (index + 1) * 30 * DAY).toISOString(),
      principal,
      profit: perInstallment - principal,
      total: perInstallment,
      paidAt: null,
      lateFee: 0,
    };
  });

  const specs: LineSpec[] = [
    { ownerId: CREDIT_BOOK, side: "DEBIT", amount: action.amount, instrument: "IRR" },
    { ownerId: user.id, side: "CREDIT", amount: action.amount, instrument: "IRR" },
  ];
  const out = commit(state, {
    type: "LOAN_DISBURSE",
    amount: action.amount,
    fee: 0,
    description: `اعتبار ${toPersianDigits(action.term)} ماهه`,
    senderId: CREDIT_BOOK,
    receiverId: user.id,
    specs,
    key: action.key,
    scope: "credit",
    failTitle: "پرداخت اعتبار انجام نشد",
  });
  if (!out.ok) return out.state;

  const loan: Loan = {
    id: `LN-${out.tx.seq}`,
    userId: user.id,
    principal: action.amount,
    term: action.term,
    rate,
    status: "ACTIVE",
    installments,
    createdAt: out.tx.createdAt,
    transactionId: out.tx.id,
  };
  return {
    ...out.state,
    loans: [loan, ...out.state.loans],
    notices: [
      noticeFor(user.id, `NT-${out.tx.id}`, "اعتبار پرداخت شد", `جدول ${toPersianDigits(action.term)} قسطی ساخته شد. مرجع ${out.tx.reference}`, out.tx.id),
      ...out.state.notices,
    ],
    lastResult: resultOf(
      out.tx,
      "ok",
      "اعتبار به کیف پول نشست",
      `جدول ${toPersianDigits(action.term)} قسط ساخته شد. مجموع سود ${formatGrouped(profit)} ریال و هر قسط ${formatGrouped(perInstallment)} ریال است. بدهی از همین حالا در دارایی خالص شما دیده می‌شود.`,
      true,
      { counterparty: "دفتر اعتبار", balanceAfter: out.state.balances[user.id] ?? 0 },
    ),
  };
}

function installmentPay(state: WalletState, action: Extract<Action, { type: "INSTALLMENT_PAY" }>): WalletState {
  const prior = replay(state, "installment", action.key);
  if (prior) return prior;
  const gate = guard(state, "CREDIT");
  if (!gate.ok) return gate.state;
  const { user } = gate;

  const loan = state.loans.find((item) => item.id === action.loanId && item.userId === user.id);
  if (!loan) return state;
  const installment = loan.installments.find((item) => item.no === action.no);
  if (!installment) return state;
  if (installment.paidAt) {
    return reject(state, "ALREADY_PAID", "این قسط پرداخت شده است", "رکورد پرداخت قبلی سر جایش است و پول دوباره کسر نمی‌شود.");
  }

  const overdueMs = Date.now() - new Date(installment.dueAt).getTime();
  const periods = overdueMs > 0 ? Math.ceil(overdueMs / (30 * DAY)) : 0;
  const penalty = periods > 0 ? lateFee(installment.total, periods) : null;
  const penaltyTotal = penalty?.total ?? 0;
  const due = installment.total + penaltyTotal;

  const specs: LineSpec[] = [
    { ownerId: user.id, side: "DEBIT", amount: due, instrument: "IRR" },
    { ownerId: CREDIT_BOOK, side: "CREDIT", amount: installment.total, instrument: "IRR" },
  ];
  if (penaltyTotal > 0) {
    specs.push({ ownerId: TREASURY, side: "CREDIT", amount: penaltyTotal, instrument: "IRR" });
  }

  const out = commit(state, {
    type: "INSTALLMENT",
    amount: due,
    fee: penaltyTotal,
    description: `قسط ${toPersianDigits(action.no)} از ${toPersianDigits(loan.term)}`,
    senderId: user.id,
    receiverId: CREDIT_BOOK,
    specs,
    key: action.key,
    scope: "installment",
    feeQuote: penalty ?? undefined,
    linkId: loan.id,
    failTitle: "پرداخت قسط انجام نشد",
  });
  if (!out.ok) return out.state;

  const installments = loan.installments.map((item) =>
    item.no === action.no ? { ...item, paidAt: out.tx.createdAt, lateFee: penaltyTotal } : item,
  );
  const settled = installments.every((item) => item.paidAt);
  return {
    ...out.state,
    loans: out.state.loans.map((item) =>
      item.id === loan.id ? { ...item, installments, status: settled ? "SETTLED" : "ACTIVE" } : item,
    ),
    notices: [
      noticeFor(user.id, `NT-${out.tx.id}`, settled ? "اعتبار تسویه شد" : "قسط پرداخت شد", `مرجع ${out.tx.reference}`, out.tx.id),
      ...out.state.notices,
    ],
    lastResult: resultOf(
      out.tx,
      "ok",
      settled ? "آخرین قسط پرداخت شد" : "قسط پرداخت شد",
      penaltyTotal > 0
        ? `قسط با ${formatGrouped(penaltyTotal)} ریال جریمه دیرکرد پرداخت شد. جریمه سطر جدای خودش را دارد.`
        : settled
          ? "همه اقساط پرداخت شد و پرونده اعتبار بسته شد."
          : "اصل و سود قسط به دفتر اعتبار برگشت.",
      true,
      { counterparty: "دفتر اعتبار", balanceAfter: out.state.balances[user.id] ?? 0 },
    ),
  };
}

/**
 * Sandbox control: pushes the next unpaid instalment past its due date so the late
 * fee rule can be seen without waiting a month.
 */
function installmentBackdate(state: WalletState, action: Extract<Action, { type: "INSTALLMENT_BACKDATE" }>): WalletState {
  const loan = state.loans.find((item) => item.id === action.loanId);
  if (!loan) return state;
  const next = loan.installments.find((item) => !item.paidAt);
  if (!next) return state;
  return {
    ...state,
    loans: state.loans.map((item) =>
      item.id === loan.id
        ? {
            ...item,
            installments: item.installments.map((inner) =>
              inner.no === next.no ? { ...inner, dueAt: new Date(Date.now() - 35 * DAY).toISOString() } : inner,
            ),
          }
        : item,
    ),
    lastResult: {
      tone: "neutral",
      title: "سرسید قسط به گذشته برد",
      message: `قسط ${toPersianDigits(next.no)} حالا ۳۵ روز گذشته است. پرداخت بعدی جریمه دیرکرد را هم حساب می‌کند.`,
      balanceChanged: false,
      code: "SANDBOX_BACKDATE",
    },
  };
}

/* ------------------------------------ card ----------------------------------- */

function cardRequest(state: WalletState, action: Extract<Action, { type: "CARD_REQUEST" }>): WalletState {
  const prior = replay(state, "card", action.key);
  if (prior) return prior;
  const gate = guard(state, "CARD");
  if (!gate.ok) return gate.state;
  const { user } = gate;

  const open = state.cards.find(
    (card) => card.userId === user.id && card.status !== "CANCELLED",
  );
  if (open) {
    return reject(state, "CARD_EXISTS", "کارت فعال دارید", "در نسخه کنونی هر کیف پول یک کارت فیزیکی دارد.");
  }

  const quote = cardIssueFee(CARD_ISSUE_FEE);
  const specs: LineSpec[] = [
    { ownerId: user.id, side: "DEBIT", amount: quote.total, instrument: "IRR" },
    { ownerId: TREASURY, side: "CREDIT", amount: quote.total, instrument: "IRR" },
  ];
  const out = commit(state, {
    type: "CARD_ISSUE",
    amount: quote.total,
    fee: quote.total,
    description: "صدور کارت فیزیکی",
    senderId: user.id,
    receiverId: TREASURY,
    specs,
    key: action.key,
    scope: "card",
    feeQuote: quote,
    failTitle: "درخواست کارت ثبت نشد",
  });
  if (!out.ok) return out.state;

  const last4 = String(1000 + (out.tx.seq * 37) % 9000);
  const card: Card = {
    id: `CRD-${out.tx.seq}`,
    userId: user.id,
    maskedPan: `6219 •••• •••• ${last4}`,
    last4,
    expiry: `${String(new Date().getMonth() + 1).padStart(2, "0")}/${String((new Date().getFullYear() + 3) % 100).padStart(2, "0")}`,
    status: "REQUESTED",
    requestedAt: out.tx.createdAt,
    shippingRef: `POST-${500_000 + out.tx.seq}`,
    frozenReason: null,
    transactionId: out.tx.id,
  };
  return {
    ...out.state,
    cards: [card, ...out.state.cards],
    notices: [
      noticeFor(user.id, `NT-${out.tx.id}`, "درخواست کارت ثبت شد", `رهگیری ارسال ${card.shippingRef}`, out.tx.id),
      ...out.state.notices,
    ],
    lastResult: resultOf(
      out.tx,
      "ok",
      "درخواست کارت ثبت شد",
      "کارمزد صدور و ارسال یک‌بار کسر شد. کارت تا فعال‌سازی دستی شما قابل استفاده نیست.",
      true,
      { counterparty: "خزانه PayFlow", balanceAfter: out.state.balances[user.id] ?? 0, secondary: card.maskedPan },
    ),
  };
}

const CARD_FLOW: Record<string, Card["status"]> = {
  REQUESTED: "PRINTING",
  PRINTING: "SHIPPED",
  SHIPPED: "DELIVERED",
};

const CARD_LABELS: Record<Card["status"], string> = {
  REQUESTED: "ثبت‌شده",
  PRINTING: "در چاپ",
  SHIPPED: "ارسال‌شده",
  DELIVERED: "تحویل‌شده",
  ACTIVE: "فعال",
  FROZEN: "قفل",
  CANCELLED: "لغو‌شده",
};

export function cardStatusLabel(status: Card["status"]) {
  return CARD_LABELS[status];
}

function cardAdvance(state: WalletState, action: Extract<Action, { type: "CARD_ADVANCE" }>): WalletState {
  const card = state.cards.find((item) => item.id === action.cardId);
  if (!card) return state;
  const next = CARD_FLOW[card.status];
  if (!next) return state;
  const seq = state.seq + 1;
  return {
    ...state,
    seq,
    cards: state.cards.map((item) => (item.id === card.id ? { ...item, status: next } : item)),
    audits: [auditOf(seq, "CARD_STATUS", card.shippingRef, CARD_LABELS[card.status], CARD_LABELS[next], "رخداد شرکت پست"), ...state.audits],
    lastResult: {
      tone: "neutral",
      title: `کارت ${CARD_LABELS[next]}`,
      message:
        next === "DELIVERED"
          ? "کارت تحویل شد. برای استفاده باید با چهار رقم آخر فعال شود."
          : "وضعیت ارسال جلو رفت. هیچ اثر مالی تازه‌ای ندارد.",
      balanceChanged: false,
      reference: card.shippingRef,
    },
  };
}

function cardActivate(state: WalletState, action: Extract<Action, { type: "CARD_ACTIVATE" }>): WalletState {
  const card = state.cards.find((item) => item.id === action.cardId);
  if (!card) return state;
  if (card.status !== "DELIVERED") {
    return reject(state, "CARD_NOT_DELIVERED", "کارت آماده فعال‌سازی نیست", "تا تحویل کارت، فعال‌سازی ممکن نیست.");
  }
  if (action.last4.trim() !== card.last4) {
    return reject(
      state,
      "CARD_MISMATCH",
      "چهار رقم آخر درست نیست",
      "برای پیشگیری از فعال‌سازی کارت دیگران، فعال‌سازی فقط با چهار رقم آخر همان کارت انجام می‌شود.",
    );
  }
  const seq = state.seq + 1;
  return {
    ...state,
    seq,
    cards: state.cards.map((item) => (item.id === card.id ? { ...item, status: "ACTIVE", frozenReason: null } : item)),
    audits: [auditOf(seq, "CARD_STATUS", card.maskedPan, CARD_LABELS.DELIVERED, CARD_LABELS.ACTIVE, "فعال‌سازی توسط دارنده کارت"), ...state.audits],
    lastResult: {
      tone: "ok",
      title: "کارت فعال شد",
      message: "کارت به همین کیف پول وصل است و سقف خرجش همان موجودی قابل استفاده است.",
      balanceChanged: false,
      code: "CARD_ACTIVE",
    },
  };
}

function cardFreeze(state: WalletState, action: Extract<Action, { type: "CARD_FREEZE" }>): WalletState {
  const card = state.cards.find((item) => item.id === action.cardId);
  if (!card) return state;
  if (action.frozen && card.status !== "ACTIVE") return state;
  if (!action.frozen && card.status !== "FROZEN") return state;
  const reason = action.reason.trim();
  if (action.frozen && !reason) {
    return rejectOps(state, "REASON_REQUIRED", "دلیل لازم است", "قفل کارت بدون دلیل ثبت نمی‌شود.");
  }
  const seq = state.seq + 1;
  const next: Card["status"] = action.frozen ? "FROZEN" : "ACTIVE";
  return {
    ...state,
    seq,
    cards: state.cards.map((item) =>
      item.id === card.id ? { ...item, status: next, frozenReason: action.frozen ? reason : null } : item,
    ),
    audits: [
      auditOf(seq, "CARD_STATUS", card.maskedPan, CARD_LABELS[card.status], CARD_LABELS[next], reason || "باز کردن قفل توسط دارنده کارت"),
      ...state.audits,
    ],
    lastResult: {
      tone: action.frozen ? "neutral" : "ok",
      title: action.frozen ? "کارت قفل شد" : "قفل کارت برداشته شد",
      message: action.frozen
        ? "قفل فوری است و موجودی کیف پول دست‌نخورده می‌ماند. تراکنش‌های ثبت‌شده قبلی برنمی‌گردند."
        : "کارت دوباره قابل استفاده است.",
      balanceChanged: false,
    },
  };
}

/* --------------------------------- remittance -------------------------------- */

export function remittanceQuote(corridor: keyof typeof CORRIDORS, amount: number) {
  const info = CORRIDORS[corridor];
  const fee = remittanceFee(corridor, amount);
  const rate = CURRENCIES[info.payoutCurrency].mid * FX_MARKUP;
  const payout = round(Math.max(0, amount - fee.total) / rate, CURRENCIES[info.payoutCurrency].decimals);
  return { info, fee, rate, payout };
}

function remitSend(state: WalletState, action: Extract<Action, { type: "REMIT_SEND" }>): WalletState {
  const prior = replay(state, "remit", action.key);
  if (prior) return prior;
  const gate = guard(state, "REMIT");
  if (!gate.ok) return gate.state;
  const { user, wallet } = gate;

  if (action.amount <= 0) {
    return reject(state, "INVALID_AMOUNT", "مبلغ نامعتبر است", "مبلغ باید بزرگ‌تر از صفر باشد.");
  }
  if (!action.beneficiary.trim() || action.iban.trim().length < 8) {
    return reject(state, "INVALID_BENEFICIARY", "اطلاعات ذی‌نفع کامل نیست", "نام ذی‌نفع و شماره حساب بین‌المللی الزامی است.");
  }
  if (!action.purpose.trim()) {
    return reject(state, "PURPOSE_REQUIRED", "علت حواله لازم است", "برای انطباق، علت حواله باید ثبت شود.");
  }
  const limit = dailyLimitOf(state, user.id);
  if (dailyUsed(state) + action.amount > limit) {
    return reject(
      state,
      "DAILY_LIMIT_EXCEEDED",
      "حواله از سقف روزانه عبور می‌کند",
      `سقف روزانه سطح شما ${formatGrouped(limit)} ریال است و حواله هم مثل انتقال از همین سقف کم می‌کند.`,
    );
  }

  const { info, fee, rate, payout } = remittanceQuote(action.corridor, action.amount);
  if (payout <= 0) {
    return reject(state, "AMOUNT_TOO_SMALL", "مبلغ از کارمزد کمتر است", "مبلغ حواله باید از کارمزد بیشتر باشد.");
  }
  const hold = action.amount > info.reviewAbove;
  const net = action.amount - fee.total;

  const specs: LineSpec[] = [
    { ownerId: user.id, side: "DEBIT", amount: action.amount, instrument: "IRR" },
    { ownerId: NOSTRO, side: "CREDIT", amount: net, instrument: "IRR" },
    { ownerId: TREASURY, side: "CREDIT", amount: fee.total, instrument: "IRR" },
  ];

  const out = commit(state, {
    type: "REMITTANCE",
    amount: action.amount,
    fee: fee.total,
    description: `حواله به ${info.country} · ${action.purpose.trim()}`,
    senderId: user.id,
    receiverId: NOSTRO,
    specs,
    key: action.key,
    scope: "remit",
    feeQuote: fee,
    leg: { instrument: info.payoutCurrency, units: payout, rate },
    status: hold ? "ON_HOLD" : "SUCCESS",
    failTitle: "حواله ثبت نشد",
  });
  if (!out.ok) return out.state;

  const remittance: Remittance = {
    id: `RMT-${out.tx.seq}`,
    userId: user.id,
    corridor: action.corridor,
    beneficiary: action.beneficiary.trim(),
    iban: action.iban.trim().toUpperCase(),
    purpose: action.purpose.trim(),
    amount: action.amount,
    fee: fee.total,
    rate,
    payoutCurrency: info.payoutCurrency,
    payoutAmount: payout,
    status: hold ? "COMPLIANCE_HOLD" : "SENT",
    holdReason: hold ? `مبلغ از آستانه بازبینی مسیر ${info.country} بیشتر است` : null,
    createdAt: out.tx.createdAt,
    transactionId: out.tx.id,
  };

  return {
    ...out.state,
    remittances: [remittance, ...out.state.remittances],
    wallets: { ...out.state.wallets, [user.id]: { ...wallet, version: wallet.version + 2 } },
    notices: [
      noticeFor(
        user.id,
        `NT-${out.tx.id}`,
        hold ? "حواله در بازبینی انطباق" : "حواله ارسال شد",
        `مرجع ${out.tx.reference} · ${formatUnits(payout, info.payoutCurrency)} ${CURRENCIES[info.payoutCurrency].label}`,
        out.tx.id,
      ),
      ...out.state.notices,
    ],
    lastResult: resultOf(
      out.tx,
      hold ? "neutral" : "ok",
      hold ? "حواله در بازبینی انطباق است" : "حواله ارسال شد",
      hold
        ? `مبلغ از کیف پول کنار گذاشته شد اما تا پاسخ بازبینی به ذی‌نفع نمی‌رسد. اگر رد شود، کل مبلغ با کارمزد برمی‌گردد.`
        : `شریک ${info.partner} پرداخت را در ${toPersianDigits(info.days)} روز کاری انجام می‌دهد.`,
      true,
      {
        counterparty: `${remittance.beneficiary} · ${info.country}`,
        balanceAfter: out.state.balances[user.id] ?? 0,
        secondary: `${formatUnits(payout, info.payoutCurrency)} ${CURRENCIES[info.payoutCurrency].label}`,
      },
    ),
  };
}

function remitReview(state: WalletState, action: Extract<Action, { type: "REMIT_REVIEW" }>): WalletState {
  const remittance = state.remittances.find((item) => item.id === action.remittanceId);
  if (!remittance || remittance.status !== "COMPLIANCE_HOLD") return state;
  const reason = action.reason.trim();
  if (!reason) {
    return rejectOps(state, "REASON_REQUIRED", "دلیل لازم است", "نتیجه بازبینی انطباق بدون دلیل ثبت نمی‌شود.");
  }
  const original = state.transactions.find((item) => item.id === remittance.transactionId);
  if (!original) return state;
  const seq = state.seq + 1;

  if (action.outcome === "RELEASE") {
    return {
      ...state,
      seq,
      remittances: state.remittances.map((item) =>
        item.id === remittance.id ? { ...item, status: "SENT", holdReason: null } : item,
      ),
      transactions: state.transactions.map((item) =>
        item.id === original.id ? { ...item, status: "SUCCESS", code: "SUCCESS" } : item,
      ),
      audits: [auditOf(seq, "REMIT_REVIEW", remittance.id, "در بازبینی", "ارسال‌شده", reason), ...state.audits],
      notices: [noticeFor(remittance.userId, `NT-RMT-${seq}`, "حواله آزاد شد", `مرجع ${original.reference}`, original.id), ...state.notices],
      opsResult: {
        tone: "ok",
        title: "حواله آزاد شد",
        message: "بازبینی تأیید شد و حواله به شریک پرداخت رفت. سطر دفترکل تازه‌ای لازم نبود، چون مبلغ از قبل کنار گذاشته شده بود.",
        balanceChanged: false,
        reference: original.reference,
      },
    };
  }

  const refund = remittance.amount;
  const specs: LineSpec[] = [
    { ownerId: NOSTRO, side: "DEBIT", amount: refund - remittance.fee, instrument: "IRR" },
    { ownerId: TREASURY, side: "DEBIT", amount: remittance.fee, instrument: "IRR" },
    { ownerId: remittance.userId, side: "CREDIT", amount: refund, instrument: "IRR" },
  ];
  const posted = applyLines(state, seq, specs);
  if (!posted.ok) return state;

  const compensating: Transaction = {
    seq,
    id: `TX-${10_000 + seq}`,
    reference: reference(),
    traceId: traceOk(seq),
    type: "REVERSAL",
    status: "SUCCESS",
    amount: refund,
    fee: 0,
    description: `برگشت حواله رد‌شده · ${reason}`,
    senderId: NOSTRO,
    receiverId: remittance.userId,
    parties: [remittance.userId],
    createdAt: new Date().toISOString(),
    code: "SUCCESS",
    reversalOf: original.id,
    ledger: posted.result.lines,
  };

  return {
    ...state,
    seq,
    balances: posted.result.balances,
    positions: posted.result.positions,
    remittances: state.remittances.map((item) =>
      item.id === remittance.id ? { ...item, status: "REJECTED", holdReason: reason } : item,
    ),
    transactions: [
      ...state.transactions.map((item) =>
        item.id === original.id ? { ...item, status: "REVERSED" as const, reversedBy: compensating.id } : item,
      ),
      compensating,
    ],
    audits: [auditOf(seq, "REMIT_REVIEW", remittance.id, "در بازبینی", "رد‌شده", reason), ...state.audits],
    notices: [
      noticeFor(remittance.userId, `NT-RMT-${seq}`, "حواله رد شد و مبلغ برگشت", `مرجع ${compensating.reference}`, compensating.id),
      ...state.notices,
    ],
    opsResult: {
      tone: "ok",
      title: "حواله رد شد و کل مبلغ برگشت",
      message: "کارمزد هم برگشت، چون خدمتی انجام نشد. تراکنش اصلی حذف نشد و وضعیتش برگشت‌خورده است.",
      balanceChanged: true,
      reference: compensating.reference,
      transactionId: compensating.id,
    },
  };
}

/* ---------------------------------- merchant --------------------------------- */

function merchantOnboard(state: WalletState, action: Extract<Action, { type: "MERCHANT_ONBOARD" }>): WalletState {
  const gate = guard(state, "MERCHANT");
  if (!gate.ok) return gate.state;
  const { user } = gate;
  if (merchantOf(state, user.id)) {
    return reject(state, "MERCHANT_EXISTS", "پذیرنده از قبل ساخته شده", "هر کیف پول در این نسخه یک پرونده پذیرندگی دارد.");
  }
  const name = action.name.trim();
  if (name.length < 3) {
    return reject(state, "INVALID_NAME", "نام کسب‌وکار کوتاه است", "نام پذیرنده دست‌کم سه نویسه باشد.");
  }
  const seq = state.seq + 1;
  const category = CATEGORIES[action.category];
  return {
    ...state,
    seq,
    merchants: [
      {
        id: `MRC-${seq}`,
        userId: user.id,
        name,
        category: action.category,
        mcc: String(5000 + seq),
        monthlyVolume: 0,
        createdAt: new Date().toISOString(),
      },
      ...state.merchants,
    ],
    audits: [auditOf(seq, "MERCHANT_ONBOARD", `MRC-${seq}`, "بدون پرونده", category.label, "پذیرش درخواست پذیرندگی"), ...state.audits],
    lastResult: {
      tone: "ok",
      title: "پرونده پذیرندگی ساخته شد",
      message: `رسته ${category.label} با نرخ پایه ${toPersianDigits((category.mdrBps / 100).toFixed(2).replace(".", "٫"))}٪ و کارمزد ثابت ${formatGrouped(category.fixed)} ریال برای هر تراکنش ثبت شد.`,
      balanceChanged: false,
      code: "MERCHANT_READY",
    },
  };
}

function merchantCapture(state: WalletState, action: Extract<Action, { type: "MERCHANT_CAPTURE" }>): WalletState {
  const user = currentUser(state);
  if (!user) return state;
  const merchant = merchantOf(state, user.id);
  if (!merchant) return state;
  if (action.amount <= 0) {
    return reject(state, "INVALID_AMOUNT", "مبلغ نامعتبر است", "مبلغ پذیرش باید بزرگ‌تر از صفر باشد.");
  }
  const existing = state.idempotency[`${user.id}:capture:${action.key}`];
  if (existing) {
    return {
      ...state,
      lastResult: {
        tone: "neutral",
        title: "این پذیرش تکراری است",
        message: "همین کلید قبلاً ثبت شده و تراکنش دوم ساخته نشد.",
        balanceChanged: false,
        code: "IDEMPOTENT_REPLAY",
      },
    };
  }
  const seq = state.seq + 1;
  const id = `CAP-${seq}`;
  return {
    ...state,
    seq,
    captures: [
      { id, merchantId: merchant.id, amount: action.amount, createdAt: new Date().toISOString(), settlementId: null },
      ...state.captures,
    ],
    idempotency: { ...state.idempotency, [`${user.id}:capture:${action.key}`]: id },
    lastResult: {
      tone: "neutral",
      title: "پرداخت پذیرفته شد",
      message: "مبلغ در استخر پذیرندگی نشست. تا اجرای تسویه، چیزی به کیف پول شما اضافه نمی‌شود.",
      balanceChanged: false,
      code: "CAPTURED",
      amount: action.amount,
    },
  };
}

function merchantSettle(state: WalletState, action: Extract<Action, { type: "MERCHANT_SETTLE" }>): WalletState {
  const prior = replay(state, "settle", action.key);
  if (prior) return prior;
  const gate = guard(state, "MERCHANT");
  if (!gate.ok) return gate.state;
  const { user } = gate;
  const merchant = merchantOf(state, user.id);
  if (!merchant) return state;

  const pending = state.captures.filter((item) => item.merchantId === merchant.id && !item.settlementId);
  if (pending.length === 0) {
    return reject(state, "NOTHING_TO_SETTLE", "چیزی برای تسویه نیست", "ابتدا چند پرداخت بپذیرید.");
  }
  const gross = pending.reduce((sum, item) => sum + item.amount, 0);
  const quote = settlementFee(gross, {
    category: merchant.category,
    captures: pending.length,
    monthlyVolume: merchant.monthlyVolume,
  });
  const net = gross - quote.total;
  if (net <= 0) {
    return reject(state, "FEE_EXCEEDS_GROSS", "کارمزد از مبلغ بیشتر است", "دسته تسویه باید از جمع کارمزد بزرگ‌تر باشد.");
  }

  const specs: LineSpec[] = [
    { ownerId: ACQUIRER, side: "DEBIT", amount: gross, instrument: "IRR" },
    { ownerId: user.id, side: "CREDIT", amount: net, instrument: "IRR" },
    { ownerId: TREASURY, side: "CREDIT", amount: quote.total, instrument: "IRR" },
  ];
  const out = commit(state, {
    type: "SETTLEMENT",
    amount: gross,
    fee: quote.total,
    description: `تسویه ${toPersianDigits(pending.length)} پرداخت`,
    senderId: ACQUIRER,
    receiverId: user.id,
    specs,
    key: action.key,
    scope: "settle",
    feeQuote: quote,
    failTitle: "تسویه انجام نشد",
  });
  if (!out.ok) return out.state;

  const batch = `BATCH-${new Date().toISOString().slice(0, 10)}-${out.tx.seq}`;
  const settlementId = `STL-${out.tx.seq}`;
  return {
    ...out.state,
    merchants: out.state.merchants.map((item) =>
      item.id === merchant.id ? { ...item, monthlyVolume: item.monthlyVolume + gross } : item,
    ),
    captures: out.state.captures.map((item) =>
      item.merchantId === merchant.id && !item.settlementId ? { ...item, settlementId } : item,
    ),
    settlements: [
      {
        id: settlementId,
        merchantId: merchant.id,
        batch,
        gross,
        fee: quote.total,
        net,
        captures: pending.length,
        feeQuote: quote,
        createdAt: out.tx.createdAt,
        transactionId: out.tx.id,
      },
      ...out.state.settlements,
    ],
    notices: [
      noticeFor(user.id, `NT-${out.tx.id}`, "تسویه پذیرنده انجام شد", `${batch} · مرجع ${out.tx.reference}`, out.tx.id),
      ...out.state.notices,
    ],
    lastResult: resultOf(
      out.tx,
      "ok",
      "تسویه انجام شد",
      `جمع ${formatGrouped(gross)} ریال منهای ${formatGrouped(quote.total)} ریال کارمزد، خالص ${formatGrouped(net)} ریال به کیف پول نشست. هر جزء کارمزد سطر و قاعده خودش را دارد.`,
      true,
      { counterparty: "پذیرندگی PayFlow", balanceAfter: out.state.balances[user.id] ?? 0 },
    ),
  };
}

/* ---------------------------------- dispatch --------------------------------- */

export function advancedReducer(state: WalletState, action: Action): WalletState {
  switch (action.type) {
    case "KYC_SUBMIT":
      return kycSubmit(state, action);
    case "KYC_RESULT":
      return kycResult(state, action);
    case "FX_CONVERT":
      return fxConvert(state, action);
    case "CRYPTO_ORDER":
      return cryptoOrder(state, action);
    case "FUND_ORDER":
      return fundOrder(state, action);
    case "FUND_SETTLE":
      return fundSettle(state, action);
    case "CREDIT_REQUEST":
      return creditRequest(state, action);
    case "INSTALLMENT_PAY":
      return installmentPay(state, action);
    case "INSTALLMENT_BACKDATE":
      return installmentBackdate(state, action);
    case "CARD_REQUEST":
      return cardRequest(state, action);
    case "CARD_ADVANCE":
      return cardAdvance(state, action);
    case "CARD_ACTIVATE":
      return cardActivate(state, action);
    case "CARD_FREEZE":
      return cardFreeze(state, action);
    case "REMIT_SEND":
      return remitSend(state, action);
    case "REMIT_REVIEW":
      return remitReview(state, action);
    case "MERCHANT_ONBOARD":
      return merchantOnboard(state, action);
    case "MERCHANT_CAPTURE":
      return merchantCapture(state, action);
    case "MERCHANT_SETTLE":
      return merchantSettle(state, action);
    default:
      return state;
  }
}