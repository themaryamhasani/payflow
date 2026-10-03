export type CurrencyCode = "IRR" | "USD" | "EUR" | "AED" | "TRY";
export type AssetCode = "BTC" | "ETH" | "USDT";
export type FundCode = "PF-FIX" | "PF-GOLD" | "PF-EQ";
export type CorridorCode = "TR" | "AE" | "DE";
export type MerchantCategory = "RETAIL" | "FOOD" | "DIGITAL" | "TRAVEL";

export const TREASURY_ID = "SYS-TREASURY";
export const TREASURY_NAME = "خزانه PayFlow";

export interface CurrencyInfo {
  code: CurrencyCode;
  label: string;
  symbol: string;
  decimals: number;
  /** Mid-market value of one unit, in rial. */
  mid: number;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyInfo> = {
  IRR: { code: "IRR", label: "ریال ایران", symbol: "ریال", decimals: 0, mid: 1 },
  USD: { code: "USD", label: "دلار آمریکا", symbol: "$", decimals: 2, mid: 1_050_000 },
  EUR: { code: "EUR", label: "یورو", symbol: "€", decimals: 2, mid: 1_140_000 },
  AED: { code: "AED", label: "درهم امارات", symbol: "AED", decimals: 2, mid: 286_000 },
  TRY: { code: "TRY", label: "لیر ترکیه", symbol: "₺", decimals: 2, mid: 31_000 },
};

export const FX_CURRENCIES: CurrencyCode[] = ["USD", "EUR", "AED", "TRY"];

export interface AssetInfo {
  code: AssetCode;
  label: string;
  decimals: number;
  /** Reference price of one unit, in rial. */
  price: number;
  note: string;
}

export const ASSETS: Record<AssetCode, AssetInfo> = {
  BTC: {
    code: "BTC",
    label: "بیت‌کوین",
    decimals: 8,
    price: 99_750_000_000,
    note: "نوسان بالا. قیمت مرجع هر ۳۰ ثانیه از تأمین‌کننده بازار گرفته می‌شود.",
  },
  ETH: {
    code: "ETH",
    label: "اتریوم",
    decimals: 8,
    price: 3_465_000_000,
    note: "نوسان بالا. سفارش با قیمت لحظه‌ای و اسپرد مشخص اجرا می‌شود.",
  },
  USDT: {
    code: "USDT",
    label: "تتر",
    decimals: 2,
    price: 1_050_000,
    note: "استیبل‌کوین. اسپرد کمتر، اما همان قواعد سقف و احراز هویت را دارد.",
  },
};

export const ASSET_CODES: AssetCode[] = ["BTC", "ETH", "USDT"];

export interface FundInfo {
  code: FundCode;
  label: string;
  kind: string;
  /** Net asset value of one unit, in rial. */
  nav: number;
  annualReturn: number;
  risk: "کم" | "متوسط" | "بالا";
  settlementDays: number;
}

export const FUNDS: Record<FundCode, FundInfo> = {
  "PF-FIX": {
    code: "PF-FIX",
    label: "درآمد ثابت پی‌فلو",
    kind: "اوراق و سپرده",
    nav: 42_350,
    annualReturn: 0.24,
    risk: "کم",
    settlementDays: 1,
  },
  "PF-GOLD": {
    code: "PF-GOLD",
    label: "طلای پی‌فلو",
    kind: "گواهی سپرده طلا",
    nav: 118_900,
    annualReturn: 0.41,
    risk: "متوسط",
    settlementDays: 2,
  },
  "PF-EQ": {
    code: "PF-EQ",
    label: "سهامی پی‌فلو",
    kind: "سهام بورس تهران",
    nav: 76_420,
    annualReturn: 0.33,
    risk: "بالا",
    settlementDays: 3,
  },
};

export const FUND_CODES: FundCode[] = ["PF-FIX", "PF-GOLD", "PF-EQ"];

export interface CorridorInfo {
  code: CorridorCode;
  country: string;
  payoutCurrency: CurrencyCode;
  /** Business days until the beneficiary is paid. */
  days: number;
  /** Amount in rial above which the transfer waits for compliance review. */
  reviewAbove: number;
  partner: string;
}

export const CORRIDORS: Record<CorridorCode, CorridorInfo> = {
  TR: { code: "TR", country: "ترکیه", payoutCurrency: "TRY", days: 1, reviewAbove: 300_000_000, partner: "Anadolu Pay" },
  AE: { code: "AE", country: "امارات", payoutCurrency: "AED", days: 1, reviewAbove: 200_000_000, partner: "Gulf Remit" },
  DE: { code: "DE", country: "آلمان", payoutCurrency: "EUR", days: 2, reviewAbove: 150_000_000, partner: "SEPA Bridge" },
};

export const CORRIDOR_CODES: CorridorCode[] = ["TR", "AE", "DE"];

export interface CategoryInfo {
  code: MerchantCategory;
  label: string;
  /** Merchant discount rate in basis points. */
  mdrBps: number;
  /** Fixed component per capture, in rial. */
  fixed: number;
}

export const CATEGORIES: Record<MerchantCategory, CategoryInfo> = {
  RETAIL: { code: "RETAIL", label: "خرده‌فروشی", mdrBps: 120, fixed: 5_000 },
  FOOD: { code: "FOOD", label: "غذا و رستوران", mdrBps: 160, fixed: 4_000 },
  DIGITAL: { code: "DIGITAL", label: "کالای دیجیتال", mdrBps: 95, fixed: 8_000 },
  TRAVEL: { code: "TRAVEL", label: "سفر و بلیت", mdrBps: 75, fixed: 12_000 },
};

export const CATEGORY_CODES: MerchantCategory[] = ["RETAIL", "FOOD", "DIGITAL", "TRAVEL"];

export type Tier = 0 | 1 | 2 | 3;

export interface TierInfo {
  tier: Tier;
  label: string;
  requirement: string;
  dailyLimit: number;
  /** Largest single crypto or currency order, in rial. */
  orderLimit: number;
}

export const TIERS: Record<Tier, TierInfo> = {
  0: {
    tier: 0,
    label: "پایه",
    requirement: "شماره موبایل تأییدشده",
    dailyLimit: 20_000_000,
    orderLimit: 0,
  },
  1: {
    tier: 1,
    label: "تأیید کد ملی",
    requirement: "کد ملی و تاریخ تولد تطبیق‌خورده",
    dailyLimit: 100_000_000,
    orderLimit: 50_000_000,
  },
  2: {
    tier: 2,
    label: "تأیید مدرک و چهره",
    requirement: "کارت ملی، تصویر زنده و تطبیق چهره",
    dailyLimit: 500_000_000,
    orderLimit: 300_000_000,
  },
  3: {
    tier: 3,
    label: "تأیید کامل",
    requirement: "نشانی، منبع درآمد و پاکی فهرست‌های تحریمی",
    dailyLimit: 2_000_000_000,
    orderLimit: 1_500_000_000,
  },
};

export const TIER_ORDER: Tier[] = [0, 1, 2, 3];

export type Capability = "FX" | "CRYPTO" | "FUND" | "CREDIT" | "CARD" | "REMIT" | "MERCHANT";

export interface CapabilityInfo {
  code: Capability;
  label: string;
  minTier: Tier;
  summary: string;
}

export const CAPABILITIES: Record<Capability, CapabilityInfo> = {
  FX: {
    code: "FX",
    label: "تبدیل چندارزی",
    minTier: 2,
    summary: "جیب ارزی جدا از ریال، با نرخ لحظه‌ای و اسپرد اعلام‌شده.",
  },
  CRYPTO: {
    code: "CRYPTO",
    label: "رمزارز",
    minTier: 2,
    summary: "خرید و فروش رمزارز در برابر ریال، با نگهداری امانی.",
  },
  FUND: {
    code: "FUND",
    label: "سرمایه‌گذاری",
    minTier: 2,
    summary: "صدور و ابطال واحد صندوق، با تسویه در روز کاری بعد.",
  },
  CREDIT: {
    code: "CREDIT",
    label: "وام، اعتبار و خرید اقساطی",
    minTier: 2,
    summary: "اعتبار بر پایه سابقه کیف پول، با جدول اقساط و جریمه دیرکرد.",
  },
  CARD: {
    code: "CARD",
    label: "کارت فیزیکی",
    minTier: 2,
    summary: "صدور کارت، رهگیری ارسال، فعال‌سازی و قفل فوری.",
  },
  REMIT: {
    code: "REMIT",
    label: "انتقال بین‌المللی",
    minTier: 3,
    summary: "حواله به ذی‌نفع خارجی، با بازبینی انطباق و تبدیل ارز.",
  },
  MERCHANT: {
    code: "MERCHANT",
    label: "تسویه پذیرنده",
    minTier: 3,
    summary: "پذیرش پرداخت، موتور کارمزد و تسویه دسته‌ای به کیف پول.",
  },
};

export const CAPABILITY_CODES: Capability[] = ["FX", "CRYPTO", "FUND", "CREDIT", "CARD", "REMIT", "MERCHANT"];

export const CARD_ISSUE_FEE = 2_500_000;
export const CARD_ANNUAL_FEE = 1_200_000;

/** Credit ceiling per tier, in rial. */
export const CREDIT_CEILING: Record<Tier, number> = {
  0: 0,
  1: 0,
  2: 150_000_000,
  3: 600_000_000,
};

export const CREDIT_TERMS = [3, 6, 12] as const;
export type CreditTerm = (typeof CREDIT_TERMS)[number];

/** Annual profit rate applied to a credit plan. */
export const CREDIT_RATE: Record<CreditTerm, number> = {
  3: 0.18,
  6: 0.21,
  12: 0.26,
};

export function currencyInfo(code: CurrencyCode) {
  return CURRENCIES[code];
}

export function instrumentLabel(code: string) {
  if (code in CURRENCIES) return CURRENCIES[code as CurrencyCode].label;
  if (code in ASSETS) return ASSETS[code as AssetCode].label;
  if (code in FUNDS) return FUNDS[code as FundCode].label;
  return code;
}

export function instrumentDecimals(code: string) {
  if (code in CURRENCIES) return CURRENCIES[code as CurrencyCode].decimals;
  if (code in ASSETS) return ASSETS[code as AssetCode].decimals;
  if (code in FUNDS) return 4;
  return 0;
}

/** Rial value of one instrument unit. */
export function unitValue(code: string) {
  if (code in CURRENCIES) return CURRENCIES[code as CurrencyCode].mid;
  if (code in ASSETS) return ASSETS[code as AssetCode].price;
  if (code in FUNDS) return FUNDS[code as FundCode].nav;
  return 0;
}
