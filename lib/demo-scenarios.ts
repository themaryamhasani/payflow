import { remittanceFee } from "@/lib/fees";
import {
  DEMO_MOBILE,
  DEMO_SECRET,
  reducer,
  tierOf,
  type Action,
  type WalletState,
} from "@/lib/wallet-state";

export type ScenarioId = "transfer" | "kyc" | "remit";

export type ScenarioScreen =
  | "history"
  | "identity"
  | "remit"
  | "home";

export interface ScenarioDef {
  id: ScenarioId;
  title: string;
  summary: string;
}

export const SCENARIOS: ScenarioDef[] = [
  {
    id: "transfer",
    title: "انتقال ساده",
    summary: "۱۵ میلیون ریال به کیان منتقل می‌شود تا ثبت اتمیک و تاریخچه دیده شود.",
  },
  {
    id: "kyc",
    title: "ارتقای هویت",
    summary: "پرونده سطح ۳ با پاسخ مثبت سامانه بیرونی تأیید می‌شود و سقف‌ها بالا می‌رود.",
  },
  {
    id: "remit",
    title: "حواله با بازبینی",
    summary: "حواله‌ای بالای آستانه ترکیه ثبت می‌شود و در بازبینی انطباق می‌ماند.",
  },
];

export interface ScenarioPlan {
  id: ScenarioId;
  actions: Action[];
  screen: ScenarioScreen;
  title: string;
  message: string;
}

function withSaraSession(state: WalletState): { state: WalletState; actions: Action[] } {
  const sara = state.accounts.find((item) => item.mobile === DEMO_MOBILE && !item.system);
  if (sara && state.session?.userId === sara.id) {
    return { state, actions: [] };
  }
  const login: Action = { type: "LOGIN", mobile: DEMO_MOBILE, secret: DEMO_SECRET };
  return { state: reducer(state, login), actions: [login] };
}

function ensureFunds(state: WalletState, minimum: number, bag: Action[]) {
  let next = state;
  const userId = next.session?.userId;
  if (!userId) return next;
  const held = next.balances[userId] ?? 0;
  if (held >= minimum) return next;
  const amount = Math.max(minimum - held, 10_000_000);
  const begin: Action = { type: "TOPUP_BEGIN", amount };
  next = reducer(next, begin);
  bag.push(begin);
  const payment = next.payments[next.payments.length - 1];
  if (!payment) return next;
  const callback: Action = { type: "TOPUP_CALLBACK", paymentId: payment.id, outcome: "SUCCESS" };
  next = reducer(next, callback);
  bag.push(callback);
  return next;
}

function ensureTier3(state: WalletState, bag: Action[]) {
  let next = state;
  const userId = next.session?.userId;
  if (!userId) return next;
  if (tierOf(next, userId) >= 3) return next;
  const submit: Action = {
    type: "KYC_SUBMIT",
    targetTier: 3,
    nationalId: "1234567891",
    address: "تهران، خیابان ولیعصر، پلاک ۱۲",
    incomeSource: "حقوق کارمندی",
  };
  next = reducer(next, submit);
  bag.push(submit);
  const pass: Action = { type: "KYC_RESULT", outcome: "PASS" };
  next = reducer(next, pass);
  bag.push(pass);
  return next;
}

/** Builds an ordered action list by simulating the reducer, then UI can replay it. */
export function buildScenario(state: WalletState, id: ScenarioId): ScenarioPlan {
  const seeded = withSaraSession(state);
  let next = seeded.state;
  const actions = [...seeded.actions];

  if (id === "transfer") {
    next = ensureFunds(next, 20_000_000, actions);
    const transfer: Action = {
      type: "TRANSFER",
      receiverId: "USR-1002",
      amount: 15_000_000,
      description: "سناریوی انتقال نمونه",
      key: `scenario-transfer-${Date.now()}`,
    };
    actions.push(transfer);
    return {
      id,
      actions,
      screen: "history",
      title: "سناریوی انتقال اجرا شد",
      message: "۱۵٬۰۰۰٬۰۰۰ ریال به کیان رضایی منتقل شد. جزئیات و سطرهای دفترکل را در تاریخچه ببینید.",
    };
  }

  if (id === "kyc") {
    const userId = next.session?.userId ?? "";
    if (tierOf(next, userId) >= 3) {
      return {
        id,
        actions,
        screen: "identity",
        title: "سطح ۳ از قبل فعال است",
        message: "برای دیدن دوباره مسیر ارتقا، اول دمو را بازنشانی کنید.",
      };
    }
    ensureTier3(next, actions);
    return {
      id,
      actions,
      screen: "identity",
      title: "سناریوی هویت اجرا شد",
      message: "سطح تأیید کامل فعال شد. سقف روزانه و قابلیت‌های پیشرفته باز شدند.",
    };
  }

  // remit
  next = ensureTier3(next, actions);
  const amount = 320_000_000;
  const fee = remittanceFee("TR", amount).total;
  next = ensureFunds(next, amount + fee + 1_000_000, actions);
  const remit: Action = {
    type: "REMIT_SEND",
    corridor: "TR",
    beneficiary: "مریم حسنی",
    iban: "TR330006100519786457841326",
    amount,
    purpose: "سناریوی بازبینی انطباق",
    key: `scenario-remit-${Date.now()}`,
  };
  actions.push(remit);
  return {
    id,
    actions,
    screen: "remit",
    title: "سناریوی حواله اجرا شد",
    message: "حواله بالای آستانه مسیر ترکیه ثبت شد و برای بازبینی انطباق نگه داشته شد.",
  };
}
