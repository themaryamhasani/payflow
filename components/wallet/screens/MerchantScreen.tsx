"use client";

import { useState } from "react";
import { Empty, FeeBreakdown, Gate, Outcome } from "@/components/wallet/parts";
import { formatRial, formatWhen, parseAmount, toPersianDigits } from "@/lib/format";
import { settlementFee } from "@/lib/fees";
import { CATEGORIES, CATEGORY_CODES, type MerchantCategory } from "@/lib/catalog";
import { capabilityGate, merchantOf, type Action, type WalletState } from "@/lib/wallet-state";

export function MerchantScreen({
  state,
  userId,
  dispatch,
  run,
  busy,
  onBack,
  onOpen,
}: {
  state: WalletState;
  userId: string;
  dispatch: (action: Action) => void;
  run: (fn: () => void) => void;
  busy: boolean;
  onBack: () => void;
  onOpen: (id: string) => void;
}) {
  const gate = capabilityGate(state, userId, "MERCHANT");
  const merchant = merchantOf(state, userId);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<MerchantCategory>("RETAIL");
  const [raw, setRaw] = useState("");

  const pending = merchant
    ? state.captures.filter((item) => item.merchantId === merchant.id && !item.settlementId)
    : [];
  const gross = pending.reduce((sum, item) => sum + item.amount, 0);
  const quote =
    merchant && gross > 0
      ? settlementFee(gross, { category: merchant.category, captures: pending.length, monthlyVolume: merchant.monthlyVolume })
      : null;
  const batches = merchant ? state.settlements.filter((item) => item.merchantId === merchant.id) : [];
  const amount = parseAmount(raw);

  return (
    <section className="w-flow">
      <button className="w-linkish" type="button" onClick={onBack}>
        بازگشت به خدمات
      </button>
      <p className="w-steps">تسویه پذیرنده</p>
      <h2>پذیرنده پولش را فوری نمی‌گیرد؛ دسته‌ای می‌گیرد</h2>
      <p className="w-help">
        هر پرداختی که می‌پذیرید در استخر پذیرندگی می‌نشیند، نه در کیف پول. تسویه، چند پذیرش را یک‌جا جمع می‌کند، کارمزد را
        حساب می‌کند و خالص را به کیف پول می‌ریزد. کارمزد از سه جزء ساخته می‌شود و هر جزء قاعده‌اش را نشان می‌دهد.
      </p>

      <Outcome result={state.lastResult} />

      {!merchant ? (
        gate ? (
          <Gate message={gate} />
        ) : (
          <form
            className="w-block"
            onSubmit={(event) => {
              event.preventDefault();
              run(() => dispatch({ type: "MERCHANT_ONBOARD", name, category }));
            }}
          >
            <h3>ساخت پرونده پذیرندگی</h3>
            <label className="w-field">
              نام کسب‌وکار
              <input value={name} onChange={(event) => setName(event.target.value)} required />
            </label>
            <label className="w-field">
              رسته
              <select value={category} onChange={(event) => setCategory(event.target.value as MerchantCategory)}>
                {CATEGORY_CODES.map((code) => (
                  <option key={code} value={code}>
                    {CATEGORIES[code].label}
                  </option>
                ))}
              </select>
            </label>
            <ul className="w-pos">
              {CATEGORY_CODES.map((code) => (
                <li key={code}>
                  <span>
                    <strong>{CATEGORIES[code].label}</strong>
                    <small>نرخ پایه پذیرندگی و کارمزد ثابت هر تراکنش</small>
                  </span>
                  <b className="num">{toPersianDigits((CATEGORIES[code].mdrBps / 100).toFixed(2).replace(".", "٫"))}٪</b>
                  <small className="num">{formatRial(CATEGORIES[code].fixed)}</small>
                </li>
              ))}
            </ul>
            <p className="w-help">
              نرخ رسته پایه است، نه نهایی. تخفیف پله‌ای حجم ماهانه روی همین نرخ اعمال می‌شود و مالیات ارزش افزوده فقط روی
              کارمزد می‌نشیند، نه روی اصل مبلغ.
            </p>
            <button className="btn" type="submit" disabled={busy || name.trim().length < 3}>
              {busy ? "در حال ثبت…" : "ساخت پرونده"}
            </button>
          </form>
        )
      ) : (
        <>
          <dl className="w-confirm">
            <div>
              <dt>نام پذیرنده</dt>
              <dd>{merchant.name}</dd>
            </div>
            <div>
              <dt>رسته</dt>
              <dd>{CATEGORIES[merchant.category].label}</dd>
            </div>
            <div>
              <dt>کد پذیرنده</dt>
              <dd className="ref">{merchant.mcc}</dd>
            </div>
            <div>
              <dt>حجم تسویه‌شده ماه</dt>
              <dd className="num">{formatRial(merchant.monthlyVolume)}</dd>
            </div>
          </dl>

          <form
            className="w-block"
            onSubmit={(event) => {
              event.preventDefault();
              if (amount === null || amount <= 0) return;
              dispatch({ type: "MERCHANT_CAPTURE", amount, key: crypto.randomUUID() });
              setRaw("");
            }}
          >
            <h3>پذیرش پرداخت</h3>
            <label className="w-field">
              مبلغ به ریال
              <input inputMode="numeric" autoComplete="off" value={raw} onChange={(event) => setRaw(event.target.value)} />
            </label>
            <p className="w-help">
              پذیرش، سطر دفترکل در کیف پول شما نمی‌سازد. مبلغ در استخر پذیرندگی می‌ماند تا تسویه اجرا شود.
            </p>
            <button className="btn btn-ghost" type="submit" disabled={amount === null || amount <= 0}>
              افزودن پذیرش
            </button>
          </form>

          <div className="w-block">
            <h3>دسته باز تسویه</h3>
            {pending.length === 0 ? (
              <Empty title="پذیرش تسویه‌نشده‌ای نیست.">
                <p className="w-help">چند پرداخت اضافه کنید تا موتور کارمزد روی یک دسته واقعی کار کند.</p>
              </Empty>
            ) : (
              <>
                <ul className="w-pos">
                  {pending.map((item) => (
                    <li key={item.id}>
                      <span>
                        <strong className="ref">{item.id}</strong>
                        <small>{formatWhen(item.createdAt)}</small>
                      </span>
                      <b className="num">{formatRial(item.amount)}</b>
                    </li>
                  ))}
                </ul>
                <dl className="w-confirm">
                  <div>
                    <dt>تعداد پذیرش</dt>
                    <dd className="num">{toPersianDigits(pending.length)}</dd>
                  </div>
                  <div>
                    <dt>جمع ناخالص</dt>
                    <dd className="num">{formatRial(gross)}</dd>
                  </div>
                </dl>
                {quote ? <FeeBreakdown quote={quote} gross={gross} /> : null}
                <button
                  className="btn"
                  type="button"
                  disabled={busy}
                  onClick={() => run(() => dispatch({ type: "MERCHANT_SETTLE", key: crypto.randomUUID() }))}
                >
                  {busy ? "در حال تسویه…" : "اجرای تسویه"}
                </button>
              </>
            )}
          </div>

          <div className="w-block">
            <h3>دسته‌های تسویه‌شده</h3>
            {batches.length === 0 ? <Empty title="هنوز تسویه‌ای اجرا نشده است." /> : null}
            {batches.map((batch) => {
              const tx = state.transactions.find((item) => item.id === batch.transactionId);
              return (
                <article key={batch.id} className="w-batch">
                  <header>
                    <strong className="ref" dir="ltr">
                      {batch.batch}
                    </strong>
                    <span className="w-chip is-ok">{toPersianDigits(batch.captures)} پذیرش</span>
                  </header>
                  <dl className="w-confirm">
                    <div>
                      <dt>ناخالص</dt>
                      <dd className="num">{formatRial(batch.gross)}</dd>
                    </div>
                    <div>
                      <dt>کارمزد</dt>
                      <dd className="num">{formatRial(batch.fee)}</dd>
                    </div>
                    <div>
                      <dt>خالص واریزی</dt>
                      <dd className="num">{formatRial(batch.net)}</dd>
                    </div>
                  </dl>
                  <FeeBreakdown quote={batch.feeQuote} gross={batch.gross} />
                  {tx ? (
                    <p className="w-help">
                      تراکنش{" "}
                      <button className="w-linkish ref" type="button" dir="ltr" onClick={() => onOpen(tx.id)}>
                        {tx.reference}
                      </button>
                    </p>
                  ) : null}
                </article>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
