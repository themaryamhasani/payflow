import { Reveal } from "@/components/Reveal";

const ITEMS = [
  {
    n: "۰۱",
    title: "امنیت",
    text: "کیف پول و تراکنش فقط برای صاحب آن دیده می‌شود. عملیات حساس مجوز می‌خواهد و ردپا می‌گذارد.",
  },
  {
    n: "۰۲",
    title: "یکپارچگی مالی",
    text: "بدهکار و بستانکار با هم ثبت می‌شوند. اگر ثبت ناتمام بماند، هیچ‌کدام نمی‌ماند و موجودی منفی نمی‌شود.",
  },
  {
    n: "۰۳",
    title: "قابلیت رهگیری",
    text: "هر اثر مالی مرجع، دفترکل و شناسه پیگیری دارد. تراکنش موفق حذف نمی‌شود.",
  },
  {
    n: "۰۴",
    title: "تجربه ساده",
    text: "بعد از هر عملیات باید روشن باشد: انجام شد یا نه، موجودی عوض شد یا نه، مرجع چیست، و در مشکل چه باید کرد.",
  },
];

export function Principles() {
  return (
    <section className="section principles" id="principles">
      <div className="wrap">
        <Reveal>
          <p className="sec-index">
            <span className="serif">02</span>
            <span>منشور محصول</span>
          </p>
          <h2>چهار اصل، یک سامانه.</h2>
        </Reveal>
        <ol>
          {ITEMS.map((item, index) => (
            <li key={item.n}>
              <Reveal delay={index * 60}>
                <article>
                  <span className="principle-n">{item.n}</span>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.text}</p>
                  </div>
                </article>
              </Reveal>
            </li>
          ))}
        </ol>
        <p className="bridge">این چهار اصل از اولین ورود تا پیگیری یک تراکنش در مسیر کاربر دیده می‌شوند.</p>
      </div>
    </section>
  );
}
