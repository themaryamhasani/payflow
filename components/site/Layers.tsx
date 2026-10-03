import { Reveal } from "@/components/Reveal";

const CORE = {
  title: "هسته کیف پول",
  tier: "سطح تأیید کد ملی",
  adds: "موجودی، شارژ از درگاه، انتقال فردبه‌فرد، تاریخچه",
  cost: "بدون کارمزد یا کارمزد ثابت قابل تنظیم",
};

const LAYERS = [
  {
    title: "جیب چندارزی",
    tier: "تأیید مدرک و چهره",
    adds: "جیب جدا برای هر ارز، تبدیل همیشه از مسیر ریال",
    cost: "اسپرد پله‌ای ۰٫۴٪ تا ۰٫۹٪ با کف و سقف",
  },
  {
    title: "رمزارز امانی",
    tier: "تأیید مدرک و چهره",
    adds: "خرید و فروش در برابر ریال، نگهداری امانی",
    cost: "اسپرد بر پایه دارایی، با تخفیف حجم",
  },
  {
    title: "صندوق سرمایه‌گذاری",
    tier: "تأیید مدرک و چهره",
    adds: "صدور و ابطال واحد، تسویه در روز کاری بعد",
    cost: "کارمزد صدور ۰٫۵٪، ابطال ۰٫۲۵٪ و زودهنگام ۱٪",
  },
  {
    title: "اعتبار و خرید اقساطی",
    tier: "تأیید مدرک و چهره",
    adds: "اعتبار بر پایه سطح، جدول اقساط، بدهی در دارایی خالص",
    cost: "سود اعلام‌شده و جریمه ۲٪ برای هر دوره تأخیر",
  },
  {
    title: "کارت فیزیکی",
    tier: "تأیید مدرک و چهره",
    adds: "درگاه دوم به همان موجودی، رهگیری ارسال، قفل فوری",
    cost: "کارمزد یک‌بار صدور و ارسال",
  },
  {
    title: "حواله بین‌المللی",
    tier: "تأیید کامل",
    adds: "ذی‌نفع خارجی، بازبینی انطباق، تبدیل در مقصد",
    cost: "کارمزد خدمت، کارمزد شریک و حاشیه ارزی مسیر",
  },
  {
    title: "تسویه پذیرنده",
    tier: "تأیید کامل",
    adds: "پذیرش پرداخت، دسته تسویه، واریز خالص به کیف پول",
    cost: "نرخ پذیرندگی رسته با تخفیف حجم، به‌علاوه کارمزد ثابت هر تراکنش",
  },
];

export function Layers() {
  return (
    <section className="section layers" id="layers">
      <div className="wrap">
        <header className="sec-head">
          <p className="sec-index">
            <span className="serif">09</span>
            <span>لایه‌ها</span>
          </p>
          <h2>هر لایه روی همان یک دفترکل می‌نشیند.</h2>
          <div className="sec-lead">
            <p>
              این محصول هفت کیف پول جدا نیست. یک دفترکل است و لایه‌هایی که روی آن سوار می‌شوند. هر حرکت پول، در هر لایه،
              همان قاعده‌های هسته را دارد: اتمی، یکتا، قابل ممیزی، و حذف‌نشدنی. چیزی که از لایه به لایه عوض می‌شود، شرط
              هویت و ساختار کارمزد است.
            </p>
          </div>
        </header>

        <Reveal>
          <div className="stack">
            <div className="stack-core">
              <p className="stack-tier">{CORE.tier}</p>
              <h3>{CORE.title}</h3>
              <p className="stack-adds">{CORE.adds}</p>
              <p className="stack-cost">{CORE.cost}</p>
            </div>
            <ol className="stack-list">
              {LAYERS.map((layer, index) => (
                <li key={layer.title}>
                  <span className="serif">{index + 1}</span>
                  <span className="stack-body">
                    <strong>{layer.title}</strong>
                    <small className="stack-adds">{layer.adds}</small>
                    <small className="stack-cost">{layer.cost}</small>
                  </span>
                  <span className="stack-tier">{layer.tier}</span>
                </li>
              ))}
            </ol>
          </div>
        </Reveal>

        <Reveal>
          <div className="engine">
            <h3>کارمزد، عدد دلبخواه نیست</h3>
            <p>
              هر کارمزد از اجزای نام‌دار ساخته می‌شود و هر جزء قاعده‌اش را همراه خودش نشان می‌دهد: نرخ پله‌ای بر پایه مبلغ
              یا رسته، تخفیف حجم، کف و سقف، کارمزد ثابت هر تراکنش، و مالیات ارزش افزوده که فقط روی کارمزد می‌نشیند نه روی
              اصل مبلغ. پیش از تأیید هر عمل، همین تجزیه را می‌بینید.
            </p>
            <ul>
              <li>نرخ پله‌ای مبلغ یا رسته</li>
              <li>تخفیف پله‌ای حجم</li>
              <li>کف و سقف کارمزد</li>
              <li>کارمزد ثابت هر تراکنش</li>
              <li>مالیات ارزش افزوده روی کارمزد</li>
              <li>سطر مقابل در خزانه</li>
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
