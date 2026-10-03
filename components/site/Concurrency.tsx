"use client";

import { useRef, useState } from "react";
import { formatGrouped } from "@/lib/format";
import { prefersReducedMotion } from "@/lib/motion";

const START = 10_000_000;
const AMOUNT = 8_000_000;
const AFTER = START - AMOUNT;

type LaneStep = { at: number; text: string };

const LANE_A: LaneStep[] = [
  { at: 0, text: "درخواست رسید" },
  { at: 1, text: "قفل سطر موجودی گرفته شد" },
  { at: 2, text: "۸٬۰۰۰٬۰۰۰ در برابر ۱۰٬۰۰۰٬۰۰۰ بررسی شد" },
  { at: 3, text: "بدهکار و بستانکار با هم نوشته شد" },
  { at: 4, text: "موفق · نسخه رکورد ۱ ← ۲" },
];

const LANE_B: LaneStep[] = [
  { at: 0, text: "درخواست رسید" },
  { at: 1, text: "در انتظار آزاد شدن قفل" },
  { at: 4, text: "موجودی دوباره خوانده شد: ۲٬۰۰۰٬۰۰۰" },
  { at: 5, text: "۸٬۰۰۰٬۰۰۰ از موجودی بیشتر است" },
  { at: 6, text: "رد شد · INSUFFICIENT_BALANCE" },
];

const LAST_TICK = 6;

export function Concurrency() {
  const [tick, setTick] = useState(-1);
  const [running, setRunning] = useState(false);
  const timers = useRef<number[]>([]);

  function clear() {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  }

  function run() {
    if (running) return;
    clear();
    if (prefersReducedMotion()) {
      setTick(LAST_TICK);
      return;
    }
    setRunning(true);
    setTick(-1);
    for (let step = 0; step <= LAST_TICK; step += 1) {
      const id = window.setTimeout(() => {
        setTick(step);
        if (step === LAST_TICK) setRunning(false);
      }, 120 + step * 420);
      timers.current.push(id);
    }
  }

  function reset() {
    clear();
    setRunning(false);
    setTick(-1);
  }

  const committed = tick >= 3;
  const balance = committed ? AFTER : START;
  const finished = tick >= LAST_TICK;

  return (
    <section className="section concurrency" id="concurrency">
      <div className="wrap">
        <header className="sec-head">
          <p className="sec-index">
            <span className="serif">06</span>
            <span>همزمانی</span>
          </p>
          <h2>دو برداشت، یک موجودی.</h2>
          <div className="sec-lead">
            <p>
              موجودی ۱۰٬۰۰۰٬۰۰۰ است و دو انتقال ۸٬۰۰۰٬۰۰۰ در یک لحظه می‌رسند. نباید هر دو ثبت شوند و موجودی هرگز نباید منفی
              شود. قفل سطر موجودی و شرط نسخه رکورد، تصمیم را به یکی می‌دهد.
            </p>
          </div>
        </header>

        <div className="race-balance">
          <p>موجودی کیف پول فرستنده</p>
          <strong className={committed ? "num is-changed" : "num"}>{formatGrouped(balance)}</strong>
          <span>{finished ? "یک تراکنش ثبت شد. موجودی منفی نشد." : "در انتظار نتیجه"}</span>
        </div>

        <div className="race">
          <Lane
            title="درخواست الف"
            note="۸٬۰۰۰٬۰۰۰ به کیان رضایی"
            steps={LANE_A}
            tick={tick}
            verdict={tick >= 4 ? "ok" : null}
            verdictText="ثبت شد"
          />
          <Lane
            title="درخواست ب"
            note="۸٬۰۰۰٬۰۰۰ به نرگس مرادی"
            steps={LANE_B}
            tick={tick}
            verdict={tick >= 6 ? "bad" : null}
            verdictText="رد شد"
          />
        </div>

        <div className="race-actions">
          <button className="btn" type="button" onClick={run} disabled={running}>
            {running ? "در حال اجرا" : "ارسال همزمان"}
          </button>
          <button className="text-btn" type="button" onClick={reset}>
            از نو
          </button>
        </div>
        <p className="bridge">
          درخواست رد شده هم رکورد و شناسه رهگیری دارد. کاربر می‌بیند که چه چیزی رد شد و اینکه موجودی‌اش دست‌نخورده مانده است.
        </p>
      </div>
    </section>
  );
}

function Lane({
  title,
  note,
  steps,
  tick,
  verdict,
  verdictText,
}: {
  title: string;
  note: string;
  steps: LaneStep[];
  tick: number;
  verdict: "ok" | "bad" | null;
  verdictText: string;
}) {
  return (
    <article className={verdict ? `lane lane-${verdict}` : "lane"}>
      <header>
        <h3>{title}</h3>
        <p>{note}</p>
      </header>
      <ol>
        {steps.map((step) => (
          <li key={step.text} className={tick >= step.at ? "is-on" : ""}>
            {step.text}
          </li>
        ))}
      </ol>
      <p className="lane-verdict">{verdict ? verdictText : "—"}</p>
    </article>
  );
}
