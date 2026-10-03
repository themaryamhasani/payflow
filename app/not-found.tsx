import Link from "next/link";

export default function NotFound() {
  return (
    <main id="content" className="missing">
      <p className="serif">PayFlow</p>
      <p className="missing-kicker">۴۰۴</p>
      <h1>این صفحه در دفتر نیست.</h1>
      <p>
        مسیر درخواستی وجود ندارد یا جابه‌جا شده است. می‌توانید به معرفی محصول برگردید یا کیف پول نمونه را باز کنید.
      </p>
      <div className="missing-actions">
        <Link className="btn" href="/">
          بازگشت به معرفی
        </Link>
        <Link className="btn btn-ghost" href="/wallet">
          گشودن کیف پول
        </Link>
      </div>
      <p className="missing-note">
        مطالعه موردی محصول است؛ سامانه بانکی دارای مجوز نیست و پول حقیقی جابه‌جا نمی‌شود.
      </p>
    </main>
  );
}
