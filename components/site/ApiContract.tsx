"use client";

import { useState } from "react";

const ENDPOINTS = [
  { method: "POST", path: "/api/v1/auth/register", purpose: "ثبت‌نام کاربر", auth: "ندارد", idem: "ندارد" },
  { method: "POST", path: "/api/v1/auth/login", purpose: "ورود و صدور توکن", auth: "ندارد", idem: "ندارد" },
  { method: "GET", path: "/api/v1/wallet", purpose: "کیف پول خود کاربر", auth: "دارد", idem: "ندارد" },
  { method: "POST", path: "/api/v1/wallet/top-up", purpose: "ساخت پرداخت شارژ", auth: "دارد", idem: "توصیه‌شده" },
  { method: "POST", path: "/api/v1/transfers", purpose: "انتقال فردبه‌فرد", auth: "دارد", idem: "الزامی" },
  { method: "GET", path: "/api/v1/transactions", purpose: "فهرست تراکنش‌ها", auth: "دارد", idem: "ندارد" },
  { method: "GET", path: "/api/v1/transactions/{id}", purpose: "جزئیات تراکنش", auth: "دارد", idem: "ندارد" },
  { method: "POST", path: "/api/v1/kyc/submit", purpose: "ارسال مدرک احراز هویت", auth: "دارد", idem: "توصیه‌شده" },
  { method: "POST", path: "/api/v1/fx/orders", purpose: "تبدیل ارز", auth: "سطح ۲", idem: "الزامی" },
  { method: "POST", path: "/api/v1/crypto/orders", purpose: "خرید یا فروش رمزارز", auth: "سطح ۲", idem: "الزامی" },
  { method: "POST", path: "/api/v1/funds/orders", purpose: "صدور یا ابطال واحد", auth: "سطح ۲", idem: "الزامی" },
  { method: "POST", path: "/api/v1/credit/plans", purpose: "ساخت طرح اقساطی", auth: "سطح ۲", idem: "الزامی" },
  { method: "POST", path: "/api/v1/credit/installments/{id}/pay", purpose: "پرداخت قسط", auth: "سطح ۲", idem: "الزامی" },
  { method: "POST", path: "/api/v1/cards", purpose: "درخواست کارت فیزیکی", auth: "سطح ۲", idem: "الزامی" },
  { method: "POST", path: "/api/v1/remittances", purpose: "ثبت حواله بین‌المللی", auth: "سطح ۳", idem: "الزامی" },
  { method: "POST", path: "/api/v1/merchants/{id}/settlements", purpose: "تسویه دسته پذیرنده", auth: "سطح ۳", idem: "الزامی" },
  { method: "GET", path: "/api/v1/quotes", purpose: "تجزیه کارمزد پیش از تأیید", auth: "دارد", idem: "ندارد" },
  { method: "GET", path: "/api/v1/admin/transactions", purpose: "جستجوی عملیات", auth: "نقش مدیر", idem: "ندارد" },
  { method: "PATCH", path: "/api/v1/admin/wallets/{id}/status", purpose: "تغییر وضعیت کیف پول", auth: "نقش مدیر", idem: "توصیه‌شده" },
  { method: "POST", path: "/api/v1/admin/remittances/{id}/review", purpose: "تأیید یا رد انطباق", auth: "نقش مدیر", idem: "الزامی" },
];

const SAMPLES = {
  request: `POST /api/v1/transfers
Authorization: Bearer <token>
Idempotency-Key: 7e6b...

{
  "receiverId": "USR-1002",
  "amount": 250000,
  "description": "Transfer"
}`,
  success: `201 Created

{
  "transactionId": "TX-98213",
  "referenceNumber": "PF98213123",
  "status": "SUCCESS",
  "amount": 250000,
  "currency": "IRR"
}`,
  error: `409 Conflict

{
  "code": "INSUFFICIENT_BALANCE",
  "message": "Wallet balance is insufficient.",
  "traceId": "abc-98213"
}`,
};

const TABS: { id: keyof typeof SAMPLES; label: string }[] = [
  { id: "request", label: "درخواست" },
  { id: "success", label: "پاسخ موفق" },
  { id: "error", label: "خطا" },
];

const EVENTS = [
  ["wallet_viewed", "پیشخوان باز شد"],
  ["topup_started", "شارژ آغاز شد"],
  ["topup_completed", "شارژ تأیید شد"],
  ["transfer_started", "فرم انتقال تأیید شد"],
  ["transfer_completed", "انتقال ثبت شد"],
  ["transfer_rejected", "رد اعتبارسنجی کسب‌وکاری"],
  ["kyc_tier_raised", "سطح احراز هویت بالا رفت"],
  ["quote_viewed", "تجزیه کارمزد دیده شد"],
  ["asset_order_placed", "سفارش ارز، رمزارز یا صندوق ثبت شد"],
  ["credit_plan_opened", "طرح اقساطی باز شد"],
  ["remittance_held", "حواله به بازبینی رفت"],
  ["settlement_paid", "دسته تسویه پذیرنده واریز شد"],
];

export function ApiContract() {
  const [tab, setTab] = useState<keyof typeof SAMPLES>("request");

  return (
    <section className="section contract" id="contract">
      <div className="wrap">
        <header className="sec-head">
          <p className="sec-index">
            <span className="serif">11</span>
            <span>قرارداد</span>
          </p>
          <h2>آنچه کلاینت می‌تواند به آن تکیه کند.</h2>
          <div className="sec-lead">
            <p>
              همه APIهای عمومی نسخه‌بندی‌شده‌اند. هر عملی که پول را جابه‌جا می‌کند کلید یکتاسازی می‌خواهد و سطح هویت لازمش را
              اعلام می‌کند. کد خطا برای ماشین خواناست و پیام برای کاربر بی‌خطر. اتمام مهلت کلاینت به‌معنی شکست قطعی مالی
              نیست؛ کلاینت باید وضعیت تراکنش را امن بپرسد.
            </p>
          </div>
        </header>

        <div className="contract-grid">
          <div className="endpoints">
            <div className="ep-head" aria-hidden="true">
              <span>مسیر</span>
              <span className="ep-metas">
                <span>احراز</span>
                <span>یکتاسازی</span>
              </span>
            </div>
            <ul>
              {ENDPOINTS.map((item) => (
                <li key={item.path + item.method}>
                  <span>
                    <b className="ref" dir="ltr">
                      {item.method} {item.path}
                    </b>
                    <small>{item.purpose}</small>
                  </span>
                  <span className="ep-metas">
                    <span className="ep-meta">
                      <i>احراز</i>
                      {item.auth}
                    </span>
                    <span className={item.idem === "الزامی" ? "ep-meta is-req" : "ep-meta"}>
                      <i>یکتاسازی</i>
                      {item.idem}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="sample">
            <div className="sample-tabs" role="tablist" aria-label="نمونه تماس">
              {TABS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === item.id}
                  className={tab === item.id ? "is-on" : ""}
                  onClick={() => setTab(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <pre dir="ltr">
              <code>{SAMPLES[tab]}</code>
            </pre>
            <p>
              هر پاسخ خطا سه چیز دارد: کد ماشین‌خوان، پیام قابل نمایش، و شناسه رهگیری. شناسه رهگیری در پشتیبانی به کار می‌آید و
              داده حساس در پیام خطا قرار نمی‌گیرد.
            </p>
          </div>
        </div>

        <div className="events">
          <h3>رخدادهای تحلیلی</h3>
          <ul>
            {EVENTS.map(([name, when]) => (
              <li key={name}>
                <b className="ref" dir="ltr">
                  {name}
                </b>
                <span>{when}</span>
              </li>
            ))}
          </ul>
          <p>
            این رخدادها برای سنجش محصول‌اند. تحلیل رفتار از دفترکل مالی جداست و هیچ‌وقت منبع حقیقت پول به حساب نمی‌آید.
          </p>
        </div>
      </div>
    </section>
  );
}
