import { maskName } from "@/lib/format";
import { FUND_CODES, FX_CURRENCIES, TIERS } from "@/lib/catalog";
import { advancedReducer } from "@/lib/wallet-advanced";
import {
  ACQUIRER,
  CREDIT_BOOK,
  CUSTODY,
  DEMO_MOBILE,
  DEMO_SECRET,
  DESCRIPTION_MAX,
  MARKET,
  NOSTRO,
  SECRET_MIN,
  SYSTEM_NAMES,
  TOPUP_MAX,
  TOPUP_MIN,
  TREASURY,
  type Account,
  type Action,
  type AuditEntry,
  type KycProfile,
  type LedgerLine,
  type Notice,
  type Payment,
  type Transaction,
  type TxStatus,
  type TxType,
  type WalletRecord,
  type WalletState,
} from "@/lib/wallet-types";
import {
  accountName,
  applyLines,
  counterpartyMasked,
  currentUser,
  currentWallet,
  dailyUsed,
  reference,
  reject,
  rejectOps,
  resultOf,
  statusLabel,
  statusNote,
  traceErr,
  traceOk,
  walletBalance,
} from "@/lib/wallet-core";

export * from "@/lib/wallet-types";
export * from "@/lib/wallet-core";
export { advancedReducer, cardStatusLabel, remittanceQuote, validNationalId } from "@/lib/wallet-advanced";

const DAY = 86_400_000;

function kycProfile(userId: string, tier: KycProfile["tier"], now: string): KycProfile {
  return {
    userId,
    tier,
    status: tier > 0 ? "VERIFIED" : "NONE",
    targetTier: null,
    provider: "سامانه احراز هویت شاهکار",
    providerRef: tier > 0 ? `KYC-9${userId.slice(-4)}` : null,
    checks:
      tier > 0
        ? [{ code: "NATIONAL_ID", label: "تطبیق کد ملی و تاریخ تولد", outcome: "PASS", note: "تأییدشده" }]
        : [],
    nationalId: null,
    updatedAt: now,
  };
}

export function createState(now = new Date()): WalletState {
  const t = now.getTime();
  const iso = now.toISOString();
  const sara = "USR-1001";
  const kian = "USR-1002";
  const narges = "USR-1008";

  const names: Record<string, string> = {
    [sara]: "سارا محمدی",
    [kian]: "کیان رضایی",
    [narges]: "نرگس مرادی",
  };
  const walletIds: Record<string, string> = {
    [sara]: "WLT-1001",
    [kian]: "WLT-1002",
    [narges]: "WLT-1008",
  };

  const line = (
    id: string,
    ownerId: string,
    side: "DEBIT" | "CREDIT",
    amount: number,
    before: number,
  ): LedgerLine => ({
    id,
    walletId: walletIds[ownerId] ?? "WLT-0000",
    ownerId,
    ownerName: names[ownerId] ?? "",
    side,
    amount,
    before,
    after: side === "DEBIT" ? before - amount : before + amount,
    instrument: "IRR",
  });

  const transactions: Transaction[] = [
    {
      seq: 1,
      id: "TX-10021",
      reference: "PF184420111",
      traceId: "TRC-10021",
      type: "TOP_UP",
      status: "SUCCESS",
      amount: 80_000_000,
      fee: 0,
      description: "",
      senderId: null,
      receiverId: sara,
      parties: [sara],
      createdAt: new Date(t - 10 * DAY).toISOString(),
      idempotencyKey: "seed-topup-1",
      paymentId: "PAY-10021",
      ledger: [line("LG-1", sara, "CREDIT", 80_000_000, 100_000_000)],
    },
    {
      seq: 2,
      id: "TX-10034",
      reference: "PF184420334",
      traceId: "TRC-10034",
      type: "TRANSFER",
      status: "SUCCESS",
      amount: 20_000_000,
      fee: 0,
      description: "سهم شام",
      senderId: sara,
      receiverId: kian,
      parties: [sara, kian],
      createdAt: new Date(t - 6 * DAY).toISOString(),
      idempotencyKey: "seed-trf-1",
      ledger: [
        line("LG-2a", sara, "DEBIT", 20_000_000, 180_000_000),
        line("LG-2b", kian, "CREDIT", 20_000_000, 62_400_000),
      ],
    },
    {
      seq: 3,
      id: "TX-10041",
      reference: "PF184420410",
      traceId: "ERR-18441",
      type: "TRANSFER",
      status: "FAILED",
      amount: 500_000_000,
      fee: 0,
      description: "",
      senderId: sara,
      receiverId: narges,
      parties: [sara],
      createdAt: new Date(t - 6 * DAY + 3_600_000).toISOString(),
      code: "INSUFFICIENT_BALANCE",
      ledger: [],
    },
    {
      seq: 4,
      id: "TX-10052",
      reference: "PF184420520",
      traceId: "ERR-18452",
      type: "TOP_UP",
      status: "FAILED",
      amount: 30_000_000,
      fee: 0,
      description: "",
      senderId: null,
      receiverId: sara,
      parties: [sara],
      createdAt: new Date(t - 3 * DAY).toISOString(),
      code: "PAYMENT_FAILED",
      paymentId: "PAY-10052",
      ledger: [],
    },
    {
      seq: 5,
      id: "TX-10058",
      reference: "PF184420588",
      traceId: "TRC-10058",
      type: "TOP_UP",
      status: "SUCCESS",
      amount: 40_000_000,
      fee: 0,
      description: "",
      senderId: null,
      receiverId: sara,
      parties: [sara],
      createdAt: new Date(t - 3 * DAY + 7_200_000).toISOString(),
      idempotencyKey: "seed-topup-2",
      paymentId: "PAY-10058",
      ledger: [line("LG-5", sara, "CREDIT", 40_000_000, 160_000_000)],
    },
    {
      seq: 6,
      id: "TX-10077",
      reference: "PF184420771",
      traceId: "TRC-10077",
      type: "TRANSFER",
      status: "SUCCESS",
      amount: 12_000_000,
      fee: 0,
      description: "بازگشت قرض",
      senderId: narges,
      receiverId: sara,
      parties: [narges, sara],
      createdAt: new Date(t - DAY).toISOString(),
      ledger: [
        line("LG-6a", narges, "DEBIT", 12_000_000, 53_000_000),
        line("LG-6b", sara, "CREDIT", 12_000_000, 200_000_000),
      ],
    },
    {
      seq: 7,
      id: "TX-10091",
      reference: "PF184420911",
      traceId: "TRC-10091",
      type: "TRANSFER",
      status: "SUCCESS",
      amount: 18_000_000,
      fee: 0,
      description: "کرایه",
      senderId: sara,
      receiverId: kian,
      parties: [sara, kian],
      createdAt: new Date(t - 2 * 3_600_000).toISOString(),
      idempotencyKey: "seed-trf-today",
      ledger: [
        line("LG-7a", sara, "DEBIT", 18_000_000, 212_000_000),
        line("LG-7b", kian, "CREDIT", 18_000_000, 82_400_000),
      ],
    },
    {
      seq: 8,
      id: "TX-10096",
      reference: "PF184420966",
      traceId: "TRC-10096",
      type: "TOP_UP",
      status: "SUCCESS",
      amount: 2_500_000,
      fee: 0,
      description: "",
      senderId: null,
      receiverId: sara,
      parties: [sara],
      createdAt: new Date(t - 30 * 60_000).toISOString(),
      idempotencyKey: "seed-topup-3",
      paymentId: "PAY-10096",
      ledger: [line("LG-8", sara, "CREDIT", 2_500_000, 194_000_000)],
    },
  ];

  const wallet = (userId: string, tier: KycProfile["tier"]): WalletRecord => ({
    id: walletIds[userId] ?? `WLT-${userId.slice(-4)}`,
    userId,
    status: "ACTIVE",
    currency: "IRR",
    dailyLimit: TIERS[tier].dailyLimit,
    version: 8,
  });

  const systemAccounts: Account[] = Object.entries(SYSTEM_NAMES).map(([id, name]) => ({
    id,
    name,
    mobile: "",
    secret: "",
    status: "DISABLED",
    system: true,
  }));

  /** Internal books hold the other side of every exchange, so they start funded. */
  const marketPositions: Record<string, number> = {};
  for (const code of FX_CURRENCIES) marketPositions[code] = 50_000_000;
  marketPositions.BTC = 500;
  marketPositions.ETH = 9_000;
  marketPositions.USDT = 20_000_000;
  const custodyPositions: Record<string, number> = {};
  for (const code of FUND_CODES) custodyPositions[code] = 500_000_000;

  return {
    seq: 8,
    accounts: [
      { id: sara, name: names[sara]!, mobile: DEMO_MOBILE, secret: digestOf(DEMO_SECRET), status: "ACTIVE" },
      { id: kian, name: names[kian]!, mobile: "09124484821", secret: digestOf("payflow1234"), status: "ACTIVE" },
      { id: narges, name: names[narges]!, mobile: "09351231104", secret: digestOf("payflow1234"), status: "ACTIVE" },
      ...systemAccounts,
    ],
    wallets: { [sara]: wallet(sara, 2), [kian]: wallet(kian, 1), [narges]: wallet(narges, 1) },
    balances: {
      [sara]: 196_500_000,
      [kian]: 100_400_000,
      [narges]: 41_000_000,
      [MARKET]: 80_000_000_000_000,
      [CUSTODY]: 0,
      [CREDIT_BOOK]: 40_000_000_000_000,
      [ACQUIRER]: 0,
      [NOSTRO]: 0,
      [TREASURY]: 0,
    },
    positions: { [MARKET]: marketPositions, [CUSTODY]: custodyPositions },
    transactions,
    payments: [
      { id: "PAY-10021", userId: sara, amount: 80_000_000, status: "SUCCESS", providerRef: "GW-5211", transactionId: "TX-10021", callbackCount: 1 },
      { id: "PAY-10052", userId: sara, amount: 30_000_000, status: "FAILED", providerRef: "GW-5521", transactionId: "TX-10052", callbackCount: 1 },
      { id: "PAY-10058", userId: sara, amount: 40_000_000, status: "SUCCESS", providerRef: "GW-5588", transactionId: "TX-10058", callbackCount: 1 },
      { id: "PAY-10096", userId: sara, amount: 2_500_000, status: "SUCCESS", providerRef: "GW-5966", transactionId: "TX-10096", callbackCount: 1 },
    ],
    audits: [],
    notices: [
      {
        id: "NT-TX-10096",
        userId: sara,
        title: "شارژ انجام شد",
        body: "کیف پول بستانکار شد. مرجع PF184420966",
        createdAt: new Date(t - 30 * 60_000).toISOString(),
        read: true,
        delivery: "SENT",
        transactionId: "TX-10096",
      },
      {
        id: "NT-TX-10091",
        userId: sara,
        title: "انتقال ثبت شد",
        body: "مرجع PF184420911",
        createdAt: new Date(t - 2 * 3_600_000).toISOString(),
        read: true,
        delivery: "RETRYING",
        transactionId: "TX-10091",
      },
    ],
    idempotency: {
      [`${sara}:transfer:seed-trf-1`]: "TX-10034",
      [`${sara}:transfer:seed-trf-today`]: "TX-10091",
      [`${sara}:topup:seed-topup-1`]: "TX-10021",
      [`${sara}:topup:seed-topup-2`]: "TX-10058",
      [`${sara}:topup:seed-topup-3`]: "TX-10096",
    },
    kyc: {
      [sara]: kycProfile(sara, 2, iso),
      [kian]: kycProfile(kian, 1, iso),
      [narges]: kycProfile(narges, 1, iso),
    },
    loans: [],
    cards: [],
    remittances: [],
    merchants: [],
    captures: [],
    settlements: [],
    session: null,
    authError: null,
    lastResult: null,
    opsResult: null,
  };
}

function digestOf(value: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `pf1$${hash.toString(16)}`;
}

function failedTransaction(
  state: WalletState,
  input: {
    type: TxType;
    amount: number;
    description: string;
    senderId: string | null;
    receiverId: string | null;
    code: string;
    title: string;
    message: string;
    key?: string;
    scope?: string;
  },
): WalletState {
  const userId = state.session!.userId;
  const seq = state.seq + 1;
  const tx: Transaction = {
    seq,
    id: `TX-${10_000 + seq}`,
    reference: reference(),
    traceId: traceErr(),
    type: input.type,
    status: "FAILED",
    amount: input.amount,
    fee: 0,
    description: input.description,
    senderId: input.senderId,
    receiverId: input.receiverId,
    parties: [userId],
    createdAt: new Date().toISOString(),
    idempotencyKey: input.key,
    code: input.code,
    ledger: [],
  };
  const keyPath = input.key && input.scope ? `${userId}:${input.scope}:${input.key}` : null;
  return {
    ...state,
    seq,
    transactions: [...state.transactions, tx],
    idempotency: keyPath ? { ...state.idempotency, [keyPath]: tx.id } : state.idempotency,
    lastResult: resultOf(tx, "bad", input.title, `${input.message} موجودی کیف پول شما تغییر نکرده است.`, false, {
      counterparty:
        input.receiverId && input.receiverId !== userId ? maskName(accountName(state, input.receiverId)) : undefined,
      balanceAfter: walletBalance(state),
    }),
  };
}

export function reducer(state: WalletState, action: Action): WalletState {
  switch (action.type) {
    case "CLEAR_AUTH_ERROR":
      return state.authError ? { ...state, authError: null } : state;

    case "REGISTER": {
      const name = action.name.trim();
      const mobile = action.mobile.trim();
      if (name.length < 3) {
        return { ...state, authError: "نام را کامل وارد کنید." };
      }
      if (!/^09\d{9}$/.test(mobile)) {
        return { ...state, authError: "شماره موبایل باید با ۰۹ شروع شود و ۱۱ رقم باشد." };
      }
      if (action.secret.length < SECRET_MIN) {
        return { ...state, authError: `گذرواژه باید دست‌کم ${SECRET_MIN} نویسه باشد.` };
      }
      if (state.accounts.some((account) => account.mobile === mobile)) {
        return { ...state, authError: "امکان ثبت‌نام با این اطلاعات نیست." };
      }
      const seq = state.seq + 1;
      const userId = `USR-${2000 + seq}`;
      const account: Account = {
        id: userId,
        name,
        mobile,
        secret: digestOf(action.secret),
        status: "ACTIVE",
      };
      return {
        ...state,
        seq,
        accounts: [...state.accounts, account],
        wallets: {
          ...state.wallets,
          [userId]: {
            id: `WLT-${2000 + seq}`,
            userId,
            status: "ACTIVE",
            currency: "IRR",
            dailyLimit: TIERS[1].dailyLimit,
            version: 1,
          },
        },
        balances: { ...state.balances, [userId]: 0 },
        kyc: { ...state.kyc, [userId]: kycProfile(userId, 1, new Date().toISOString()) },
        session: { userId, token: `sess_${digestOf(userId + Date.now()).slice(4)}`, issuedAt: new Date().toISOString() },
        authError: null,
        lastResult: null,
        opsResult: null,
      };
    }

    case "LOGIN": {
      const mobile = action.mobile.trim();
      const account = state.accounts.find((item) => item.mobile === mobile && !item.system);
      if (!account || account.secret !== digestOf(action.secret)) {
        return { ...state, authError: "اطلاعات ورود درست نیست." };
      }
      if (account.status !== "ACTIVE") {
        return { ...state, authError: "این حساب فعال نیست." };
      }
      return {
        ...state,
        session: {
          userId: account.id,
          token: `sess_${digestOf(account.id + Date.now()).slice(4)}`,
          issuedAt: new Date().toISOString(),
        },
        authError: null,
        lastResult: null,
        opsResult: null,
      };
    }

    case "LOGOUT":
      return { ...state, session: null, authError: null, lastResult: null, opsResult: null };

    case "READ_NOTICES": {
      const userId = state.session?.userId;
      if (!userId) return state;
      return {
        ...state,
        notices: state.notices.map((notice) => (notice.userId === userId ? { ...notice, read: true } : notice)),
      };
    }

    case "CHANGE_STATUS": {
      const wallet = currentWallet(state);
      if (!wallet) return state;
      const reason = action.reason.trim();
      if (!reason) {
        return rejectOps(state, "REASON_REQUIRED", "دلیل لازم است", "تغییر وضعیت کیف پول بدون دلیل ثبت نمی‌شود.");
      }
      if (action.status === wallet.status) {
        return {
          ...state,
          opsResult: {
            tone: "neutral",
            title: "وضعیت تغییری نکرد",
            message: "همین وضعیت از قبل برقرار است. رکورد ممیزی تازه‌ای نوشته نشد.",
            balanceChanged: false,
          },
        };
      }
      const audit: AuditEntry = {
        id: `AUD-${state.seq + 1}`,
        actor: "مدیر عملیات",
        action: "WALLET_STATUS",
        entity: wallet.id,
        from: statusLabel(wallet.status),
        to: statusLabel(action.status),
        reason,
        createdAt: new Date().toISOString(),
      };
      return {
        ...state,
        seq: state.seq + 1,
        wallets: {
          ...state.wallets,
          [wallet.userId]: { ...wallet, status: action.status, version: wallet.version + 1 },
        },
        audits: [audit, ...state.audits],
        opsResult: {
          tone: "ok",
          title: "وضعیت کیف پول تغییر کرد",
          message: `از ${statusLabel(wallet.status)} به ${statusLabel(action.status)}. این تغییر در ممیزی ثبت شد و هیچ رکورد مالی حذف نشد.`,
          balanceChanged: false,
        },
      };
    }

    case "REVERSE": {
      const userId = state.session?.userId;
      if (!userId) return state;
      const reason = action.reason.trim();
      const original = state.transactions.find((tx) => tx.id === action.transactionId);
      if (!original) return state;
      if (!reason) {
        return rejectOps(state, "REASON_REQUIRED", "دلیل لازم است", "برگشت وجه بدون دلیل ثبت نمی‌شود.");
      }
      if (original.status !== "SUCCESS") {
        return rejectOps(
          state,
          "NOT_REVERSIBLE",
          "این تراکنش قابل برگشت نیست",
          "فقط تراکنش موفق می‌تواند عمل جبرانی داشته باشد.",
        );
      }
      if (original.ledger.length === 0) {
        return rejectOps(
          state,
          "NOTHING_TO_REVERSE",
          "سطری برای جبران نیست",
          "این تراکنش هیچ سطر دفترکلی ندارد، پس چیزی برای خنثی کردن وجود ندارد.",
        );
      }

      const seq = state.seq + 1;
      const posted = applyLines(
        state,
        seq,
        original.ledger.map((item) => ({
          ownerId: item.ownerId,
          side: item.side === "DEBIT" ? ("CREDIT" as const) : ("DEBIT" as const),
          amount: item.amount,
          instrument: item.instrument,
        })),
      );
      if (!posted.ok) {
        const unit = posted.failure.instrument === "IRR" ? "ریال" : posted.failure.instrument;
        return rejectOps(
          state,
          "INSUFFICIENT_BALANCE",
          "برگشت وجه ممکن نیست",
          `دارایی ${posted.failure.ownerName} برای جبران کافی نیست. ${posted.failure.needed} ${unit} لازم بود و ${posted.failure.held} ${unit} موجود است. هیچ سطر دفترکلی نوشته نشد و تراکنش اصلی دست‌نخورده ماند.`,
        );
      }

      const reversal: Transaction = {
        seq,
        id: `TX-${10_000 + seq}`,
        reference: reference(),
        traceId: traceOk(seq),
        type: "REVERSAL",
        status: "SUCCESS",
        amount: original.amount,
        fee: 0,
        description: reason,
        senderId: original.receiverId,
        receiverId: original.senderId,
        parties: original.parties,
        createdAt: new Date().toISOString(),
        code: "SUCCESS",
        reversalOf: original.id,
        ledger: posted.result.lines,
      };
      const audit: AuditEntry = {
        id: `AUD-${seq}`,
        actor: "مدیر عملیات",
        action: "REVERSAL",
        entity: original.reference,
        from: "موفق",
        to: "برگشت‌خورده",
        reason,
        createdAt: reversal.createdAt,
      };
      const notice: Notice = {
        id: `NT-${reversal.id}`,
        userId,
        title: "برگشت وجه ثبت شد",
        body: `جبران تراکنش ${original.reference} با مرجع ${reversal.reference}`,
        createdAt: reversal.createdAt,
        read: false,
        delivery: "SENT",
        transactionId: reversal.id,
      };
      const wallet = currentWallet(state);
      return {
        ...state,
        seq,
        balances: posted.result.balances,
        positions: posted.result.positions,
        wallets: wallet
          ? { ...state.wallets, [wallet.userId]: { ...wallet, version: wallet.version + 1 } }
          : state.wallets,
        transactions: [
          ...state.transactions.map((tx) =>
            tx.id === original.id ? { ...tx, status: "REVERSED" as TxStatus, reversedBy: reversal.id } : tx,
          ),
          reversal,
        ],
        audits: [audit, ...state.audits],
        notices: [notice, ...state.notices],
        opsResult: {
          tone: "ok",
          title: "برگشت وجه ثبت شد",
          message: `تراکنش اصلی حذف نشد و وضعیتش برگشت‌خورده است. رکورد جبرانی به ${original.reference} ارجاع دارد.`,
          balanceChanged: true,
          reference: reversal.reference,
          transactionId: reversal.id,
        },
      };
    }

    case "TOPUP_BEGIN": {
      const user = currentUser(state);
      const wallet = currentWallet(state);
      if (!user || !wallet) return state;
      if (user.status !== "ACTIVE") {
        return reject(state, "USER_NOT_ACTIVE", "حساب فعال نیست", "تا فعال شدن حساب، عملیات مالی انجام نمی‌شود.");
      }
      if (action.amount < TOPUP_MIN || action.amount > TOPUP_MAX) {
        return reject(
          state,
          "INVALID_AMOUNT",
          "مبلغ نامعتبر است",
          "مبلغ شارژ باید در محدوده مجاز باشد. موجودی تغییر نکرده است.",
        );
      }
      if (wallet.status === "CLOSED") {
        return failedTransaction(state, {
          type: "TOP_UP",
          amount: action.amount,
          description: "",
          senderId: null,
          receiverId: user.id,
          code: "WALLET_CLOSED",
          title: "شارژ انجام نشد",
          message: "کیف پول بسته است و شارژ جدید پذیرفته نمی‌شود.",
        });
      }
      const seq = state.seq + 1;
      const paymentId = `PAY-${10_000 + seq}`;
      const tx: Transaction = {
        seq,
        id: `TX-${10_000 + seq}`,
        reference: reference(),
        traceId: traceOk(seq),
        type: "TOP_UP",
        status: "PENDING",
        amount: action.amount,
        fee: 0,
        description: "",
        senderId: null,
        receiverId: user.id,
        parties: [user.id],
        createdAt: new Date().toISOString(),
        paymentId,
        ledger: [],
      };
      return {
        ...state,
        seq,
        transactions: [...state.transactions, tx],
        payments: [
          ...state.payments,
          { id: paymentId, userId: user.id, amount: action.amount, status: "PENDING", transactionId: tx.id, callbackCount: 0 },
        ],
        lastResult: resultOf(
          tx,
          "neutral",
          "پرداخت در انتظار تأیید است",
          "رکورد پرداخت ساخته شد. تا تأیید درگاه، موجودی تغییر نمی‌کند.",
          false,
          { counterparty: "درگاه پرداخت", balanceAfter: walletBalance(state) },
        ),
      };
    }

    case "TOPUP_CANCEL": {
      const payment = state.payments.find((item) => item.id === action.paymentId);
      if (!payment || payment.status !== "PENDING") return state;
      return settlePayment(state, payment, "CANCELLED");
    }

    case "TOPUP_CALLBACK": {
      const payment = state.payments.find((item) => item.id === action.paymentId);
      if (!payment) return state;
      const tx = state.transactions.find((item) => item.id === payment.transactionId);
      if (payment.status === "SUCCESS") {
        return {
          ...state,
          payments: state.payments.map((item) =>
            item.id === payment.id ? { ...item, callbackCount: item.callbackCount + 1 } : item,
          ),
          lastResult: {
            tone: "neutral",
            title: "این تأیید تکراری است",
            message: "پیام درگاه دوباره رسید و فقط رسید دریافت شد. کیف پول یک‌بار بستانکار شده و اثر مالی تازه‌ای ساخته نشد.",
            reference: tx?.reference,
            traceId: tx?.traceId,
            transactionId: tx?.id,
            balanceChanged: false,
            code: "DUPLICATE_CALLBACK",
            amount: payment.amount,
            counterparty: "درگاه پرداخت",
            balanceAfter: walletBalance(state),
          },
        };
      }
      if (payment.status !== "PENDING") {
        return {
          ...state,
          lastResult: {
            tone: "neutral",
            title: "این پرداخت بسته شده است",
            message: "وضعیت قبلی ناموفق یا لغو شده است و کیف پول بستانکار نمی‌شود.",
            balanceChanged: false,
            code: "PAYMENT_CLOSED",
            transactionId: payment.transactionId,
            balanceAfter: walletBalance(state),
          },
        };
      }
      return settlePayment(state, payment, action.outcome);
    }

    case "TRANSFER": {
      const user = currentUser(state);
      const wallet = currentWallet(state);
      if (!user || !wallet) return state;
      const keyPath = `${user.id}:transfer:${action.key}`;
      const priorId = state.idempotency[keyPath];
      if (priorId) {
        const prior = state.transactions.find((tx) => tx.id === priorId);
        if (prior) {
          const succeeded = prior.status === "SUCCESS";
          return {
            ...state,
            lastResult: {
              tone: "neutral",
              title: "درخواست تکراری است",
              message: succeeded
                ? "همین کلید یکتاسازی قبلاً ثبت شده است. نتیجه قبلی برگشت و انتقال تازه‌ای انجام نشد."
                : "همین درخواست قبلاً ناموفق بوده است. نتیجه قبلی برگشت و موجودی دوباره دست‌نخورده ماند.",
              reference: prior.reference,
              traceId: prior.traceId,
              transactionId: prior.id,
              balanceChanged: false,
              code: "IDEMPOTENT_REPLAY",
              amount: prior.amount,
              counterparty: counterpartyMasked(state, prior, user.id),
              balanceAfter: walletBalance(state),
            },
          };
        }
      }
      if (user.status !== "ACTIVE") {
        return reject(state, "USER_NOT_ACTIVE", "حساب فعال نیست", "تا فعال شدن حساب، عملیات مالی انجام نمی‌شود.");
      }
      const receiver = state.accounts.find((item) => item.id === action.receiverId);
      if (!receiver || receiver.id === user.id || receiver.status !== "ACTIVE" || receiver.system) {
        return reject(
          state,
          "INVALID_RECIPIENT",
          "گیرنده معتبر نیست",
          "انتقال به خود یا به شناسه ناشناس پذیرفته نمی‌شود. تراکنش مالی ساخته نشد و موجودی تغییر نکرده است.",
        );
      }
      if (action.amount <= 0) {
        return reject(state, "INVALID_AMOUNT", "مبلغ نامعتبر است", "مبلغ باید بزرگ‌تر از صفر باشد. موجودی تغییر نکرده است.");
      }
      if (action.description.length > DESCRIPTION_MAX) {
        return reject(
          state,
          "INVALID_DESCRIPTION",
          "توضیح بیش از حد بلند است",
          "توضیح تراکنش از حد مجاز گذشته است. موجودی تغییر نکرده است.",
        );
      }
      if (wallet.status !== "ACTIVE") {
        return failedTransaction(state, {
          type: "TRANSFER",
          amount: action.amount,
          description: action.description,
          senderId: user.id,
          receiverId: receiver.id,
          code: wallet.status === "CLOSED" ? "WALLET_CLOSED" : "WALLET_NOT_ACTIVE",
          title: "انتقال انجام نشد",
          message: statusNote(wallet.status),
          key: action.key,
          scope: "transfer",
        });
      }
      const balance = walletBalance(state);
      if (action.amount > balance) {
        return failedTransaction(state, {
          type: "TRANSFER",
          amount: action.amount,
          description: action.description,
          senderId: user.id,
          receiverId: receiver.id,
          code: "INSUFFICIENT_BALANCE",
          title: "انتقال انجام نشد",
          message: "موجودی قابل استفاده کافی نیست.",
          key: action.key,
          scope: "transfer",
        });
      }
      if (dailyUsed(state) + action.amount > wallet.dailyLimit) {
        return failedTransaction(state, {
          type: "TRANSFER",
          amount: action.amount,
          description: action.description,
          senderId: user.id,
          receiverId: receiver.id,
          code: "DAILY_LIMIT_EXCEEDED",
          title: "انتقال انجام نشد",
          message: "مجموع انتقال امروز از سقف روزانه عبور می‌کند.",
          key: action.key,
          scope: "transfer",
        });
      }

      const seq = state.seq + 1;
      const posted = applyLines(state, seq, [
        { ownerId: user.id, side: "DEBIT", amount: action.amount, instrument: "IRR" },
        { ownerId: receiver.id, side: "CREDIT", amount: action.amount, instrument: "IRR" },
      ]);
      if (!posted.ok) {
        return failedTransaction(state, {
          type: "TRANSFER",
          amount: action.amount,
          description: action.description,
          senderId: user.id,
          receiverId: receiver.id,
          code: "INSUFFICIENT_BALANCE",
          title: "انتقال انجام نشد",
          message: "موجودی قابل استفاده کافی نیست.",
          key: action.key,
          scope: "transfer",
        });
      }
      const tx: Transaction = {
        seq,
        id: `TX-${10_000 + seq}`,
        reference: reference(),
        traceId: traceOk(seq),
        type: "TRANSFER",
        status: "SUCCESS",
        amount: action.amount,
        fee: 0,
        description: action.description.trim(),
        senderId: user.id,
        receiverId: receiver.id,
        parties: [user.id, receiver.id],
        createdAt: new Date().toISOString(),
        idempotencyKey: action.key,
        code: "SUCCESS",
        ledger: posted.result.lines,
      };
      const notice: Notice = {
        id: `NT-${tx.id}`,
        userId: user.id,
        title: "انتقال ثبت شد",
        body: `مبلغ برای ${maskName(receiver.name)} ثبت شد. مرجع ${tx.reference}`,
        createdAt: tx.createdAt,
        read: false,
        delivery: "SENT",
        transactionId: tx.id,
      };
      return {
        ...state,
        seq,
        balances: posted.result.balances,
        positions: posted.result.positions,
        wallets: { ...state.wallets, [user.id]: { ...wallet, version: wallet.version + 1 } },
        transactions: [...state.transactions, tx],
        notices: [notice, ...state.notices],
        idempotency: { ...state.idempotency, [keyPath]: tx.id },
        lastResult: resultOf(
          tx,
          "ok",
          "انتقال انجام شد",
          "مبلغ از کیف پول شما کسر و برای گیرنده بستانکار شد. هر دو سطر دفترکل با هم ثبت شده‌اند.",
          true,
          { counterparty: maskName(receiver.name), balanceAfter: posted.result.balances[user.id] ?? 0 },
        ),
      };
    }

    default:
      return advancedReducer(state, action);
  }
}

function settlePayment(
  state: WalletState,
  payment: Payment,
  outcome: "SUCCESS" | "FAILED" | "CANCELLED",
): WalletState {
  const tx = state.transactions.find((item) => item.id === payment.transactionId);
  const wallet = state.wallets[payment.userId];
  if (!tx || !wallet) return state;
  const account = state.accounts.find((item) => item.id === payment.userId);
  const balance = state.balances[payment.userId] ?? 0;

  if (outcome === "SUCCESS") {
    const next = balance + payment.amount;
    const updated: Transaction = {
      ...tx,
      status: "SUCCESS",
      code: "SUCCESS",
      idempotencyKey: tx.idempotencyKey ?? payment.id,
      ledger: [
        {
          id: `LG-${tx.seq}`,
          walletId: wallet.id,
          ownerId: payment.userId,
          ownerName: account?.name ?? "",
          side: "CREDIT",
          amount: payment.amount,
          before: balance,
          after: next,
          instrument: "IRR",
        },
      ],
    };
    const notice: Notice = {
      id: `NT-${tx.id}`,
      userId: payment.userId,
      title: "شارژ انجام شد",
      body: `کیف پول بستانکار شد. مرجع ${tx.reference}`,
      createdAt: new Date().toISOString(),
      read: false,
      delivery: "SENT",
      transactionId: tx.id,
    };
    return {
      ...state,
      balances: { ...state.balances, [payment.userId]: next },
      wallets: { ...state.wallets, [payment.userId]: { ...wallet, version: wallet.version + 1 } },
      transactions: state.transactions.map((item) => (item.id === tx.id ? updated : item)),
      payments: state.payments.map((item) =>
        item.id === payment.id
          ? { ...item, status: "SUCCESS", callbackCount: item.callbackCount + 1, providerRef: item.providerRef ?? `GW-${tx.seq}` }
          : item,
      ),
      notices: [notice, ...state.notices],
      idempotency: { ...state.idempotency, [`${payment.userId}:topup:${payment.id}`]: tx.id },
      lastResult: resultOf(updated, "ok", "شارژ انجام شد", "پرداخت تأیید شد و کیف پول دقیقاً یک‌بار بستانکار شد.", true, {
        counterparty: "درگاه پرداخت",
        balanceAfter: next,
      }),
    };
  }

  const updated: Transaction = {
    ...tx,
    status: outcome === "CANCELLED" ? "CANCELLED" : "FAILED",
    code: outcome === "CANCELLED" ? "PAYMENT_CANCELLED" : "PAYMENT_FAILED",
    traceId: traceErr(),
    ledger: [],
  };
  return {
    ...state,
    transactions: state.transactions.map((item) => (item.id === tx.id ? updated : item)),
    payments: state.payments.map((item) =>
      item.id === payment.id
        ? {
            ...item,
            status: outcome === "CANCELLED" ? "CANCELLED" : "FAILED",
            callbackCount: item.callbackCount + 1,
            providerRef: item.providerRef ?? `GW-${tx.seq}`,
          }
        : item,
    ),
    lastResult: resultOf(
      updated,
      "bad",
      outcome === "CANCELLED" ? "شارژ لغو شد" : "شارژ انجام نشد",
      outcome === "CANCELLED"
        ? "پرداخت پیش از تکمیل لغو شد. موجودی کیف پول شما تغییر نکرده است."
        : "پرداخت درگاه ناموفق بود. موجودی کیف پول شما تغییر نکرده است.",
      false,
      { counterparty: "درگاه پرداخت", balanceAfter: balance },
    ),
  };
}