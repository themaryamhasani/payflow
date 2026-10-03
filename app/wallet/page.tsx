import type { Metadata } from "next";
import { WalletExperience } from "@/components/wallet/WalletExperience";
import "./wallet.css";

export const metadata: Metadata = {
  title: "کیف پول",
  description:
    "نمونه تعاملی کیف پول PayFlow: موجودی، شارژ، انتقال، دارایی، اعتبار، کارت، حواله، تسویه پذیرنده و نمای عملیات. محیط آزمایش؛ پول حقیقی جابه‌جا نمی‌شود.",
  openGraph: {
    title: "کیف پول نمونه — PayFlow",
    description: "Sandbox تعاملی ledger-first. ورود با حساب نمونه و پیمایش لایه‌های محصول.",
    images: ["/og.jpg"],
  },
};

export default function WalletPage() {
  return <WalletExperience />;
}
