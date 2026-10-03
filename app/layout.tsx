import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Instrument_Serif, Vazirmatn } from "next/font/google";
import "./globals.css";

const sans = Vazirmatn({
  subsets: ["arabic", "latin"],
  variable: "--font-sans",
  display: "swap",
});

const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PayFlow — کیف پول دیجیتال",
  description:
    "کیف پول دیجیتال امن، ساده و قابل رهگیری برای شارژ، انتقال، ارز، رمزارز، صندوق، اعتبار اقساطی، کارت، حواله و تسویه پذیرنده. هر اثر مالی مرجع، دفترکل و شناسه پیگیری دارد.",
};

export const viewport: Viewport = {
  themeColor: "#101613",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl" className={`${sans.variable} ${serif.variable} ${mono.variable}`}>
      <body>
        <a className="skip" href="#content">
          رفتن به محتوا
        </a>
        {children}
      </body>
    </html>
  );
}
