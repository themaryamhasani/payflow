import Link from "next/link";

export function Close() {
  return (
    <section className="close" id="start">
      <div className="wrap">
        <p className="kicker light">
          <span className="serif">Sandbox</span>
          <span>نمونه تعاملی</span>
        </p>
        <h2>شارژ کنید، منتقل کنید، سطح هویت را بالا ببرید، بعد لایه‌ها را باز کنید.</h2>
        <p>
          در کیف پول نمونه، هر هفت لایه کار می‌کنند: تبدیل ارز، رمزارز، صندوق، اعتبار اقساطی، کارت، حواله و تسویه پذیرنده.
          پیش از هر تأیید، تجزیه کارمزد را می‌بینید و بعد از هر عمل، سطرهای دفترکل را. تکرار درخواست اثر مالی تازه نمی‌سازد و
          پرداخت ناموفق موجودی را عوض نمی‌کند. هیچ پول حقیقی جابه‌جا نمی‌شود.
        </p>
        <Link className="btn btn-light" href="/wallet">
          گشودن کیف پول
        </Link>
        <p className="cta-note on-dark">
          مطالعه موردی / sandbox. ورود نمونه با حساب سارا؛ هیچ تراکنش حقیقی انجام نمی‌شود.
        </p>
      </div>
    </section>
  );
}
