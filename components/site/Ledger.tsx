import { Reveal } from "@/components/Reveal";
import { SectionHeading } from "@/components/site/SectionHeading";

export function Ledger() {
  return (
    <section className="section" id="ledger">
      <div className="wrap">
        <Reveal>
          <SectionHeading index="05" kicker="آناتومی یک انتقال" title="یک رخداد، دو سطر، یک مرجع.">
            <p>
              انتقال موفق برای فرستنده یک بدهکار و برای گیرنده یک بستانکار می‌سازد. هر تغییر موجودی دست‌کم یک سطر دفترکل دارد.
              اگر اعلان به کاربر نرسد، پول برنمی‌گردد؛ اعلان جدا از ثبت مالی دوباره تلاش می‌شود.
            </p>
          </SectionHeading>
        </Reveal>
        <div className="anatomy">
          <article>
            <p className="kicker">
              <span className="serif">Transaction</span>
            </p>
            <h3>رخداد مالی</h3>
            <dl>
              <div>
                <dt>مرجع</dt>
                <dd className="ref" dir="ltr">
                  PF98213123
                </dd>
              </div>
              <div>
                <dt>شناسه</dt>
                <dd className="ref" dir="ltr">
                  TX-98213
                </dd>
              </div>
              <div>
                <dt>وضعیت</dt>
                <dd>موفق</dd>
              </div>
              <div>
                <dt>کلید یکتاسازی</dt>
                <dd className="ref" dir="ltr">
                  7e6b…a91f
                </dd>
              </div>
            </dl>
          </article>
          <div className="brace" aria-hidden="true">
            <span>اتمی</span>
          </div>
          <article className="pair">
            <p className="kicker">
              <span className="serif">Ledger</span>
            </p>
            <h3>دو سطر دفترکل</h3>
            <div className="pair-grid">
              <div>
                <span>بدهکار</span>
                <strong>سارا محمدی</strong>
                <p>۱۹۶٬۵۰۰٬۰۰۰ ← ۱۷۱٬۵۰۰٬۰۰۰</p>
              </div>
              <div>
                <span>بستانکار</span>
                <strong>کیان رضایی</strong>
                <p>۱۰۰٬۴۰۰٬۰۰۰ ← ۱۲۵٬۴۰۰٬۰۰۰</p>
              </div>
            </div>
          </article>
          <article>
            <p className="kicker">
              <span className="serif">Notification</span>
            </p>
            <h3>خبر، نه سند مالی</h3>
            <p>اعلان بعد از ثبت موفق منتشر می‌شود. اگر ارسال اعلان شکست بخورد، تراکنش مالی بازگردانده نمی‌شود.</p>
          </article>
        </div>
      </div>
    </section>
  );
}
