"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatGrouped, formatMillion } from "@/lib/format";
import { prefersReducedMotion } from "@/lib/motion";

const AMOUNT = 25_000_000;
const BEFORE = { sender: 196_500_000, receiver: 100_400_000 };
const AFTER = { sender: BEFORE.sender - AMOUNT, receiver: BEFORE.receiver + AMOUNT };
const REFERENCE = "PF98213123";
const KEY = "7e6b4c21-a91f";

type Phase = "idle" | "moving" | "committing" | "done" | "replayed";

export function Hero() {
  const trackRef = useRef<HTMLDivElement>(null);
  const phaseRef = useRef<Phase>("idle");
  const timers = useRef<number[]>([]);
  const [phase, setPhaseState] = useState<Phase>("idle");
  const [x, setX] = useState(0);
  const [balances, setBalances] = useState(BEFORE);
  const [live, setLive] = useState("انتقال نمونه هنوز اجرا نشده است.");

  function setPhase(next: Phase) {
    phaseRef.current = next;
    setPhaseState(next);
  }

  function clearTimers() {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  }

  function measure() {
    const width = trackRef.current?.clientWidth ?? 320;
    return -Math.max(72, width - 132);
  }

  function finishAt(next: Phase, message: string) {
    setX(measure());
    setBalances(AFTER);
    setPhase(next);
    setLive(message);
  }

  function run() {
    const current = phaseRef.current;
    if (current === "moving" || current === "committing") return;
    if (current === "done" || current === "replayed") {
      setPhase("replayed");
      setLive(`درخواست تکراری بود. مرجع ${REFERENCE} برگشت و موجودی‌ها تغییر نکردند.`);
      return;
    }
    if (prefersReducedMotion()) {
      finishAt("done", `انتقال انجام شد. مرجع ${REFERENCE}. موجودی فرستنده و گیرنده با هم به‌روز شد.`);
      return;
    }
    const end = measure();
    setPhase("moving");
    setLive("مبلغ در حال حرکت است. هنوز ثبت نهایی نشده.");
    setX(end / 2);
    const first = window.setTimeout(() => {
      setPhase("committing");
      setX(end);
      setBalances(AFTER);
      setLive("بدهکار و بستانکار با هم ثبت شدند.");
      const second = window.setTimeout(() => {
        setPhase("done");
        setLive(`انتقال انجام شد. مرجع ${REFERENCE}.`);
      }, 680);
      timers.current.push(second);
    }, 620);
    timers.current.push(first);
  }

  function reset() {
    clearTimers();
    setX(0);
    setBalances(BEFORE);
    setPhase("idle");
    setLive("سناریو به حالت اول برگشت.");
  }

  useEffect(() => {
    const end = measure();
    if (prefersReducedMotion()) {
      setX(end);
      setBalances(AFTER);
      setPhase("done");
      setLive(`انتقال انجام شد. مرجع ${REFERENCE}.`);
      return;
    }
    const id = window.setTimeout(run, 700);
    return () => window.clearTimeout(id);
    // Autoplay once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onResize = () => {
      if (phaseRef.current !== "idle") setX(measure());
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      clearTimers();
    };
  }, []);

  const recorded = phase === "committing" || phase === "done" || phase === "replayed";
  const actionLabel = phase === "done" || phase === "replayed" ? "تکرار همان درخواست" : "اجرای انتقال";

  return (
    <section className="hero" id="top">
      <div className="wrap hero-grid">
        <div className="hero-copy">
          <p className="kicker light">
            <span className="serif">Ledger-first wallet</span>
            <span>کیف پول دیجیتال</span>
          </p>
          <h1>
            هر ریال،
            <br />
            یک رد دارد.
          </h1>
          <p className="lead">
            PayFlow برای نگهداری ارزش، انتقال وجه به کاربر دیگر، و پیگیری وضعیت و تاریخچه است. اگر خطایی پیش بیاید، نتیجه باید
            قابل فهم و قابل پیگیری باشد.
          </p>
          <p className="vision serif">
            Create a secure, simple and traceable digital wallet that enables users to fund, transfer and track money instantly.
          </p>
          <div className="hero-actions">
            <Link className="btn btn-light" href="/wallet">
              گشودن کیف پول
            </Link>
            <button className="btn btn-ghost on-dark" type="button" onClick={run}>
              {actionLabel}
            </button>
          </div>
          <p className="cta-note">
            نمونه‌کار محصولی است؛ سامانه بانکی دارای مجوز نیست و پول حقیقی جابه‌جا نمی‌شود.
          </p>
        </div>

        <div className="slip" aria-labelledby="slip-title">
          <div className="slip-top">
            <p id="slip-title">انتقال نمونه</p>
            <span className="ref" dir="ltr">
              {REFERENCE}
            </span>
          </div>
          <p className="slip-key">
            کلید یکتاسازی
            <span className="ref" dir="ltr">
              {KEY}
            </span>
          </p>
          <div className="parties">
            <div>
              <span>فرستنده</span>
              <strong>سارا محمدی</strong>
              <b className="num">{formatMillion(balances.sender)}</b>
            </div>
            <div>
              <span>گیرنده</span>
              <strong>کیان رضایی</strong>
              <b className="num">{formatMillion(balances.receiver)}</b>
            </div>
          </div>
          <div className="track" ref={trackRef}>
            <span className="chip num" style={{ transform: `translateX(${x}px)` }}>
              {formatMillion(AMOUNT)}
            </span>
          </div>
          <p className="lock-line">{phase === "moving" ? "در حال بررسی" : phase === "committing" ? "ثبت اتمیک" : ""}</p>
          <div className="slip-rows">
            <SlipRow
              side="بدهکار"
              who="سارا محمدی"
              amount={recorded ? `−${formatGrouped(AMOUNT)}` : "—"}
              show={recorded}
            />
            <SlipRow
              side="بستانکار"
              who="کیان رضایی"
              amount={recorded ? `+${formatGrouped(AMOUNT)}` : "—"}
              show={recorded}
            />
          </div>
          {phase === "replayed" ? (
            <p className="stamp-row">
              <span className="stamp" role="status">
                اثر جدید ندارد
              </span>
            </p>
          ) : null}
          <div className="slip-foot">
            <span className={recorded ? "pill ok" : "pill"}>{recorded ? "موفق" : "آماده"}</span>
            <button className="text-btn" type="button" onClick={reset}>
              از نو
            </button>
          </div>
          <p className="slip-note">
            {phase === "replayed"
              ? "همان کلید قبلاً استفاده شده. نتیجه قبلی برگشت و هیچ‌کدام از موجودی‌ها دوباره حرکت نکرد."
              : "نمایش مفهومی یک انتقال: یا هر دو سطر دفترکل ثبت می‌شوند، یا هیچ‌کدام."}
          </p>
          <p className="sr" aria-live="polite">
            {live}
          </p>
        </div>
      </div>
      <a className="scroll-cue" href="#problem">
        <span>مسئله از کجا شروع می‌شود</span>
      </a>
    </section>
  );
}

function SlipRow({ side, who, amount, show }: { side: string; who: string; amount: string; show: boolean }) {
  return (
    <div className={show ? "srow show" : "srow"}>
      <span>{side}</span>
      <span>{who}</span>
      <b className="num" dir="ltr">
        {amount}
      </b>
    </div>
  );
}
