import type { FeeQuote } from "@/lib/fees";
import type {
  AssetCode,
  Capability,
  CorridorCode,
  CreditTerm,
  CurrencyCode,
  FundCode,
  MerchantCategory,
  Tier,
} from "@/lib/catalog";

export type UserStatus = "ACTIVE" | "DISABLED";
export type WalletStatus = "ACTIVE" | "SUSPENDED" | "BLOCKED" | "CLOSED";

export type TxType =
  | "TOP_UP"
  | "TRANSFER"
  | "REVERSAL"
  | "FX_CONVERT"
  | "CRYPTO_BUY"
  | "CRYPTO_SELL"
  | "FUND_BUY"
  | "FUND_REDEEM"
  | "REMITTANCE"
  | "LOAN_DISBURSE"
  | "INSTALLMENT"
  | "CARD_ISSUE"
  | "SETTLEMENT";

export type TxStatus =
  | "CREATED"
  | "PENDING"
  | "PROCESSING"
  | "SUCCESS"
  | "FAILED"
  | "CANCELLED"
  | "REVERSED"
  | "ON_HOLD";

export interface Account {
  id: string;
  name: string;
  mobile: string;
  secret: string;
  status: UserStatus;
  /** Internal book rather than a customer. Never listed as a transfer recipient. */
  system?: boolean;
}

export interface WalletRecord {
  id: string;
  userId: string;
  status: WalletStatus;
  currency: "IRR";
  dailyLimit: number;
  version: number;
}

export interface LedgerLine {
  id: string;
  walletId: string;
  ownerId: string;
  ownerName: string;
  side: "DEBIT" | "CREDIT";
  amount: number;
  before: number;
  after: number;
  /** Rial unless the line moves a currency pocket, crypto asset or fund unit. */
  instrument: string;
  system?: boolean;
}

export interface Transaction {
  seq: number;
  id: string;
  reference: string;
  traceId: string;
  type: TxType;
  status: TxStatus;
  amount: number;
  fee: number;
  description: string;
  senderId: string | null;
  receiverId: string | null;
  parties: string[];
  createdAt: string;
  idempotencyKey?: string;
  code?: string;
  paymentId?: string;
  reversalOf?: string;
  reversedBy?: string;
  ledger: LedgerLine[];
  feeQuote?: FeeQuote;
  /** Non-rial leg of an exchange, written for display and reconciliation. */
  leg?: { instrument: string; units: number; rate: number };
  settlesAt?: string;
  linkId?: string;
}

export interface Payment {
  id: string;
  userId: string;
  amount: number;
  status: "PENDING" | "SUCCESS" | "FAILED" | "CANCELLED";
  providerRef?: string;
  transactionId: string;
  callbackCount: number;
}

export type AuditAction =
  | "WALLET_STATUS"
  | "REVERSAL"
  | "KYC_TIER"
  | "CARD_STATUS"
  | "REMIT_REVIEW"
  | "MERCHANT_ONBOARD";

export interface AuditEntry {
  id: string;
  actor: string;
  action: AuditAction;
  entity: string;
  from: string;
  to: string;
  reason: string;
  createdAt: string;
}

export interface Notice {
  id: string;
  userId: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  delivery: "SENT" | "RETRYING";
  transactionId?: string;
}

export interface Session {
  userId: string;
  token: string;
  issuedAt: string;
}

export type KycCheckCode = "NATIONAL_ID" | "DOCUMENT" | "LIVENESS" | "ADDRESS" | "SANCTIONS" | "PEP";

export interface KycCheck {
  code: KycCheckCode;
  label: string;
  outcome: "PASS" | "REFER" | "FAIL" | "PENDING";
  note: string;
}

export interface KycProfile {
  userId: string;
  tier: Tier;
  status: "NONE" | "SUBMITTED" | "IN_REVIEW" | "VERIFIED" | "REFERRED" | "REJECTED";
  targetTier: Tier | null;
  provider: string;
  providerRef: string | null;
  checks: KycCheck[];
  nationalId: string | null;
  updatedAt: string;
}

export interface Installment {
  no: number;
  dueAt: string;
  principal: number;
  profit: number;
  total: number;
  paidAt: string | null;
  lateFee: number;
}

export interface Loan {
  id: string;
  userId: string;
  principal: number;
  term: CreditTerm;
  rate: number;
  status: "ACTIVE" | "SETTLED";
  installments: Installment[];
  createdAt: string;
  transactionId: string;
}

export type CardStatus = "REQUESTED" | "PRINTING" | "SHIPPED" | "DELIVERED" | "ACTIVE" | "FROZEN" | "CANCELLED";

export interface Card {
  id: string;
  userId: string;
  maskedPan: string;
  last4: string;
  expiry: string;
  status: CardStatus;
  requestedAt: string;
  shippingRef: string;
  frozenReason: string | null;
  transactionId: string;
}

export type RemitStatus = "QUOTED" | "COMPLIANCE_HOLD" | "SENT" | "PAID" | "REJECTED";

export interface Remittance {
  id: string;
  userId: string;
  corridor: CorridorCode;
  beneficiary: string;
  iban: string;
  purpose: string;
  amount: number;
  fee: number;
  rate: number;
  payoutCurrency: CurrencyCode;
  payoutAmount: number;
  status: RemitStatus;
  holdReason: string | null;
  createdAt: string;
  transactionId: string;
}

export interface Capture {
  id: string;
  merchantId: string;
  amount: number;
  createdAt: string;
  settlementId: string | null;
}

export interface Settlement {
  id: string;
  merchantId: string;
  batch: string;
  gross: number;
  fee: number;
  net: number;
  captures: number;
  feeQuote: FeeQuote;
  createdAt: string;
  transactionId: string;
}

export interface Merchant {
  id: string;
  userId: string;
  name: string;
  category: MerchantCategory;
  mcc: string;
  monthlyVolume: number;
  createdAt: string;
}

export interface ResultView {
  tone: "ok" | "bad" | "neutral";
  title: string;
  message: string;
  reference?: string;
  traceId?: string;
  transactionId?: string;
  balanceChanged: boolean;
  code?: string;
  amount?: number;
  counterparty?: string;
  balanceAfter?: number;
  /** Secondary figure such as received units or payout amount. */
  secondary?: string;
}

export interface WalletState {
  seq: number;
  accounts: Account[];
  wallets: Record<string, WalletRecord>;
  /** Rial balance per account. */
  balances: Record<string, number>;
  /** Non-rial instrument units per account, keyed by instrument code. */
  positions: Record<string, Record<string, number>>;
  transactions: Transaction[];
  payments: Payment[];
  audits: AuditEntry[];
  notices: Notice[];
  idempotency: Record<string, string>;
  kyc: Record<string, KycProfile>;
  loans: Loan[];
  cards: Card[];
  remittances: Remittance[];
  merchants: Merchant[];
  captures: Capture[];
  settlements: Settlement[];
  session: Session | null;
  authError: string | null;
  lastResult: ResultView | null;
  opsResult: ResultView | null;
}

export type Action =
  | { type: "REGISTER"; name: string; mobile: string; secret: string }
  | { type: "LOGIN"; mobile: string; secret: string }
  | { type: "LOGOUT" }
  | { type: "CLEAR_AUTH_ERROR" }
  | { type: "TOPUP_BEGIN"; amount: number }
  | { type: "TOPUP_CALLBACK"; paymentId: string; outcome: "SUCCESS" | "FAILED" }
  | { type: "TOPUP_CANCEL"; paymentId: string }
  | { type: "TRANSFER"; receiverId: string; amount: number; description: string; key: string }
  | { type: "CHANGE_STATUS"; status: WalletStatus; reason: string }
  | { type: "REVERSE"; transactionId: string; reason: string }
  | { type: "READ_NOTICES" }
  | { type: "KYC_SUBMIT"; targetTier: Tier; nationalId: string; address: string; incomeSource: string }
  | { type: "KYC_RESULT"; outcome: "PASS" | "REFER" | "FAIL" }
  | { type: "FX_CONVERT"; from: CurrencyCode; to: CurrencyCode; amount: number; key: string }
  | { type: "CRYPTO_ORDER"; side: "BUY" | "SELL"; asset: AssetCode; amount: number; key: string }
  | { type: "FUND_ORDER"; side: "BUY" | "REDEEM"; fund: FundCode; amount: number; key: string }
  | { type: "FUND_SETTLE"; transactionId: string }
  | { type: "CREDIT_REQUEST"; amount: number; term: CreditTerm; key: string }
  | { type: "INSTALLMENT_PAY"; loanId: string; no: number; key: string }
  | { type: "INSTALLMENT_BACKDATE"; loanId: string }
  | { type: "CARD_REQUEST"; key: string }
  | { type: "CARD_ADVANCE"; cardId: string }
  | { type: "CARD_ACTIVATE"; cardId: string; last4: string }
  | { type: "CARD_FREEZE"; cardId: string; frozen: boolean; reason: string }
  | { type: "REMIT_SEND"; corridor: CorridorCode; beneficiary: string; iban: string; amount: number; purpose: string; key: string }
  | { type: "REMIT_REVIEW"; remittanceId: string; outcome: "RELEASE" | "REJECT"; reason: string }
  | { type: "MERCHANT_ONBOARD"; name: string; category: MerchantCategory }
  | { type: "MERCHANT_CAPTURE"; amount: number; key: string }
  | { type: "MERCHANT_SETTLE"; key: string };

export const DAILY_LIMIT = 100_000_000;
export const TOPUP_MIN = 10_000;
export const TOPUP_MAX = 500_000_000;
export const DESCRIPTION_MAX = 80;
export const SECRET_MIN = 8;

export const DEMO_MOBILE = "09101112276";
export const DEMO_SECRET = "payflow1234";

export const TREASURY = "SYS-TREASURY";
export const MARKET = "SYS-MARKET";
export const CUSTODY = "SYS-FUND";
export const CREDIT_BOOK = "SYS-CREDIT";
export const ACQUIRER = "SYS-ACQUIRER";
export const NOSTRO = "SYS-NOSTRO";

export const SYSTEM_IDS = [TREASURY, MARKET, CUSTODY, CREDIT_BOOK, ACQUIRER, NOSTRO];

export const SYSTEM_NAMES: Record<string, string> = {
  [TREASURY]: "خزانه PayFlow",
  [MARKET]: "بازارساز PayFlow",
  [CUSTODY]: "امین صندوق",
  [CREDIT_BOOK]: "دفتر اعتبار",
  [ACQUIRER]: "پذیرندگی PayFlow",
  [NOSTRO]: "حساب کارگزار ارزی",
};

export type { AssetCode, Capability, CorridorCode, CreditTerm, CurrencyCode, FundCode, MerchantCategory, Tier };
