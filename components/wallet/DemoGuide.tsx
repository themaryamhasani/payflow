"use client";

import { useEffect, useId, useRef, useState } from "react";
import { DEMO_MOBILE, DEMO_SECRET } from "@/lib/wallet-state";

const STORAGE_KEY = "payflow-demo-guide-dismissed";

const PATHS = [
  {
    title: "انتقال ساده",
    text: "از «سناریوهای آماده» روی پیشخوان، یا دستی به کیان منتقل کنید و همان کلید را تکرار کنید.",
  },
  {
    title: "ارتقای هویت",
    text: "سناریوی ارتقای هویت، یا خدمات → احراز هویت با کد ملی نمونه تا سطح ۳.",
  },
  {
    title: "حواله با بازبینی",
    text: "سناریوی حواله را بزنید تا مسیر انطباق دیده شود؛ یا از خدمات → انتقال بین‌المللی بروید.",
  },
];

export function DemoGuide({
  mode,
  forceOpen = false,
  onCloseForce,
}: {
  mode: "auth" | "app";
  forceOpen?: boolean;
  onCloseForce?: () => void;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const actionRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (forceOpen) {
      setOpen(true);
      return;
    }
    try {
      setOpen(window.localStorage.getItem(STORAGE_KEY) !== "1");
    } catch {
      setOpen(true);
    }
  }, [forceOpen]);

  function dismiss() {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore quota */
    }
    setOpen(false);
    onCloseForce?.();
  }

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    actionRef.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        dismiss();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((node) => node.offsetParent !== null);
      if (focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
    // dismiss closes over latest props
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  return (
    <div className="demo-guide-backdrop" role="presentation" onClick={dismiss}>
      <div
        ref={dialogRef}
        className="demo-guide"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <p className="demo-guide-kicker">
          <span className="serif">Sandbox</span>
          <span>راهنمای شروع</span>
        </p>
        <h2 id={titleId}>{mode === "auth" ? "از اینجا شروع کنید" : "سه مسیر کوتاه برای دیدن محصول"}</h2>
        <p>
          این یک مطالعه موردی محصول است، نه سامانه بانکی دارای مجوز. پول حقیقی جابه‌جا نمی‌شود. همه عددها و تراکنش‌ها در
          مرورگر شما ساخته می‌شوند و با رفرش حفظ می‌مانند تا وقتی دمو را بازنشانی کنید.
        </p>
        {mode === "auth" ? (
          <dl className="demo-guide-creds">
            <div>
              <dt>موبایل نمونه</dt>
              <dd className="ref" dir="ltr">
                {DEMO_MOBILE}
              </dd>
            </div>
            <div>
              <dt>گذرواژه نمونه</dt>
              <dd className="ref" dir="ltr">
                {DEMO_SECRET}
              </dd>
            </div>
          </dl>
        ) : null}
        <ol className="demo-guide-paths">
          {PATHS.map((item, index) => (
            <li key={item.title}>
              <span className="serif" aria-hidden="true">
                {index + 1}
              </span>
              <span>
                <strong>{item.title}</strong>
                <small>{item.text}</small>
              </span>
            </li>
          ))}
        </ol>
        <div className="demo-guide-actions">
          <button ref={actionRef} className="btn" type="button" onClick={dismiss}>
            {mode === "auth" ? "متوجه شدم، ورود می‌کنم" : "شروع کردم"}
          </button>
        </div>
      </div>
    </div>
  );
}
