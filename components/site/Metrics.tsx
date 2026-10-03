"use client";

import { useEffect, useState } from "react";
import { toPersianDigits } from "@/lib/format";
import { useInView } from "@/components/Reveal";
import { prefersReducedMotion } from "@/lib/motion";

export function Metrics() {
  const { ref, inView } = useInView<HTMLDivElement>();
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (prefersReducedMotion()) {
      setValue(99.9);
      return;
    }
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / 900);
      setValue(99.9 * (1 - (1 - progress) ** 3));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView]);

  const shown = toPersianDigits(value.toFixed(1).replace(".", "٫"));

  return (
    <section className="section metrics" id="metrics" ref={ref}>
      <div className="wrap">
        <header className="sec-head">
          <p className="sec-index">
            <span className="serif">12</span>
            <span>معیار موفقیت</span>
          </p>
          <h2>صحت، قبل از رشد.</h2>
          <div className="sec-lead">
            <p>این‌ها هدف نسخه اول‌اند، نه آمار یک سامانه زنده. اثر تکراری و ثبت ناقص باید صفر بمانند.</p>
          </div>
        </header>
        <div className="metric-grid">
          <article>
            <p className="metric-num">۰</p>
            <h3>اثر مالی تکراری</h3>
            <p>یک درخواست منطقی نباید بیش از یک حرکت پول بسازد.</p>
          </article>
          <article>
            <p className="metric-num">۰</p>
            <h3>ثبت ناقص</h3>
            <p>یک سمت انتقال بدون سمت دیگر commit نمی‌شود.</p>
          </article>
          <article>
            <p className="metric-num">{inView ? shown : "۰"}٪</p>
            <h3>دسترس‌پذیری هسته</h3>
            <p>هدف سرویس‌های اصلی، ۹۹٫۹ درصد در ماه است.</p>
          </article>
          <article>
            <p className="metric-num metric-small">کمتر از ۲ ثانیه</p>
            <h3>تأخیر P95</h3>
            <p>دست‌کم ۹۵ درصد APIهای عمومی، در بار عادی.</p>
          </article>
        </div>
        <p className="bridge">نرخ موفقیت انتقال، به‌جز ردهای اعتبارسنجی، هدفش بیش از ۹۹ درصد است.</p>
      </div>
    </section>
  );
}
