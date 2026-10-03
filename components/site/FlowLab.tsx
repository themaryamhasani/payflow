"use client";

import { useRef, useState } from "react";
import { prefersReducedMotion } from "@/lib/motion";

type Scenario = "success" | "insufficient" | "duplicate" | "topup";

const SCENARIOS: { id: Scenario; title: string; text: string }[] = [
  { id: "success", title: "انتقال موفق", text: "بدهکار و بستانکار با هم ثبت می‌شوند." },
  { id: "insufficient", title: "موجودی ناکافی", text: "درخواست رد می‌شود و موجودی دست نمی‌خورد." },
  { id: "duplicate", title: "درخواست تکراری", text: "همان کلید، همان نتیجه، بدون اثر تازه." },
  { id: "topup", title: "شارژ و callback", text: "فقط تأیید موفق، و فقط یک‌بار، بستانکار می‌کند." },
];

const SCRIPTS: Record<Scenario, string[]> = {
  success: [
    "گیرنده تأیید شد · کیان رضایی",
    "مبلغ ۲۵٬۰۰۰٬۰۰۰ · داخل موجودی و سقف روزانه",
    "بدهکار · سارا محمدی · ۱۹۶٬۵۰۰٬۰۰۰ ← ۱۷۱٬۵۰۰٬۰۰۰",
    "بستانکار · کیان رضایی · ۱۰۰٬۴۰۰٬۰۰۰ ← ۱۲۵٬۴۰۰٬۰۰۰",
    "وضعیت موفق · مرجع PF98213123",
  ],
  insufficient: [
    "گیرنده تأیید شد · نرگس مرادی",
    "مبلغ درخواستی از موجودی قابل استفاده بیشتر است",
    "کد INSUFFICIENT_BALANCE",
    "هیچ سطر دفترکل نوشته نشد",
    "موجودی سارا محمدی همان ۱۹۶٬۵۰۰٬۰۰۰ ماند · رهگیری ERR-29182",
  ],
  duplicate: [
    "کلید 7e6b4c21-a91f قبلاً برای همین عمل استفاده شده",
    "نتیجه قبلی برگشت · مرجع PF98213123",
    "بدهکار و بستانکار تازه ساخته نشد",
    "اثر مالی جدید: ندارد",
  ],
  topup: [
    "پرداخت در انتظار ساخته شد · موجودی هنوز ثابت است",
    "درگاه وضعیت موفق را فرستاد و امضا بررسی شد",
    "بستانکار · یک‌بار · مرجع PF184420966",
    "callback دوم رسید و فقط رسید دریافت شد",
    "اعتبار دوباره انجام نشد",
  ],
};

export function FlowLab() {
  const [scenario, setScenario] = useState<Scenario>("success");
  const [lines, setLines] = useState<string[]>([]);
  const [printing, setPrinting] = useState(false);
  const token = useRef(0);

  async function print(next = scenario) {
    const run = ++token.current;
    const script = SCRIPTS[next];
    setPrinting(true);
    setLines([]);
    if (prefersReducedMotion()) {
      setLines(script);
      setPrinting(false);
      return;
    }
    for (let index = 0; index < script.length; index += 1) {
      await wait(next === "topup" ? 280 : 220);
      if (token.current !== run) return;
      setLines(script.slice(0, index + 1));
    }
    if (token.current === run) setPrinting(false);
  }

  function choose(next: Scenario) {
    token.current += 1;
    setScenario(next);
    setLines([]);
    setPrinting(false);
  }

  return (
    <section className="section" id="flow">
      <div className="wrap">
        <header className="sec-head">
          <p className="sec-index">
            <span className="serif">04</span>
            <span>حرکت پول</span>
          </p>
          <h2>پول چطور حرکت می‌کند، و چطور متوقف می‌شود.</h2>
          <div className="sec-lead">
            <p>
              چهار نتیجه را چاپ کنید. موفق یعنی دو سطر با هم. ناموفق یعنی موجودی دست‌نخورده. تکراری یعنی همان مرجع، بدون اثر تازه.
              شارژ یعنی بستانکار شدن فقط بعد از تأیید، و فقط یک‌بار.
            </p>
          </div>
        </header>
        <div className="lab">
          <div className="lab-choices" role="radiogroup" aria-label="سناریوی ثبت">
            {SCENARIOS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={scenario === item.id}
                className={scenario === item.id ? "is-on" : ""}
                onClick={() => choose(item.id)}
              >
                <strong>{item.title}</strong>
                <span>{item.text}</span>
              </button>
            ))}
            <button className="btn" type="button" onClick={() => print()} disabled={printing}>
              {printing ? "در حال چاپ" : "چاپ رکورد"}
            </button>
          </div>
          <div className="receipt" aria-live="polite">
            <div className="receipt-brand">
              <span className="serif">PayFlow</span>
              <span>برگه دفترکل</span>
            </div>
            {lines.length === 0 ? <p className="receipt-empty">رکوردی چاپ نشده است.</p> : null}
            <ol>
              {lines.map((line, index) => (
                <li key={`${scenario}-${index}`} style={{ animationDelay: `${index * 30}ms` }}>
                  {line}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
