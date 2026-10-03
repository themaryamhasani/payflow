"use client";

import { useEffect, useRef, useState } from "react";

const STAGES = [
  {
    id: "01",
    stage: "ثبت‌نام و ورود",
    goal: "ورود امن",
    response: "حساب ساخته یا احراز می‌شود و نشست معتبر صادر می‌گردد.",
    ux: "خطا واضح باشد و اطلاعات حساس را لو ندهد.",
  },
  {
    id: "02",
    stage: "کیف پول",
    goal: "دیدن وضعیت مالی",
    response: "موجودی ثبت‌شده، موجودی قابل استفاده، واحد پول و وضعیت کیف پول نشان داده می‌شود.",
    ux: "موجودی در بالاترین سطح دید باشد. اگر کیف پول فعال نیست، محدودیت عمل روشن باشد.",
  },
  {
    id: "03",
    stage: "شارژ",
    goal: "افزایش موجودی",
    response: "ابتدا پرداخت در انتظار ساخته می‌شود. فقط بعد از تأیید درگاه، کیف پول یک‌بار بستانکار می‌شود.",
    ux: "وضعیت در انتظار، موفق و ناموفق از هم جدا باشند. پرداخت ناموفق موجودی را عوض نکند.",
  },
  {
    id: "04",
    stage: "انتقال",
    goal: "ارسال پول",
    response: "گیرنده، مبلغ، موجودی، سقف روزانه و وضعیت کیف پول بررسی می‌شود. سپس بدهکار و بستانکار در یک ثبت انجام می‌شوند.",
    ux: "گیرنده پیش از تأیید قابل تشخیص باشد. مبلغ، کارمزد و جمع دیده شود. ارسال دوباره از رابط گرفته شود؛ کنترل اصلی سمت سرور است.",
  },
  {
    id: "05",
    stage: "تاریخچه",
    goal: "پیگیری",
    response: "فقط تراکنش‌های کیف پول خود کاربر، از تازه‌ترین، با صفحه‌بندی و فیلتر تاریخ، نوع و وضعیت.",
    ux: "جزئیات شامل مرجع، مبلغ، نوع، وضعیت، زمان و طرف مقابل به‌صورت پوشیده‌شده باشد.",
  },
  {
    id: "06",
    stage: "پشتیبانی",
    goal: "حل مشکل",
    response: "عملیات با مرجع، شناسه تراکنش یا کاربر جستجو می‌کند و وضعیت را بدون دست‌کاری رکورد مالی می‌بیند.",
    ux: "شناسه پیگیری در دسترس باشد و وضعیت گفته‌شده با واقعیت تراکنش یکی باشد.",
  },
];

export function Journey() {
  const sectionRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const stage = STAGES[active] ?? STAGES[0];

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;
    const onScroll = () => {
      if (window.innerWidth <= 800) return;
      const rect = node.getBoundingClientRect();
      const total = node.offsetHeight - window.innerHeight;
      if (total <= 0) return;
      const passed = Math.min(Math.max(-rect.top, 0), total);
      const index = Math.min(STAGES.length - 1, Math.floor((passed / total) * STAGES.length));
      setActive((prev) => (prev === index ? prev : index));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  function go(index: number) {
    const node = sectionRef.current;
    if (!node || window.innerWidth <= 800) {
      setActive(index);
      return;
    }
    const total = node.offsetHeight - window.innerHeight;
    const top = node.getBoundingClientRect().top + window.scrollY;
    const target = top + (total * index) / STAGES.length + 8;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: target, behavior: reduce ? "auto" : "smooth" });
  }

  return (
    <section className="journey" id="journey" ref={sectionRef}>
      <div className="journey-sticky">
        <div className="wrap journey-grid">
          <div>
            <p className="sec-index">
              <span className="serif">03</span>
              <span>سفر کاربر</span>
            </p>
            <h2>از ورود تا وقتی کسی باید توضیح بدهد.</h2>
            <ol className="journey-index">
              {STAGES.map((item, index) => (
                <li key={item.id}>
                  <button type="button" aria-current={index === active ? "step" : undefined} onClick={() => go(index)}>
                    <span className="serif">{item.id}</span>
                    {item.stage}
                  </button>
                </li>
              ))}
            </ol>
          </div>
          <article className="journey-panel" key={stage.id}>
            <p className="kicker">
              <span className="serif">
                {stage.id} / 06
              </span>
            </p>
            <h3>{stage.stage}</h3>
            <dl>
              <div>
                <dt>هدف کاربر</dt>
                <dd>{stage.goal}</dd>
              </div>
              <div>
                <dt>پاسخ سامانه</dt>
                <dd>{stage.response}</dd>
              </div>
              <div>
                <dt>الزام تجربه</dt>
                <dd>{stage.ux}</dd>
              </div>
            </dl>
          </article>
        </div>
      </div>
      <div className="journey-mobile wrap">
        <p className="sec-index">
          <span className="serif">03</span>
          <span>سفر کاربر</span>
        </p>
        <h2>از ورود تا وقتی کسی باید توضیح بدهد.</h2>
        <ol>
          {STAGES.map((item) => (
            <li key={item.id}>
              <span className="serif">{item.id}</span>
              <h3>{item.stage}</h3>
              <p>{item.goal}</p>
              <p>{item.response}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
