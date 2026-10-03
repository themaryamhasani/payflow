import { ASSETS, CATEGORIES, CORRIDORS, type AssetCode, type CorridorCode, type MerchantCategory } from "@/lib/catalog";
import { formatGrouped, toPersianDigits } from "@/lib/format";

export type FeeKind =
  | "FX"
  | "CRYPTO"
  | "REMITTANCE"
  | "CARD_ISSUE"
  | "FUND_BUY"
  | "FUND_REDEEM"
  | "INSTALLMENT_LATE"
  | "SETTLEMENT";

export interface FeeComponent {
  code: string;
  label: string;
  amount: number;
  /** The rule that produced this number, shown to the user. */
  rule: string;
}

export interface FeeQuote {
  kind: FeeKind;
  base: number;
  components: FeeComponent[];
  total: number;
}

export const VAT_RATE = 0.1;

interface Band {
  upTo: number;
  bps: number;
}

function bandFor(bands: Band[], amount: number) {
  return bands.find((band) => amount <= band.upTo) ?? bands[bands.length - 1]!;
}

function roundFee(value: number) {
  return Math.round(value / 1_000) * 1_000;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function bps(amount: number, rate: number) {
  return (amount * rate) / 10_000;
}

function formatBps(rate: number) {
  const text = (rate / 100).toFixed(2).replace(/\.00$/, "").replace(".", "٫");
  return `${toPersianDigits(text)}٪`;
}

const FX_BANDS: Band[] = [
  { upTo: 50_000_000, bps: 90 },
  { upTo: 200_000_000, bps: 70 },
  { upTo: 1_000_000_000, bps: 55 },
  { upTo: Number.POSITIVE_INFINITY, bps: 40 },
];

const CRYPTO_BASE_BPS: Record<AssetCode, number> = { BTC: 120, ETH: 130, USDT: 55 };

const CRYPTO_DISCOUNT: Band[] = [
  { upTo: 50_000_000, bps: 0 },
  { upTo: 200_000_000, bps: 1_000 },
  { upTo: 1_000_000_000, bps: 2_000 },
  { upTo: Number.POSITIVE_INFINITY, bps: 3_000 },
];

const REMIT_BANDS: Band[] = [
  { upTo: 100_000_000, bps: 150 },
  { upTo: 300_000_000, bps: 110 },
  { upTo: Number.POSITIVE_INFINITY, bps: 85 },
];

const REMIT_PARTNER_FEE: Record<CorridorCode, number> = { TR: 350_000, AE: 420_000, DE: 650_000 };

const VOLUME_DISCOUNT: Band[] = [
  { upTo: 1_000_000_000, bps: 0 },
  { upTo: 5_000_000_000, bps: 1_000 },
  { upTo: 20_000_000_000, bps: 2_000 },
  { upTo: Number.POSITIVE_INFINITY, bps: 3_000 },
];

function withVat(kind: FeeKind, base: number, components: FeeComponent[]): FeeQuote {
  const net = components.reduce((sum, item) => sum + item.amount, 0);
  const vat = roundFee(net * VAT_RATE);
  const all = vat > 0
    ? [
        ...components,
        {
          code: "VAT",
          label: "مالیات بر ارزش افزوده",
          amount: vat,
          rule: `${formatBps(VAT_RATE * 10_000)} روی جمع کارمزد، نه روی اصل مبلغ`,
        },
      ]
    : components;
  return { kind, base, components: all, total: all.reduce((sum, item) => sum + item.amount, 0) };
}

export function fxFee(amount: number): FeeQuote {
  const band = bandFor(FX_BANDS, amount);
  const raw = bps(amount, band.bps);
  const capped = clamp(roundFee(raw), 20_000, 5_000_000);
  return withVat("FX", amount, [
    {
      code: "SPREAD",
      label: "اسپرد تبدیل",
      amount: capped,
      rule: `${formatBps(band.bps)} پله مبلغ، با کف ۲۰٬۰۰۰ و سقف ۵٬۰۰۰٬۰۰۰ ریال`,
    },
  ]);
}

export function cryptoFee(asset: AssetCode, amount: number): FeeQuote {
  const baseBps = CRYPTO_BASE_BPS[asset];
  const discount = bandFor(CRYPTO_DISCOUNT, amount).bps;
  const effective = baseBps * (1 - discount / 10_000);
  const capped = clamp(roundFee(bps(amount, effective)), 50_000, 20_000_000);
  return withVat("CRYPTO", amount, [
    {
      code: "SPREAD",
      label: `اسپرد ${ASSETS[asset].label}`,
      amount: capped,
      rule:
        discount > 0
          ? `${formatBps(baseBps)} پایه، ${formatBps(discount)} تخفیف حجم، یعنی ${formatBps(effective)}`
          : `${formatBps(baseBps)} پایه، بدون تخفیف حجم`,
    },
  ]);
}

export function remittanceFee(corridor: CorridorCode, amount: number): FeeQuote {
  const band = bandFor(REMIT_BANDS, amount);
  const service = clamp(roundFee(bps(amount, band.bps)), 150_000, 30_000_000);
  return withVat("REMITTANCE", amount, [
    {
      code: "SERVICE",
      label: "کارمزد خدمت حواله",
      amount: service,
      rule: `${formatBps(band.bps)} پله مبلغ، با کف ۱۵۰٬۰۰۰ و سقف ۳۰٬۰۰۰٬۰۰۰ ریال`,
    },
    {
      code: "PARTNER",
      label: `کارمزد شریک ${CORRIDORS[corridor].partner}`,
      amount: REMIT_PARTNER_FEE[corridor],
      rule: `مقدار ثابت مسیر ${CORRIDORS[corridor].country}`,
    },
  ]);
}

export function cardIssueFee(amount: number): FeeQuote {
  return withVat("CARD_ISSUE", amount, [
    { code: "ISSUE", label: "صدور و چاپ کارت", amount, rule: "مقدار ثابت محصول کارت" },
    { code: "DELIVERY", label: "ارسال سفارشی", amount: 450_000, rule: "مقدار ثابت پست سفارشی" },
  ]);
}

export function fundBuyFee(amount: number): FeeQuote {
  const raw = clamp(roundFee(bps(amount, 50)), 30_000, 3_000_000);
  return withVat("FUND_BUY", amount, [
    { code: "ISSUE", label: "کارمزد صدور واحد", amount: raw, rule: "۰٫۵٪ مبلغ، با کف ۳۰٬۰۰۰ و سقف ۳٬۰۰۰٬۰۰۰ ریال" },
  ]);
}

export function fundRedeemFee(amount: number, heldDays: number): FeeQuote {
  const early = heldDays < 30;
  const rate = early ? 100 : 25;
  const raw = clamp(roundFee(bps(amount, rate)), 20_000, 1_500_000);
  return withVat("FUND_REDEEM", amount, [
    {
      code: "REDEEM",
      label: early ? "کارمزد ابطال زودهنگام" : "کارمزد ابطال",
      amount: raw,
      rule: early ? "۱٪ مبلغ، چون نگهداری کمتر از ۳۰ روز بوده است" : "۰٫۲۵٪ مبلغ، نگهداری بیش از ۳۰ روز",
    },
  ]);
}

export function lateFee(installment: number, periods: number): FeeQuote {
  const raw = Math.max(50_000, roundFee(bps(installment, 200) * Math.max(1, periods)));
  return withVat("INSTALLMENT_LATE", installment, [
    {
      code: "LATE",
      label: "جریمه دیرکرد",
      amount: raw,
      rule: `۲٪ قسط برای هر دوره تأخیر، اینجا ${toPersianDigits(periods)} دوره، با کف ۵۰٬۰۰۰ ریال`,
    },
  ]);
}

export interface SettlementFeeContext {
  category: MerchantCategory;
  /** Number of captures inside the batch. */
  captures: number;
  /** Rolling monthly volume before this batch, in rial. */
  monthlyVolume: number;
}

export function settlementFee(gross: number, context: SettlementFeeContext): FeeQuote {
  const category = CATEGORIES[context.category];
  const discount = bandFor(VOLUME_DISCOUNT, context.monthlyVolume).bps;
  const effective = category.mdrBps * (1 - discount / 10_000);
  const mdr = clamp(roundFee(bps(gross, effective)), 0, 50_000_000);
  const fixed = category.fixed * context.captures;
  return withVat("SETTLEMENT", gross, [
    {
      code: "MDR",
      label: "کارمزد پذیرندگی",
      amount: mdr,
      rule:
        discount > 0
          ? `${formatBps(category.mdrBps)} رسته ${category.label}، ${formatBps(discount)} تخفیف حجم ماه، یعنی ${formatBps(effective)}`
          : `${formatBps(category.mdrBps)} رسته ${category.label}، بدون تخفیف حجم`,
    },
    {
      code: "FIXED",
      label: "کارمزد ثابت هر تراکنش",
      amount: fixed,
      rule: `${formatGrouped(category.fixed)} ریال × ${toPersianDigits(context.captures)} تراکنش`,
    },
  ]);
}

export function feeTotal(quote: FeeQuote | null) {
  return quote?.total ?? 0;
}
