import Link from "next/link";

const LINKS = [
  ["مسئله", "/#problem"],
  ["اصول", "/#principles"],
  ["مسیر", "/#journey"],
  ["دفترکل", "/#flow"],
  ["همزمانی", "/#concurrency"],
  ["قواعد", "/#rules"],
  ["لایه‌ها", "/#layers"],
  ["قرارداد", "/#contract"],
  ["مخاطبان", "/#people"],
  ["مرز محصول", "/#scope"],
  ["واژه‌نامه", "/#glossary"],
  ["کیس‌استادی", "/about"],
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
              <Link key={href} href={href}>
                {label}
              </Link>
            ))}
            <Link href="/wallet">کیف پول</Link>
          </nav>
        </div>
        <aside className="site-disclaimer" aria-label="دیسکلیمر نمونه‌کار">
          <p>
            <strong>مطالعه موردی محصول / نمونه‌کار.</strong> این وب‌سایت سامانه بانکی دارای مجوز نیست، سرویس مالی واقعی ارائه
            نمی‌دهد و هیچ پول حقیقی جابه‌جا نمی‌کند. کیف پول تعاملی یک sandbox محلی در مرورگر است.
          </p>
          <p>
            بر اساس سند تحلیل و نیازمندی PayFlow. تهیه‌کننده سند: Maryam Hasani. واحد پول نمونه: ریال ایران.{" "}
            <Link href="/about">درباره این کیس‌استادی</Link>
            {" · "}
            <span>
              لینک لایو پس از دیپلوی Vercel در <Link href="https://github.com/themaryamhasani/payflow">README</Link>{" "}
              ثبت می‌شود.
            </span>
          </p>
        </aside>
      </div>
    </footer>
  );
}
