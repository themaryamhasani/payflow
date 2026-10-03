"use client";

import { useState } from "react";
import { FeeBreakdown, Gate, Outcome } from "@/components/wallet/parts";
import { formatRial, formatWhen, toPersianDigits } from "@/lib/format";
import { cardIssueFee } from "@/lib/fees";
import { CARD_ISSUE_FEE } from "@/lib/catalog";
import {
  availableBalance,
  capabilityGate,
  cardStatusLabel,
  cardsOf,
  type Action,
  type Card,
  type WalletState,
} from "@/lib/wallet-state";

const STEPS: Card["status"][] = ["REQUESTED", "PRINTING", "SHIPPED", "DELIVERED", "ACTIVE"];

export function CardScreen({
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
  const gate = capabilityGate(state, userId, "CARD");
  const cards = cardsOf(state, userId);
  const quote = cardIssueFee(CARD_ISSUE_FEE);
  const [last4, setLast4] = useState("");
  const [reason, setReason] = useState("");

  return (
    <section className="w-flow">
      <button className="w-linkish" type="button" onClick={onBack}>
        بازگشت به خدمات
      </button>
      <p className="w-steps">کارت فیزیکی</p>
      <h2>کارت، درگاه دیگری به همین کیف پول است</h2>
      <p className="w-help">
        کارت موجودی جداگانه ندارد. هر خرید با کارت از همان موجودی قابل استفاده کیف پول کم می‌شود، پس سقف کارت همان سقف کیف
        پول است. تا فعال‌سازی دستی، کارت قابل استفاده نیست.
      </p>

      <Outcome result={state.lastResult} />

      {cards.length === 0 ? (
        gate ? (
          <Gate message={gate} />
        ) : (
          <div className="w-block">
            <h3>درخواست کارت</h3>
            <FeeBreakdown quote={quote} />
            <p className="w-help">
              کارمزد صدور و ارسال یک‌بار و همین حالا کسر می‌شود. موجودی قابل استفاده شما {formatRial(availableBalance(state))}{" "}
              است.
            </p>
            <button
              className="btn"
              type="button"
              disabled={busy}
              onClick={() => run(() => dispatch({ type: "CARD_REQUEST", key: crypto.randomUUID() }))}
            >
              {busy ? "در حال ثبت درخواست…" : "درخواست کارت فیزیکی"}
            </button>
          </div>
        )
      ) : null}

      {cards.map((card) => {
        const issue = state.transactions.find((tx) => tx.id === card.transactionId);
        const stepIndex = STEPS.indexOf(card.status === "FROZEN" ? "ACTIVE" : card.status);
        return (
          <div key={card.id} className="w-block">
            <div className="w-card-face" data-status={card.status}>
              <span className="serif">PayFlow</span>
              <strong className="ref" dir="ltr">
                {card.maskedPan}
              </strong>
              <span className="w-card-meta">
                <span dir="ltr">{card.expiry}</span>
                <span>{cardStatusLabel(card.status)}</span>
              </span>
            </div>

            <ol className="w-track-steps">
              {STEPS.map((step, index) => (
                <li key={step} data-on={index <= stepIndex ? "yes" : "no"}>
                  {cardStatusLabel(step)}
                </li>
              ))}
            </ol>

            <dl className="w-confirm">
              <div>
                <dt>رهگیری ارسال</dt>
                <dd className="ref">{card.shippingRef}</dd>
              </div>
              <div>
                <dt>زمان درخواست</dt>
                <dd>{formatWhen(card.requestedAt)}</dd>
              </div>
              {issue ? (
                <div>
                  <dt>تراکنش صدور</dt>
                  <dd>
                    <button className="w-linkish ref" type="button" dir="ltr" onClick={() => onOpen(issue.id)}>
                      {issue.reference}
                    </button>
                  </dd>
                </div>
              ) : null}
              {card.frozenReason ? (
                <div>
                  <dt>دلیل قفل</dt>
                  <dd>{card.frozenReason}</dd>
                </div>
              ) : null}
            </dl>

            {card.status === "REQUESTED" || card.status === "PRINTING" || card.status === "SHIPPED" ? (
              <div className="w-sandbox">
                <p>
                  در محیط آزمایش، رخدادهای شرکت پست را دستی جلو می‌برید. هر تغییر وضعیت در ممیزی می‌نشیند و اثر مالی تازه‌ای
                  ندارد.
                </p>
                <button
                  className="btn btn-ghost"
                  type="button"
                  onClick={() => dispatch({ type: "CARD_ADVANCE", cardId: card.id })}
                >
                  رخداد بعدی ارسال
                </button>
              </div>
            ) : null}

            {card.status === "DELIVERED" ? (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  run(() => dispatch({ type: "CARD_ACTIVATE", cardId: card.id, last4 }));
                  setLast4("");
                }}
              >
                <label className="w-field">
                  چهار رقم آخر کارت
                  <input
                    inputMode="numeric"
                    dir="ltr"
                    maxLength={4}
                    value={last4}
                    onChange={(event) => setLast4(event.target.value)}
                    required
                  />
                </label>
                <p className="w-help">
                  فعال‌سازی فقط با چهار رقم آخر همان کارت انجام می‌شود تا کسی کارت دیگری را فعال نکند. روی کارت بالا{" "}
                  <span className="ref" dir="ltr">
                    {card.last4}
                  </span>{" "}
                  نوشته شده است.
                </p>
                <button className="btn" type="submit" disabled={busy || last4.length !== 4}>
                  {busy ? "در حال فعال‌سازی…" : "فعال‌سازی کارت"}
                </button>
              </form>
            ) : null}

            {card.status === "ACTIVE" ? (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  dispatch({ type: "CARD_FREEZE", cardId: card.id, frozen: true, reason });
                  setReason("");
                }}
              >
                <label className="w-field">
                  دلیل قفل، الزامی
                  <input value={reason} onChange={(event) => setReason(event.target.value)} required />
                </label>
                <p className="w-help">
                  قفل فوری است و موجودی را دست نمی‌زند. تراکنش‌های ثبت‌شده پیش از قفل برنمی‌گردند، چون رکورد مالی حذف‌شدنی
                  نیست.
                </p>
                <button className="btn btn-ghost" type="submit" disabled={!reason.trim()}>
                  قفل فوری کارت
                </button>
              </form>
            ) : null}

            {card.status === "FROZEN" ? (
              <button
                className="btn"
                type="button"
                onClick={() => dispatch({ type: "CARD_FREEZE", cardId: card.id, frozen: false, reason: "" })}
              >
                برداشتن قفل
              </button>
            ) : null}
          </div>
        );
      })}

      {cards.length > 0 ? (
        <p className="w-help">
          هر کیف پول در این نسخه یک کارت دارد. شماره کارت کامل هیچ‌وقت در پاسخ API یا لاگ نمی‌آید؛ همیشه{" "}
          {toPersianDigits(4)} رقم آخر نگه داشته می‌شود.
        </p>
      ) : null}
    </section>
  );
}
