import Link from "next/link";

const LINKS = [
  ["مسئله", "#problem"],
  ["اصول", "#principles"],
  ["مسیر", "#journey"],
  ["دفترکل", "#flow"],
  ["همزمانی", "#concurrency"],
  ["قواعد", "#rules"],
  ["لایه‌ها", "#layers"],
  ["قرارداد", "#contract"],
  ["مخاطبان", "#people"],
  ["مرز محصول", "#scope"],
  ["واژه‌نامه", "#glossary"],
];

export function Footer() {
  return (
    <footer className="colophon">
      <div className="wrap">
        <div className="colo-top">
          <div>
            <p className="serif brand-mark">PayFlow</p>
            <p>کیف پول دیجیتال برای شارژ، انتقال و پیگیری. امن، ساده، قابل رهگیری.</p>
          </div>
          <nav aria-label="نمای صفحه">
            {LINKS.map(([label, href]) => (
              <a key={href} href={href}>
                {label}
              </a>
            ))}
            <Link href="/wallet">کیف پول</Link>
          </nav>
        </div>
        <p className="colo-note">
          مطالعه موردی محصول بر اساس سند تحلیل و نیازمندی PayFlow. تهیه‌کننده سند: Maryam Hasani. این وب‌سایت سامانه بانکی
          دارای مجوز نیست و تراکنش حقیقی انجام نمی‌دهد. واحد پول نمونه: ریال ایران.
        </p>
      </div>
    </footer>
  );
}
