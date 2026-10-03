import { Reveal } from "@/components/Reveal";
import { SectionHeading } from "@/components/site/SectionHeading";

const ROWS = [
  ["وابستگی زیاد به درگاه", "شکست و تأخیر در هر پرداخت", "تراکنش داخلی از کیف پول"],
  ["نبود دفترکل مرکزی", "رهگیری ضعیف و دشواری حسابرسی", "دفترکل بدهکار و بستانکار"],
  ["تکرار درخواست یا callback", "خطر بستانکار یا بدهکار شدن دوباره", "یکتاسازی در API و callback"],
  ["برگشت دستی", "پاسخ کند و خطای عملیاتی", "مدل وضعیت و جریان جبران"],
  ["تاریخچه پراکنده", "پشتیبانی و شکایت دشوار", "تاریخچه و شماره مرجع"],
  ["کنترل محدود ریسک", "انتقال خارج از سیاست", "وضعیت کیف پول و سقف تراکنش"],
];

export function Problem() {
  return (
    <section className="section" id="problem">
      <div className="wrap">
        <Reveal>
          <SectionHeading index="01" kicker="وضع موجود" title="پرداخت، هنوز به درگاه چسبیده است.">
            <p>
              وقتی هر پرداخت مستقیم به درگاه وابسته است، سامانه لایه مالی داخلی برای موجودی، دفترکل و تراکنش بین کاربران ندارد.
              هماهنگی گران می‌شود، تطبیق دشوار می‌شود، و وضعیت سفارش با وضعیت پرداخت یکی نمی‌ماند.
            </p>
          </SectionHeading>
        </Reveal>

        <div className="paths">
          <article className="path path-old">
            <p className="path-label">وضع موجود</p>
            <div className="path-line">
              <span>کاربر</span>
              <i />
              <span>درگاه</span>
            </div>
            <p>نتیجه مالی از callback تبعیت می‌کند. موجودی و دفترکل یکپارچه وجود ندارد.</p>
          </article>
          <article className="path path-new">
            <p className="path-label">وضع مطلوب</p>
            <div className="path-line">
              <span>کاربر</span>
              <i />
              <strong>PayFlow</strong>
              <i />
              <span>درگاه، فقط برای شارژ</span>
            </div>
            <p>کیف پول، انتقال و دفترکل داخل سامانه‌اند. درگاه فقط وقتی لازم است که ارزش از بیرون وارد شود.</p>
          </article>
        </div>

        <div className="issue-head" aria-hidden="true">
          <span>مسئله</span>
          <span>اثر</span>
          <span>فرصت</span>
        </div>
        <ul className="issues">
          {ROWS.map(([problem, effect, chance], index) => (
            <li key={problem}>
              <Reveal delay={index * 40}>
                <div className="issue">
                  <p>
                    <span className="mobile-label">مسئله</span>
                    {problem}
                  </p>
                  <p>
                    <span className="mobile-label">اثر</span>
                    {effect}
                  </p>
                  <p>
                    <span className="mobile-label">فرصت</span>
                    {chance}
                  </p>
                </div>
              </Reveal>
            </li>
          ))}
        </ul>
        <p className="bridge">برای همین پول داخلی از مسیر کیف پول می‌گذرد. درگاه فقط برای آوردن موجودی از بیرون است.</p>
      </div>
    </section>
  );
}
