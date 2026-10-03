"use client";

import { useState } from "react";
import { Outcome } from "@/components/wallet/parts";
import { formatRial, toPersianDigits } from "@/lib/format";
import { CAPABILITIES, CAPABILITY_CODES, TIERS, TIER_ORDER, type Tier } from "@/lib/catalog";
import { kycOf, tierOf, type Action, type WalletState } from "@/lib/wallet-state";

const SAMPLE_ID = "1234567891";

const OUTCOME_LABELS: Record<string, string> = {
  PASS: "تأییدشده",
  REFER: "ارجاع به بررسی",
  FAIL: "رد‌شده",
  PENDING: "در انتظار",
};

export function Identity({
  state,
  userId,
  dispatch,
  run,
  busy,
  onBack,
}: {
  state: WalletState;
  userId: string;
  dispatch: (action: Action) => void;
  run: (fn: () => void) => void;
  busy: boolean;
  onBack: () => void;
}) {
  const profile = kycOf(state, userId);
  const tier = tierOf(state, userId);
  const next = (tier < 3 ? ((tier + 1) as Tier) : null);
  const [target, setTarget] = useState<Tier>(next ?? 3);
  const [nationalId, setNationalId] = useState("");
  const [address, setAddress] = useState("");
  const [income, setIncome] = useState("");

  if (!profile) return null;
  const reviewing = profile.status === "IN_REVIEW";

  return (
    <section className="w-flow">
      <button className="w-linkish" type="button" onClick={onBack}>
        بازگشت به خدمات
      </button>
      <p className="w-steps">احراز هویت</p>
      <h2>سطح هویت، سقف و قابلیت را تعیین می‌کند</h2>
      <p className="w-help">
        تأیید هویت بیرون از PayFlow انجام می‌شود. ما مدرک را نگه نمی‌داریم؛ فقط نتیجه بررسی و شناسه پرونده را ذخیره
        می‌کنیم. تا پاسخ قطعی، سطح و سقف قبلی پابرجاست و هیچ پولی جابه‌جا نمی‌شود.
      </p>

      <ol className="w-tiers">
        {TIER_ORDER.map((level) => {
          const info = TIERS[level];
          const reached = tier >= level;
          return (
            <li key={level} className={reached ? "is-on" : ""} aria-current={tier === level ? "step" : undefined}>
              <span className="serif">{toPersianDigits(level)}</span>
              <span>
                <strong>{info.label}</strong>
                <small>{info.requirement}</small>
                <small className="num">
                  سقف روزانه {formatRial(info.dailyLimit)}
                  {info.orderLimit > 0 ? ` · سقف هر سفارش ${formatRial(info.orderLimit)}` : ""}
                </small>
              </span>
              <em>{reached ? "فعال" : "باز نشده"}</em>
            </li>
          );
        })}
      </ol>

      <div className="w-block">
        <h3>قابلیت‌ها و سطح لازم</h3>
        <ul className="w-caps">
          {CAPABILITY_CODES.map((code) => {
            const info = CAPABILITIES[code];
            const open = tier >= info.minTier;
            return (
              <li key={code} className={open ? "is-on" : ""}>
                <span>
                  <strong>{info.label}</strong>
                  <small>{info.summary}</small>
                </span>
                <em>{open ? "باز" : `نیاز به ${TIERS[info.minTier].label}`}</em>
              </li>
            );
          })}
        </ul>
      </div>

      <Outcome result={state.lastResult} />

      <div className="w-block">
        <h3>پرونده احراز هویت</h3>
        <dl className="w-confirm">
          <div>
            <dt>سامانه بررسی‌کننده</dt>
            <dd>{profile.provider}</dd>
          </div>
          <div>
            <dt>وضعیت پرونده</dt>
            <dd>{statusText(profile.status)}</dd>
          </div>
          {profile.providerRef ? (
            <div>
              <dt>شناسه پرونده</dt>
              <dd className="ref">{profile.providerRef}</dd>
            </div>
          ) : null}
        </dl>
        {profile.checks.length > 0 ? (
          <ul className="w-checks">
            {profile.checks.map((check) => (
              <li key={check.code} data-outcome={check.outcome}>
                <span>
                  <strong>{check.label}</strong>
                  <small>{check.note}</small>
                </span>
                <em>{OUTCOME_LABELS[check.outcome]}</em>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {reviewing ? (
        <div className="w-sandbox">
          <p>
            در محیط آزمایش، پاسخ سامانه بیرونی را خودتان انتخاب می‌کنید تا هر سه مسیر دیده شود. در محیط واقعی این پاسخ با
            فراخوان سرور به سرور می‌آید و کلاینت در آن نقشی ندارد.
          </p>
          <div className="w-actions">
            <button className="btn" type="button" disabled={busy} onClick={() => run(() => dispatch({ type: "KYC_RESULT", outcome: "PASS" }))}>
              پاسخ مثبت
            </button>
            <button className="btn btn-ghost" type="button" disabled={busy} onClick={() => run(() => dispatch({ type: "KYC_RESULT", outcome: "REFER" }))}>
              ارجاع به بررسی انسانی
            </button>
            <button className="btn btn-ghost" type="button" disabled={busy} onClick={() => run(() => dispatch({ type: "KYC_RESULT", outcome: "FAIL" }))}>
              پاسخ منفی
            </button>
          </div>
        </div>
      ) : next === null ? (
        <p className="w-alert" role="status">
          <strong>بالاترین سطح را دارید.</strong> همه قابلیت‌های این نسخه برای شما باز است.
        </p>
      ) : (
        <form
          className="w-block"
          onSubmit={(event) => {
            event.preventDefault();
            run(() =>
              dispatch({
                type: "KYC_SUBMIT",
                targetTier: target,
                nationalId,
                address,
                incomeSource: income,
              }),
            );
          }}
        >
          <h3>ارتقای سطح</h3>
          <label className="w-field">
            سطح درخواستی
            <select value={target} onChange={(event) => setTarget(Number(event.target.value) as Tier)}>
              {TIER_ORDER.filter((level) => level > tier).map((level) => (
                <option key={level} value={level}>
                  {TIERS[level].label}
                </option>
              ))}
            </select>
          </label>
          <label className="w-field">
            کد ملی
            <input
              inputMode="numeric"
              dir="ltr"
              autoComplete="off"
              value={nationalId}
              onChange={(event) => setNationalId(event.target.value)}
              required
            />
          </label>
          <p className="w-help">
            رقم کنترلی کد ملی همین‌جا بررسی می‌شود تا پرونده نامعتبر به سامانه بیرونی فرستاده نشود. نمونه معتبر{" "}
            <button className="w-linkish ref" type="button" dir="ltr" onClick={() => setNationalId(SAMPLE_ID)}>
              {SAMPLE_ID}
            </button>
          </p>
          {target === 3 ? (
            <>
              <label className="w-field">
                نشانی محل سکونت
                <input value={address} onChange={(event) => setAddress(event.target.value)} required />
              </label>
              <label className="w-field">
                منبع درآمد
                <input value={income} onChange={(event) => setIncome(event.target.value)} required />
              </label>
              <p className="w-help">
                برای تأیید کامل، پالایش فهرست‌های تحریمی و بررسی اشخاص دارای نفوذ سیاسی هم اجرا می‌شود.
              </p>
            </>
          ) : null}
          <button className="btn" type="submit" disabled={busy || !nationalId.trim()}>
            {busy ? "در حال ارسال پرونده…" : "ارسال برای بررسی"}
          </button>
        </form>
      )}
    </section>
  );
}

function statusText(status: string) {
  switch (status) {
    case "NONE":
      return "بدون پرونده";
    case "SUBMITTED":
      return "ارسال‌شده";
    case "IN_REVIEW":
      return "در بررسی سامانه بیرونی";
    case "VERIFIED":
      return "تأییدشده";
    case "REFERRED":
      return "ارجاع به بررسی انسانی";
    default:
      return "رد‌شده";
  }
}
