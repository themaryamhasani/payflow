"use client";

import { useState } from "react";
import { Empty, FeeBreakdown, Gate, Outcome } from "@/components/wallet/parts";
import { formatRial, formatWhen, parseAmount, toPersianDigits } from "@/lib/format";
import { lateFee } from "@/lib/fees";
import { CREDIT_CEILING, CREDIT_RATE, CREDIT_TERMS, type CreditTerm } from "@/lib/catalog";
import {
  capabilityGate,
  loansOf,
  outstandingDebt,
  tierOf,
  type Action,
  type Loan,
  type WalletState,
} from "@/lib/wallet-state";

const DAY = 86_400_000;

export function Credit({
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
  const gate = capabilityGate(state, userId, "CREDIT");
  const loans = loansOf(state, userId);
  const ceiling = CREDIT_CEILING[tierOf(state, userId)];
  const engaged = loans
    .filter((loan) => loan.status === "ACTIVE")
    .reduce(
      (sum, loan) => sum + loan.installments.filter((item) => !item.paidAt).reduce((inner, item) => inner + item.principal, 0),
      0,
    );
  const room = Math.max(0, ceiling - engaged);
  const debt = outstandingDebt(state, userId);

  const [raw, setRaw] = useState("");
  const [term, setTerm] = useState<CreditTerm>(6);
  const amount = parseAmount(raw);
  const rate = CREDIT_RATE[term];
  const profit = amount ? Math.round((amount * rate * term) / 12) : 0;
  const perInstallment = amount ? Math.round((amount + profit) / term) : 0;
  const valid = amount !== null && amount > 0 && amount <= room;

  return (
    <section className="w-flow">
      <button className="w-linkish" type="button" onClick={onBack}>
        بازگشت به خدمات
      </button>
      <p className="w-steps">اعتبار و خرید اقساطی</p>
      <h2>اعتبار، پول قرض‌گرفته است؛ در دارایی خالص شما منفی می‌نشیند</h2>
      <p className="w-help">
        اعتبار همان لحظه به کیف پول می‌آید و از همان لحظه بدهی می‌سازد. سود از پیش اعلام می‌شود و در جدول اقساط ثابت است.
        دیرکرد جریمه دارد و جریمه سطر جدای خودش را در دفترکل می‌گیرد.
      </p>

      <dl className="w-confirm">
        <div>
          <dt>سقف اعتبار سطح شما</dt>
          <dd className="num">{formatRial(ceiling)}</dd>
        </div>
        <div>
          <dt>ظرفیت آزاد</dt>
          <dd className="num">{formatRial(room)}</dd>
        </div>
        <div>
          <dt>بدهی باز، با جریمه</dt>
          <dd className="num">{formatRial(debt)}</dd>
        </div>
      </dl>

      <Outcome result={state.lastResult} />

      {gate ? (
        <Gate message={gate} />
      ) : (
        <form
          className="w-block"
          onSubmit={(event) => {
            event.preventDefault();
            if (!valid || amount === null) return;
            run(() => dispatch({ type: "CREDIT_REQUEST", amount, term, key: crypto.randomUUID() }));
            setRaw("");
          }}
        >
          <h3>درخواست اعتبار تازه</h3>
          <label className="w-field">
            مبلغ به ریال
            <input inputMode="numeric" autoComplete="off" value={raw} onChange={(event) => setRaw(event.target.value)} />
          </label>
          <div className="w-seg" role="radiogroup" aria-label="مدت بازپرداخت">
            {CREDIT_TERMS.map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={term === option}
                className={term === option ? "is-on" : ""}
                onClick={() => setTerm(option)}
              >
                {toPersianDigits(option)} ماه
              </button>
            ))}
          </div>
          <p className="w-help">
            نرخ سود سالانه این مدت {toPersianDigits((rate * 100).toFixed(0))}٪ است.
          </p>
          {amount !== null && amount > room ? (
            <p className="w-warn">مبلغ از ظرفیت آزاد اعتبار شما بیشتر است.</p>
          ) : null}
          {amount && valid ? (
            <dl className="w-confirm">
              <div>
                <dt>مجموع سود</dt>
                <dd className="num">{formatRial(profit)}</dd>
              </div>
              <div>
                <dt>مبلغ هر قسط</dt>
                <dd className="num">{formatRial(perInstallment)}</dd>
              </div>
              <div>
                <dt>جمع بازپرداخت</dt>
                <dd className="num">{formatRial(amount + profit)}</dd>
              </div>
            </dl>
          ) : null}
          <button className="btn" type="submit" disabled={!valid || busy}>
            {busy ? "در حال ثبت…" : "دریافت اعتبار"}
          </button>
        </form>
      )}

      <div className="w-block">
        <h3>پرونده‌های اعتبار</h3>
        {loans.length === 0 ? (
          <Empty title="هنوز اعتباری نگرفته‌اید.">
            <p className="w-help">پس از دریافت، جدول اقساط همین‌جا ساخته می‌شود.</p>
          </Empty>
        ) : null}
        {loans.map((loan) => (
          <LoanCard
            key={loan.id}
            loan={loan}
            state={state}
            busy={busy}
            onPay={(no) => run(() => dispatch({ type: "INSTALLMENT_PAY", loanId: loan.id, no, key: crypto.randomUUID() }))}
            onBackdate={() => dispatch({ type: "INSTALLMENT_BACKDATE", loanId: loan.id })}
            onOpen={onOpen}
          />
        ))}
      </div>
    </section>
  );
}

function LoanCard({
  loan,
  state,
  busy,
  onPay,
  onBackdate,
  onOpen,
}: {
  loan: Loan;
  state: WalletState;
  busy: boolean;
  onPay: (no: number) => void;
  onBackdate: () => void;
  onOpen: (id: string) => void;
}) {
  const nextDue = loan.installments.find((item) => !item.paidAt);
  const overdueMs = nextDue ? Date.now() - new Date(nextDue.dueAt).getTime() : 0;
  const periods = overdueMs > 0 ? Math.ceil(overdueMs / (30 * DAY)) : 0;
  const penalty = nextDue && periods > 0 ? lateFee(nextDue.total, periods) : null;
  const disbursement = state.transactions.find((tx) => tx.id === loan.transactionId);

  return (
    <article className="w-loan">
      <header>
        <strong>
          اعتبار {toPersianDigits(loan.term)} ماهه · {formatRial(loan.principal)}
        </strong>
        <span className={loan.status === "SETTLED" ? "w-chip is-ok" : "w-chip"}>
          {loan.status === "SETTLED" ? "تسویه‌شده" : "باز"}
        </span>
      </header>
      {disbursement ? (
        <p className="w-help">
          پرداخت اولیه{" "}
          <button className="w-linkish ref" type="button" dir="ltr" onClick={() => onOpen(disbursement.id)}>
            {disbursement.reference}
          </button>
        </p>
      ) : null}
      <ol className="w-sched">
        {loan.installments.map((item) => {
          const paid = Boolean(item.paidAt);
          const late = !paid && Date.now() > new Date(item.dueAt).getTime();
          return (
            <li key={item.no} data-state={paid ? "paid" : late ? "late" : "open"}>
              <span className="serif">{toPersianDigits(item.no)}</span>
              <span>
                <strong className="num">{formatRial(item.total)}</strong>
                <small>
                  سرسید {formatWhen(item.dueAt)}
                  {item.lateFee > 0 ? ` · جریمه پرداخت‌شده ${formatRial(item.lateFee)}` : ""}
                </small>
              </span>
              <em>{paid ? "پرداخت‌شده" : late ? "گذشته از سرسید" : "در انتظار"}</em>
            </li>
          );
        })}
      </ol>
      {nextDue ? (
        <>
          {penalty ? <FeeBreakdown quote={penalty} /> : null}
          <div className="w-actions">
            <button className="btn" type="button" disabled={busy} onClick={() => onPay(nextDue.no)}>
              {busy
                ? "در حال پرداخت…"
                : `پرداخت قسط ${toPersianDigits(nextDue.no)} · ${formatRial(nextDue.total + (penalty?.total ?? 0))}`}
            </button>
            {periods === 0 ? (
              <button className="btn btn-ghost" type="button" onClick={onBackdate}>
                نمایش حالت دیرکرد
              </button>
            ) : null}
          </div>
          {periods === 0 ? (
            <p className="w-help">
              دکمه دوم فقط در محیط آزمایش است و سرسید قسط بعدی را به گذشته می‌برد تا قاعده جریمه دیده شود.
            </p>
          ) : null}
        </>
      ) : (
        <p className="w-help">همه اقساط پرداخت شده است.</p>
      )}
    </article>
  );
}
