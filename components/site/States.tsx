"use client";

import { useState } from "react";

const TRANSACTIONS = [
  { id: "CREATED", label: "ایجاد شده", text: "رکورد ساخته شده و هنوز اثر نهایی ندارد." },
  { id: "PENDING", label: "در انتظار", text: "منتظر کار بیرونی یا اقدام کاربر است. موجودی نهایی نشده." },
  { id: "PROCESSING", label: "در حال انجام", text: "عملیات مالی در جریان است." },
  { id: "SUCCESS", label: "موفق", text: "ثبت شده و نهایی است، مگر آنکه بعداً جبران شود." },
  { id: "FAILED", label: "ناموفق", text: "شکست خورده و اثر مالی موردنظر را نگذاشته است." },
  { id: "CANCELLED", label: "لغو شده", text: "پیش از تکمیل لغو شده است." },
  { id: "REVERSED", label: "برگشت‌خورده", text: "عمل جبرانی به تراکنش اصلی وصل است. جایگزین حذف آن نیست." },
];

const WALLETS = [
  { id: "ACTIVE", label: "فعال", text: "عملیات عادی مجاز است." },
  { id: "SUSPENDED", label: "معلق", text: "محدودیت موقت. تا پایان بررسی، انتقال خروجی ممکن نیست." },
  { id: "BLOCKED", label: "مسدود", text: "محدودیت شدید. انتقال خروجی مجاز نیست." },
  { id: "CLOSED", label: "بسته", text: "عملیات جدید پذیرفته نمی‌شود." },
];

export function States() {
  const [tx, setTx] = useState("SUCCESS");
  const [wallet, setWallet] = useState("ACTIVE");
  const txItem = TRANSACTIONS.find((item) => item.id === tx) ?? TRANSACTIONS[3];
  const walletItem = WALLETS.find((item) => item.id === wallet) ?? WALLETS[0];

  return (
    <section className="section states" id="states">
      <div className="wrap">
        <header className="sec-head">
          <p className="sec-index">
            <span className="serif">10</span>
            <span>زبان وضعیت</span>
          </p>
          <h2>وضعیت مبهم نمی‌ماند.</h2>
          <div className="sec-lead">
            <p>گذار غیرمجاز در لایه سرویس متوقف می‌شود. رنگ به‌تنهایی معنی نیست؛ هر وضعیت نام دارد.</p>
          </div>
        </header>
        <div className="machine">
          <p className="machine-label">تراکنش</p>
          <div className="machine-row" role="group" aria-label="وضعیت تراکنش">
            {TRANSACTIONS.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={tx === item.id}
                className={tx === item.id ? "is-on" : ""}
                onClick={() => setTx(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <p className="machine-copy">
            <span className="ref" dir="ltr">
              {txItem.id}
            </span>
            {txItem.text}
          </p>
        </div>
        <div className="machine">
          <p className="machine-label">کیف پول</p>
          <div className="machine-row" role="group" aria-label="وضعیت کیف پول">
            {WALLETS.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={wallet === item.id}
                className={wallet === item.id ? "is-on" : ""}
                onClick={() => setWallet(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <p className="machine-copy">
            <span className="ref" dir="ltr">
              {walletItem.id}
            </span>
            {walletItem.text}
          </p>
        </div>
      </div>
    </section>
  );
}
