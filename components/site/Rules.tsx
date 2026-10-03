"use client";

import { useState } from "react";

const RULES = [
  { id: "BRULE-001", title: "موجودی منفی نمی‌شود", text: "هیچ انتقال یا همزمانی‌ای نباید موجودی کیف پول را از صفر پایین‌تر ببرد." },
  { id: "BRULE-009", title: "شکست، موجودی را عوض نمی‌کند", text: "تراکنش ناموفق یا لغوشده اثر مالی موردنظر را نمی‌گذارد. کاربر باید این را صریح ببیند." },
  { id: "BRULE-010", title: "موفق، حذف نمی‌شود", text: "تراکنش مالی پاک نمی‌شود. برگشت، رکورد تازه‌ای برای جبران است نه پاک کردن رکورد اصلی." },
  { id: "BRULE-012", title: "یک انتقال، دو اثر", text: "انتقال موفق برای فرستنده بدهکار و برای گیرنده بستانکار می‌سازد. هر دو در یک ثبت." },
  { id: "BRULE-013", title: "شارژ، بعد از تأیید", text: "افزایش موجودی فقط وقتی است که وضعیت موفق پرداخت بررسی شده باشد." },
  { id: "BRULE-014", title: "callback تکراری بی‌اثر است", text: "اگر درگاه همان موفقیت را دوباره بفرستد، کیف پول بار دوم بستانکار نمی‌شود." },
  { id: "BRULE-008", title: "یک کلید، یک اثر", text: "هر کلید یکتاسازی برای یک عمل، فقط یک اثر مالی دارد. تکرار، نتیجه قبلی را برمی‌گرداند." },
  { id: "BRULE-021", title: "حقیقت نزد سرور است", text: "موجودی‌ای که client می‌فرستد معتبر نیست. منبع حقیقت، دفتر ثبت‌شده سامانه است." },
  { id: "BRULE-023", title: "هویت، دروازه قابلیت است", text: "هر لایه حداقل سطح احراز هویت خودش را دارد. بدون آن سطح، عمل حتی شروع نمی‌شود و سقف روزانه هم از همان سطح می‌آید." },
  { id: "BRULE-024", title: "هر کارمزد، سطر مقابل دارد", text: "کارمزد از کیف پول کم می‌شود و در دفتر خزانه می‌نشیند. مالیات ارزش افزوده فقط روی کارمزد است، نه روی اصل مبلغ." },
  { id: "BRULE-025", title: "تبدیل، دو پایه در یک ثبت", text: "هر تبدیل از مسیر ریال می‌گذرد و هر دو پایه‌اش با هم ثبت می‌شوند. نیم‌تبدیل وجود ندارد." },
  { id: "BRULE-026", title: "جیب کاربر منفی نمی‌شود", text: "هیچ جیب ارزی یا دارایی کاربر زیر صفر نمی‌رود. دفتر داخلی می‌تواند، چون سمت دیگر یک بدهی را نشان می‌دهد." },
  { id: "BRULE-027", title: "تسویه تأخیری، رکورد تازه نمی‌سازد", text: "سفارش صندوق امروز در انتظار می‌نشیند و اثر نهایی‌اش به همان تراکنش اصلی افزوده می‌شود، نه به یک تراکنش جدید." },
  { id: "BRULE-028", title: "حواله در بازبینی، پول را آزاد نمی‌کند", text: "مبلغ از لحظه ثبت کنار گذاشته می‌شود. رد شدن در انطباق، یک برگشت کامل می‌سازد؛ نه پاک کردن رکورد." },
];

export function Rules() {
  const [active, setActive] = useState(0);
  const rule = RULES[active] ?? RULES[0];

  return (
    <section className="section rules" id="rules">
      <div className="wrap">
        <p className="sec-index">
          <span className="serif">07</span>
          <span>قواعد کسب‌وکار</span>
        </p>
        <h2>قواعدی که موجودی را از اثر نادرست نگه می‌دارند.</h2>
        <div className="rule-layout">
          <div className="rule-tabs" role="tablist" aria-label="قواعد" aria-orientation="vertical">
            {RULES.map((item, index) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                id={`rule-tab-${index}`}
                aria-selected={index === active}
                aria-controls="rule-panel"
                tabIndex={index === active ? 0 : -1}
                className={index === active ? "is-on" : ""}
                onClick={() => setActive(index)}
                onKeyDown={(event) => {
                  if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
                  event.preventDefault();
                  const next = (index + (event.key === "ArrowDown" ? 1 : -1) + RULES.length) % RULES.length;
                  setActive(next);
                  document.getElementById(`rule-tab-${next}`)?.focus();
                }}
              >
                <span className="ref" dir="ltr">
                  {item.id}
                </span>
                {item.title}
              </button>
            ))}
          </div>
          <article
            className="rule-panel"
            id="rule-panel"
            role="tabpanel"
            aria-labelledby={`rule-tab-${active}`}
          >
            <p className="ref" dir="ltr">
              {rule.id}
            </p>
            <h3>{rule.title}</h3>
            <p>{rule.text}</p>
          </article>
        </div>
      </div>
    </section>
  );
}
