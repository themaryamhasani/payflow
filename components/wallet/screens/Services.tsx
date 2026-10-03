"use client";

import { formatRial, toPersianDigits } from "@/lib/format";
import { CAPABILITIES, TIERS } from "@/lib/catalog";
import {
  cardStatusLabel,
  cardsOf,
  loansOf,
  merchantOf,
  outstandingDebt,
  remittancesOf,
  tierOf,
  type WalletState,
} from "@/lib/wallet-state";

export type ServiceKey = "identity" | "credit" | "card" | "remit" | "merchant";

export function Services({
  state,
  userId,
  onOpenService,
}: {
  state: WalletState;
  userId: string;
  onOpenService: (key: ServiceKey) => void;
}) {
  const tier = tierOf(state, userId);
  const cards = cardsOf(state, userId);
  const loans = loansOf(state, userId).filter((loan) => loan.status === "ACTIVE");
  const holds = remittancesOf(state, userId).filter((item) => item.status === "COMPLIANCE_HOLD");
  const merchant = merchantOf(state, userId);
  const debt = outstandingDebt(state, userId);

  const items: {
    key: ServiceKey;
    title: string;
    summary: string;
    state: string;
    locked: boolean;
  }[] = [
    {
      key: "identity",
      title: "احراز هویت",
      summary: "سطح هویت، سقف روزانه و قابلیت‌های باز را تعیین می‌کند.",
      state: `سطح ${TIERS[tier].label} · سقف ${formatRial(TIERS[tier].dailyLimit)}`,
      locked: false,
    },
    {
      key: "credit",
      title: CAPABILITIES.CREDIT.label,
      summary: CAPABILITIES.CREDIT.summary,
      state:
        loans.length > 0
          ? `${toPersianDigits(loans.length)} پرونده باز · بدهی ${formatRial(debt)}`
          : tier >= CAPABILITIES.CREDIT.minTier
            ? "بدون پرونده"
            : `نیاز به سطح ${TIERS[CAPABILITIES.CREDIT.minTier].label}`,
      locked: tier < CAPABILITIES.CREDIT.minTier,
    },
    {
      key: "card",
      title: CAPABILITIES.CARD.label,
      summary: CAPABILITIES.CARD.summary,
      state:
        cards.length > 0
          ? `${cardStatusLabel(cards[0]!.status)} · ${cards[0]!.maskedPan}`
          : tier >= CAPABILITIES.CARD.minTier
            ? "بدون کارت"
            : `نیاز به سطح ${TIERS[CAPABILITIES.CARD.minTier].label}`,
      locked: tier < CAPABILITIES.CARD.minTier,
    },
    {
      key: "remit",
      title: CAPABILITIES.REMIT.label,
      summary: CAPABILITIES.REMIT.summary,
      state:
        holds.length > 0
          ? `${toPersianDigits(holds.length)} حواله در بازبینی`
          : tier >= CAPABILITIES.REMIT.minTier
            ? "آماده ارسال"
            : `نیاز به سطح ${TIERS[CAPABILITIES.REMIT.minTier].label}`,
      locked: tier < CAPABILITIES.REMIT.minTier,
    },
    {
      key: "merchant",
      title: CAPABILITIES.MERCHANT.label,
      summary: CAPABILITIES.MERCHANT.summary,
      state: merchant
        ? `${merchant.name} · حجم ماه ${formatRial(merchant.monthlyVolume)}`
        : tier >= CAPABILITIES.MERCHANT.minTier
          ? "بدون پرونده"
          : `نیاز به سطح ${TIERS[CAPABILITIES.MERCHANT.minTier].label}`,
      locked: tier < CAPABILITIES.MERCHANT.minTier,
    },
  ];

  return (
    <section>
      <h2>خدمات</h2>
      <p className="w-help">
        هسته کیف پول همان شارژ و انتقال است. این خدمات روی آن هسته سوار می‌شوند و هر کدام سطح احراز هویت خودش را می‌خواهد.
        قفل بودن یک خدمت به معنی نبودن آن نیست؛ یعنی هنوز شرط سطحش را ندارید.
      </p>
      <ul className="w-services">
        {items.map((item) => (
          <li key={item.key}>
            <button
              type="button"
              onClick={() => onOpenService(item.key)}
              data-locked={item.locked ? "yes" : "no"}
              aria-label={`${item.title}. ${item.locked ? "قفل سطح احراز هویت" : "باز"}. ${item.state}`}
            >
              <span>
                <strong>{item.title}</strong>
                <small>{item.summary}</small>
                <em>{item.state}</em>
              </span>
              <span className="w-service-mark" aria-hidden="true">
                {item.locked ? "قفل" : "باز"}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
