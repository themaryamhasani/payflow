import type { Metadata, Viewport } from "next";
import "./fonts.css";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "PayFlow — کیف پول دیجیتال",
    template: "%s — PayFlow",
  },
  description:
    "کیف پول دیجیتال امن، ساده و قابل رهگیری برای شارژ، انتقال، ارز، رمزارز، صندوق، اعتبار اقساطی، کارت، حواله و تسویه پذیرنده. هر اثر مالی مرجع، دفترکل و شناسه پیگیری دارد.",
  applicationName: "PayFlow",
  authors: [{ name: "Maryam Hasani" }],
  keywords: ["PayFlow", "کیف پول دیجیتال", "دفترکل", "ledger-first", "مطالعه موردی محصول"],
  openGraph: {
    type: "website",
    locale: "fa_IR",
    url: "/",
    siteName: "PayFlow",
    title: "PayFlow — هر ریال، یک رد دارد",
    description:
      "مطالعه موردی محصول برای کیف پول ledger-first. شارژ، انتقال، دارایی، اعتبار، کارت، حواله و تسویه پذیرنده — همه روی یک دفترکل اتمیک.",
    images: [
      {
        url: "/og.jpg",
        width: 1200,
        height: 675,
        alt: "PayFlow — کیف پول دیجیتال ledger-first",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PayFlow — هر ریال، یک رد دارد",
    description:
      "مطالعه موردی محصول برای کیف پول ledger-first با دموی تعاملی شارژ، انتقال و لایه‌های پیشرفته.",
    images: ["/og.jpg"],
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#101613",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl">
      <body>
        <a className="skip" href="#content">
          رفتن به محتوا
        </a>
        {children}
      </body>
    </html>
  );
}
