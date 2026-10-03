import type { Metadata } from "next";
import { WalletExperience } from "@/components/wallet/WalletExperience";
import "./wallet.css";

export const metadata: Metadata = {
  title: "کیف پول — PayFlow",
  description: "نمونه تعاملی کیف پول PayFlow: موجودی، شارژ، انتقال، تاریخچه و نمای عملیات.",
};

export default function WalletPage() {
  return <WalletExperience />;
}
