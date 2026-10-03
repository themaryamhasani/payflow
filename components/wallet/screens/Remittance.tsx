"use client";

import { useState } from "react";
import { Empty, FeeBreakdown, Gate, Outcome } from "@/components/wallet/parts";
import { formatQuantity, formatRial, formatWhen, parseAmount, toPersianDigits } from "@/lib/format";
import { CORRIDORS, CORRIDOR_CODES, CURRENCIES, type CorridorCode } from "@/lib/catalog";
import {
  capabilityGate,
  dailyLimitOf,
  dailyUsed,
  remittanceQuote,
  remittancesOf,
  type Action,
  type Remittance as RemittanceRecord,
  type WalletState,
} from "@/lib/wallet-state";

const STATUS_LABELS: Record<RemittanceRecord["status"], string> = {
  QUOTED: "نرخ‌گیری",
  COMPLIANCE_HOLD: "در بازبینی انطباق",
  SENT: "ارسال‌شده",
  PAID: "پرداخت‌شده",
  REJECTED: "رد‌شده",
};

export function Remittance({
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
  const gate = capabilityGate(state, userId, "REMIT");
  const list = remittancesOf(state, userId);
  const limit = dailyLimitOf(state, userId);
  const used = dailyUsed(state);

  const [corridor, setCorridor] = useState<CorridorCode>("TR");
  const [beneficiary, setBeneficiary] = useState("");
  const [iban, setIban] = useState("");
  const [purpose, setPurpose] = useState("");
  const [raw, setRaw] = useState("");
  const [reason, setReason] = useState("");

  const amount = parseAmount(raw);
  const info = CORRIDORS[corridor];
  const quote = amount && amount > 0 ? remittanceQuote(corridor, amount) : null;
  const willHold = amount !== null && amount > info.reviewAbove;
  const overLimit = amount !== null && used + amount > limit;
  const valid =
    amount !== null && amount > 0 && beneficiary.trim().length > 2 && iban.trim().length >= 8 && purpose.trim().length > 0 && !overLimit;

  return (
    <section className="w-flow">
      <button className="w-linkish" type="button" onClick={onBack}>
        بازگشت به خدمات
      </button>
      <p className="w-steps">حواله بین‌المللی</p>
      <h2>پول که از مرز می‌گذرد، قاعده‌اش عوض می‌شود</h2>
      <p className="w-help">
        حواله مثل انتقال داخلی فوری نیست. مبلغ همان لحظه از کیف پول کنار گذاشته می‌شود، اما تا پایان بازبینی انطباق به
        ذی‌نفع نمی‌رسد. اگر حواله رد شود، کل مبلغ همراه کارمزد برمی‌گردد، چون خدمتی انجام نشده است.
      </p>

      <ul className="w-pos">
        {CORRIDOR_CODES.map((code) => (
          <li key={code}>
            <span>
              <strong>{CORRIDORS[code].country}</strong>
              <small>
                شریک {CORRIDORS[code].partner} · {toPersianDigits(CORRIDORS[code].days)} روز کاری · آستانه بازبینی{" "}
                {formatRial(CORRIDORS[code].reviewAbove)}
              </small>
            </span>
            <b>{CURRENCIES[CORRIDORS[code].payoutCurrency].label}</b>
          </li>
        ))}
      </ul>

      <Outcome result={state.lastResult} />

      {gate ? (
        <Gate message={gate} />
      ) : (
        <form
          className="w-block"
          onSubmit={(event) => {
            event.preventDefault();
            if (!valid || amount === null) return;
            run(() =>
              dispatch({
                type: "REMIT_SEND",
                corridor,
                beneficiary,
                iban,
                amount,
                purpose,
                key: crypto.randomUUID(),
              }),
            );
            setRaw("");
          }}
        >
          <h3>حواله تازه</h3>
          <label className="w-field">
            مسیر
            <select value={corridor} onChange={(event) => setCorridor(event.target.value as CorridorCode)}>
              {CORRIDOR_CODES.map((code) => (
                <option key={code} value={code}>
                  {CORRIDORS[code].country}
                </option>
              ))}
            </select>
          </label>
          <label className="w-field">
            نام ذی‌نفع
            <input value={beneficiary} onChange={(event) => setBeneficiary(event.target.value)} required />
          </label>
          <label className="w-field">
            شماره حساب بین‌المللی
            <input dir="ltr" value={iban} onChange={(event) => setIban(event.target.value)} required />
          </label>
          <label className="w-field">
            علت حواله
            <input value={purpose} onChange={(event) => setPurpose(event.target.value)} required />
          </label>
          <label className="w-field">
            مبلغ به ریال
            <input inputMode="numeric" autoComplete="off" value={raw} onChange={(event) => setRaw(event.target.value)} />
          </label>
          <p className="w-help">
            حواله هم از سقف روزانه کم می‌کند. امروز {formatRial(used)} از {formatRial(limit)} مصرف شده است.
          </p>
          {overLimit ? <p className="w-warn">این مبلغ از سقف روزانه سطح شما عبور می‌کند.</p> : null}
          {willHold ? (
            <p className="w-warn">
              این مبلغ از آستانه بازبینی مسیر {info.country} بیشتر است و حواله مستقیم ارسال نمی‌شود؛ به صف انطباق می‌رود.
            </p>
          ) : null}
          {quote ? (
            <>
              <dl className="w-confirm">
                <div>
                  <dt>نرخ تبدیل اعمال‌شده</dt>
                  <dd className="num">{formatRial(quote.rate)}</dd>
                </div>
                <div>
                  <dt>دریافتی ذی‌نفع</dt>
                  <dd className="num">
                    {formatQuantity(quote.payout, CURRENCIES[info.payoutCurrency].decimals)}{" "}
                    {CURRENCIES[info.payoutCurrency].label}
                  </dd>
                </div>
              </dl>
              <FeeBreakdown quote={quote.fee} gross={amount ?? 0} />
              <p className="w-help">
                نرخ اعمال‌شده از نرخ مرجع بالاتر است، چون حاشیه ارزی مسیر در آن حساب شده. این حاشیه جدا از کارمزد خدمت و
                کارمزد شریک است.
              </p>
            </>
          ) : null}
          <button className="btn" type="submit" disabled={!valid || busy}>
            {busy ? "در حال ثبت حواله…" : "ثبت حواله"}
          </button>
        </form>
      )}

      <div className="w-block">
        <h3>حواله‌های شما</h3>
        {list.length === 0 ? <Empty title="حواله‌ای ثبت نشده است." /> : null}
        {list.map((item) => {
          const tx = state.transactions.find((entry) => entry.id === item.transactionId);
          return (
            <article key={item.id} className="w-remit">
              <header>
                <strong>
                  {item.beneficiary} · {CORRIDORS[item.corridor].country}
                </strong>
                <span className={item.status === "REJECTED" ? "w-chip is-bad" : item.status === "SENT" ? "w-chip is-ok" : "w-chip"}>
                  {STATUS_LABELS[item.status]}
                </span>
              </header>
              <dl className="w-confirm">
                <div>
                  <dt>مبلغ ارسالی</dt>
                  <dd className="num">{formatRial(item.amount)}</dd>
                </div>
                <div>
                  <dt>دریافتی ذی‌نفع</dt>
                  <dd className="num">
                    {formatQuantity(item.payoutAmount, CURRENCIES[item.payoutCurrency].decimals)}{" "}
                    {CURRENCIES[item.payoutCurrency].label}
                  </dd>
                </div>
                <div>
                  <dt>شماره حساب</dt>
                  <dd className="ref">{item.iban}</dd>
                </div>
                <div>
                  <dt>زمان</dt>
                  <dd>{formatWhen(item.createdAt)}</dd>
                </div>
              </dl>
              {item.holdReason ? <p className="w-help">{item.holdReason}</p> : null}
              {tx ? (
                <p className="w-help">
                  تراکنش{" "}
                  <button className="w-linkish ref" type="button" dir="ltr" onClick={() => onOpen(tx.id)}>
                    {tx.reference}
                  </button>
                </p>
              ) : null}
              {item.status === "COMPLIANCE_HOLD" ? (
                <form
                  className="w-sandbox"
                  onSubmit={(event) => {
                    event.preventDefault();
                  }}
                >
                  <p>
                    نتیجه بازبینی را تیم انطباق ثبت می‌کند. دلیل الزامی است و در ممیزی می‌نشیند. این نما برای نشان دادن همان
                    مسیر است.
                  </p>
                  <label className="w-field">
                    دلیل، الزامی
                    <input value={reason} onChange={(event) => setReason(event.target.value)} />
                  </label>
                  <div className="w-actions">
                    <button
                      className="btn btn-light"
                      type="button"
                      disabled={!reason.trim()}
                      onClick={() => {
                        dispatch({ type: "REMIT_REVIEW", remittanceId: item.id, outcome: "RELEASE", reason });
                        setReason("");
                      }}
                    >
                      آزاد کردن حواله
                    </button>
                    <button
                      className="btn btn-ghost on-dark"
                      type="button"
                      disabled={!reason.trim()}
                      onClick={() => {
                        dispatch({ type: "REMIT_REVIEW", remittanceId: item.id, outcome: "REJECT", reason });
                        setReason("");
                      }}
                    >
                      رد و برگشت کل مبلغ
                    </button>
                  </div>
                </form>
              ) : null}
            </article>
          );
        })}
        {state.opsResult ? <Outcome result={state.opsResult} /> : null}
      </div>
    </section>
  );
}
