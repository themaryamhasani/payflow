import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";

export const metadata: Metadata = {
  title: "درباره این کیس‌استادی",
  description:
    "PayFlow یک مطالعه موردی محصول برای کیف پول ledger-first است: نقش، محدودیت‌ها، تصمیم‌های طراحی و آنچه در دمو می‌بینید.",
};

const DECISIONS = [
  [
    "یک دفترکل، چند لایه",
    "به‌جای هفت کیف پول جدا، همه قابلیت‌ها روی همان ثبت اتمیک، یکتاسازی و ممیزی سوار شدند.",
  ],
  [
    "هویت به‌عنوان دروازه",
    "سطح احراز هویت هم سقف روزانه را تعیین می‌کند و هم دسترسی به ارز، اعتبار، کارت، حواله و پذیرندگی را.",
  ],
  [
    "کارمزد قابل‌بازرسی",
    "هر عدد کارمزد قاعده‌اش را کنار خودش نشان می‌دهد؛ مالیات فقط روی کارمزد است، نه روی اصل مبلغ.",
  ],
  [
    "صداقت sandbox",
    "تسویه صندوق، ارسال کارت، پاسخ KYC و بازبینی حواله عمداً دستی‌اند تا دو مرحله‌ای بودنشان پنهان نشود.",
  ],
];

const LIMITS = [
  "بک‌اند، دیتابیس و درگاه پرداخت واقعی وجود ندارد؛ state در مرورگر است.",
  "نرخ ارز و رمزارز ثابت‌اند و تأمین‌کننده نرخ زنده ندارند.",
  "مجوز بانکی، برداشت زنجیره‌ای رمزارز و اعتبارسنجی بیرونی خارج از دامنه‌اند.",
  "این وب‌سایت سامانه مالی دارای مجوز نیست و پول حقیقی جابه‌جا نمی‌کند.",
];

export default function AboutPage() {
  return (
    <>
      <Header />
      <main id="content" className="about">
        <div className="wrap about-hero">
          <p className="sec-index">
            <span className="serif">Case study</span>
            <span>درباره این کار</span>
          </p>
          <h1>PayFlow یک کیس‌استادی محصول است، نه یک بانک آنلاین.</h1>
          <p className="about-lead">
            این پروژه از سند تحلیل و نیازمندی PayFlow ساخته شده تا نشان دهد یک کیف پول ledger-first چطور فکر می‌کند:
            موجودی منفی نمی‌شود، ثبت‌ها اتمیک‌اند، کارمزد توضیح دارد، و خطا برای کاربر قابل پیگیری است.
          </p>
          <div className="about-actions">
            <Link className="btn" href="/wallet">
              گشودن کیف پول نمونه
            </Link>
            <Link className="btn btn-ghost" href="/#layers">
              دیدن لایه‌های محصول
            </Link>
          </div>
        </div>

        <section className="wrap about-block">
          <h2>نقش و هدف</h2>
          <p>
            تهیه‌کننده سند محصول: <strong>Maryam Hasani</strong>. هدف این سایت، نمایش تصمیم‌های محصولی و رفتار مالی در یک
            دموی تعاملی است — مناسب پورتفolio، نقد طراحی، و هم‌زبانی با تیم مهندسی.
          </p>
        </section>

        <section className="wrap about-block">
          <h2>تصمیم‌های طراحی که اینجا پررنگ‌اند</h2>
          <ol className="about-list">
            {DECISIONS.map(([title, text]) => (
              <li key={title}>
                <strong>{title}</strong>
                <span>{text}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="wrap about-block">
          <h2>محدودیت‌های صادقانه</h2>
          <ul className="about-limits">
            {LIMITS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="wrap about-block about-end">
          <h2>چطور ببینیدش</h2>
          <p>
            با حساب نمونه وارد شوید، یکی از سناریوهای آماده را بزنید، بعد سطرهای دفترکل و تجزیه کارمزد را باز کنید. اگر
            خواستید از صفر شروع کنید، «بازنشانی» را بزنید.
          </p>
          <Link className="btn" href="/wallet">
            شروع دمو
          </Link>
        </section>
      </main>
      <Footer />
    </>
  );
}
