"use client";

import type { ReactNode } from "react";
import { TxIcon } from "@/components/Icons";
import { formatGrouped, formatRial, toPersianDigits } from "@/lib/format";
import type { FeeQuote } from "@/lib/fees";
import {
  counterpartyMasked,
  directionFor,
  effectLabel,
  txStatusLabel,
  txTypeLabel,
  type ResultView,
  type Transaction,
  type WalletState,
} from "@/lib/wallet-state";

export function Tab({ on, onClick, children }: { on: boolean; onClick: () => void; children: string }) {
  return (
    <button type="button" className={on ? "is-on" : ""} aria-current={on ? "page" : undefined} onClick={onClick}>
      {children}
    </button>
  );
}

export function Row({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt>{k}</dt>
      <dd className="num">{v}</dd>
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="w-empty">
      <p>{title}</p>
      {children}
    </div>
  );
}

export function Gate({ message }: { message: string }) {
  return (
    <p className="w-alert" role="status">
      <strong>قفل سطح احراز هویت.</strong> {message}
    </p>
  );
}

/** Shows every rule the fee engine applied, so a number is never unexplained. */
export function FeeBreakdown({ quote, gross }: { quote: FeeQuote; gross?: number }) {
  return (
    <div className="w-fee">
      <p className="w-fee-head">تجزیه کارمزد</p>
      <ul>
        {quote.components.map((item) => (
          <li key={item.code}>
            <span>
              <strong>{item.label}</strong>
              <small>{item.rule}</small>
            </span>
            <b className="num">{formatRial(item.amount)}</b>
          </li>
        ))}
      </ul>
      <div className="w-fee-total">
        <span>جمع کارمزد</span>
        <b className="num">{formatRial(quote.total)}</b>
      </div>
      {typeof gross === "number" ? (
        <div className="w-fee-total">
          <span>خالص پس از کارمزد</span>
          <b className="num">{formatRial(gross - quote.total)}</b>
        </div>
      ) : null}
    </div>
  );
}

export function TxRow({
  state,
  userId,
  tx,
  onOpen,
  showCounterparty = false,
}: {
  state: WalletState;
  userId: string;
  tx: Transaction;
  onOpen: (id: string) => void;
  showCounterparty?: boolean;
}) {
  const settled = tx.status === "SUCCESS" || tx.status === "REVERSED";
  const direction = directionFor(tx, userId);
  const sign = settled ? (direction === "DEBIT" ? "−" : "+") : "";
  return (
    <button className="w-row" type="button" onClick={() => onOpen(tx.id)}>
      <TxIcon status={tx.status} direction={direction} />
      <span>
        <strong>{txTypeLabel(tx, userId)}</strong>
        <small>
          {effectLabel(tx, userId)} · {txStatusLabel(tx.status)}
          {showCounterparty ? ` · ${counterpartyMasked(state, tx, userId)}` : ""}
        </small>
      </span>
      <b className="num" dir="ltr">
        {sign}
        {formatGrouped(tx.amount)}
      </b>
    </button>
  );
}

export function ResultBlock({
  result,
  onBack,
  onView,
  children,
}: {
  result: ResultView;
  onBack: () => void;
  onView?: () => void;
  children?: ReactNode;
}) {
  return (
    <section className="w-result" aria-live="polite">
      {result.code ? (
        <p className="ref" dir="ltr">
          {result.code}
        </p>
      ) : null}
      <h2>{result.title}</h2>
      {typeof result.amount === "number" ? <p className="w-result-amount num">{formatRial(result.amount)}</p> : null}
      {result.secondary ? <p className="w-result-second num">{toPersianDigits(result.secondary)}</p> : null}
      {result.counterparty ? <p>طرف مقابل: {result.counterparty}</p> : null}
      {result.reference ? (
        <p>
          مرجع{" "}
          <span className="ref" dir="ltr">
            {result.reference}
          </span>
        </p>
      ) : null}
      {result.traceId ? (
        <p>
          رهگیری{" "}
          <span className="ref" dir="ltr">
            {result.traceId}
          </span>
        </p>
      ) : null}
      <p>{result.message}</p>
      {typeof result.balanceAfter === "number" ? <p>موجودی کنونی: {formatRial(result.balanceAfter)}</p> : null}
      <div className="w-actions">
        <button className="btn" type="button" onClick={onBack}>
          بازگشت به کیف پول
        </button>
        {onView ? (
          <button className="btn btn-ghost" type="button" onClick={onView}>
            مشاهده تراکنش
          </button>
        ) : null}
      </div>
      {children}
    </section>
  );
}

/** Inline outcome banner for screens that stay put instead of navigating away. */
export function Outcome({ result }: { result: ResultView | null }) {
  if (!result) return null;
  return (
    <p className={result.tone === "bad" ? "w-alert w-alert-bad" : "w-alert"} role="status">
      <strong>{result.title}.</strong> {result.message}
      {result.secondary ? <> {toPersianDigits(result.secondary)}.</> : null}
      {result.reference ? (
        <>
          {" "}
          <span className="ref" dir="ltr">
            {result.reference}
          </span>
        </>
      ) : null}
    </p>
  );
}
