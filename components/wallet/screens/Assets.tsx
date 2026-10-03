"use client";

import { useState } from "react";
import { FeeBreakdown, Gate, Outcome } from "@/components/wallet/parts";
import { formatQuantity, formatRial, parseAmount, parseDecimal, toPersianDigits } from "@/lib/format";
import { cryptoFee, fundBuyFee, fxFee } from "@/lib/fees";
import {
  ASSETS,
  ASSET_CODES,
  CURRENCIES,
  FUNDS,
  FUND_CODES,
  FX_CURRENCIES,
  instrumentDecimals,
  type AssetCode,
  type CurrencyCode,
  type FundCode,
} from "@/lib/catalog";
import {
  capabilityGate,
  formatUnits,
  orderLimitOf,
  portfolioValue,
  positionOf,
  type Action,
  type WalletState,
} from "@/lib/wallet-state";

interface Props {
  state: WalletState;
  userId: string;
  dispatch: (action: Action) => void;
  run: (fn: () => void) => void;
  busy: boolean;
  onOpen: (id: string) => void;
}

export function Assets({ state, userId, dispatch, run, busy, onOpen }: Props) {
  const total = portfolioValue(state, userId);
  const rial = state.balances[userId] ?? 0;
  const orderLimit = orderLimitOf(state, userId);

  return (
    <section>
      <div className="w-balance">
        <p>ارزش کل دارایی · برآورد به ریال</p>
        <strong className="num">
          {formatQuantity(total, 0)}
          <small>ریال</small>
        </strong>
        <div className="w-available">
          <span>از این مقدار، ریال نقد</span>
          <b className="num">{formatRial(rial)}</b>
        </div>
        <div className="w-available">
          <span>سقف هر سفارش در سطح شما</span>
          <b className="num">{formatRial(orderLimit)}</b>
        </div>
        <p className="w-help">
          ارزش دارایی غیرریالی با نرخ مرجع لحظه‌ای برآورد می‌شود و با مبلغی که در لحظه فروش می‌گیرید یکی نیست. اسپرد و
          کارمزد پیش از ثبت هر سفارش نشان داده می‌شود.
        </p>
      </div>

      <Outcome result={state.lastResult} />

      <Pockets state={state} userId={userId} dispatch={dispatch} run={run} busy={busy} />
      <Crypto state={state} userId={userId} dispatch={dispatch} run={run} busy={busy} />
      <Funds state={state} userId={userId} dispatch={dispatch} run={run} busy={busy} onOpen={onOpen} />
    </section>
  );
}

/* ------------------------------- currency pockets ----------------------------- */

function Pockets({
  state,
  userId,
  dispatch,
  run,
  busy,
}: Omit<Props, "onOpen">) {
  const [from, setFrom] = useState<CurrencyCode>("IRR");
  const [to, setTo] = useState<CurrencyCode>("USD");
  const [raw, setRaw] = useState("");
  const gate = capabilityGate(state, userId, "FX");

  const decimals = instrumentDecimals(from);
  const amount = decimals === 0 ? parseAmount(raw) : parseDecimal(raw);
  const notional = amount ? amount * CURRENCIES[from].mid : 0;
  const quote = notional > 0 ? fxFee(notional) : null;
  const receive = quote ? Math.max(0, notional - quote.total) / CURRENCIES[to].mid : 0;
  const held = positionOf(state, userId, from);
  const enough = amount !== null && amount <= held;
  const valid = amount !== null && amount > 0 && from !== to && enough;

  return (
    <div className="w-block">
      <h2>جیب‌های ارزی</h2>
      <p className="w-help">
        هر ارز جیب جدای خودش را دارد و با ریال قاطی نمی‌شود. تبدیل همیشه از مسیر ریال می‌گذرد، چون واحد پایه کیف پول ریال
        است.
      </p>
      <ul className="w-pos">
        {FX_CURRENCIES.map((code) => {
          const units = positionOf(state, userId, code);
          return (
            <li key={code}>
              <span>
                <strong>{CURRENCIES[code].label}</strong>
                <small dir="ltr">
                  {code} · {formatQuantity(CURRENCIES[code].mid, 0)} ریال
                </small>
              </span>
              <b className="num">{formatQuantity(units, CURRENCIES[code].decimals)}</b>
              <small className="num">{formatRial(units * CURRENCIES[code].mid)}</small>
            </li>
          );
        })}
      </ul>

      {gate ? (
        <Gate message={gate} />
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!valid || amount === null) return;
            run(() => dispatch({ type: "FX_CONVERT", from, to, amount, key: crypto.randomUUID() }));
            setRaw("");
          }}
        >
          <div className="w-pair">
            <label className="w-field">
              از
              <select value={from} onChange={(event) => setFrom(event.target.value as CurrencyCode)}>
                <option value="IRR">ریال ایران</option>
                {FX_CURRENCIES.map((code) => (
                  <option key={code} value={code}>
                    {CURRENCIES[code].label}
                  </option>
                ))}
              </select>
            </label>
            <label className="w-field">
              به
              <select value={to} onChange={(event) => setTo(event.target.value as CurrencyCode)}>
                <option value="IRR">ریال ایران</option>
                {FX_CURRENCIES.map((code) => (
                  <option key={code} value={code}>
                    {CURRENCIES[code].label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="w-field">
            مقدار به {CURRENCIES[from].label}
            <input inputMode="decimal" autoComplete="off" value={raw} onChange={(event) => setRaw(event.target.value)} />
          </label>
          <p className="w-help">
            موجودی این جیب {formatQuantity(held, decimals)} {CURRENCIES[from].label}
          </p>
          {from === to ? <p className="w-warn">ارز مبدأ و مقصد یکی است.</p> : null}
          {amount !== null && !enough ? <p className="w-warn">موجودی این جیب کافی نیست.</p> : null}
          {quote ? (
            <>
              <dl className="w-confirm">
                <div>
                  <dt>ارزش سفارش</dt>
                  <dd className="num">{formatRial(notional)}</dd>
                </div>
                <div>
                  <dt>دریافتی برآوردی</dt>
                  <dd className="num">
                    {formatQuantity(receive, CURRENCIES[to].decimals)} {CURRENCIES[to].label}
                  </dd>
                </div>
              </dl>
              <FeeBreakdown quote={quote} gross={notional} />
            </>
          ) : null}
          <button className="btn" type="submit" disabled={!valid || busy}>
            {busy ? "در حال ثبت…" : "تبدیل"}
          </button>
        </form>
      )}
    </div>
  );
}

/* ----------------------------------- crypto ---------------------------------- */

function Crypto({ state, userId, dispatch, run, busy }: Omit<Props, "onOpen">) {
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [asset, setAsset] = useState<AssetCode>("USDT");
  const [raw, setRaw] = useState("");
  const gate = capabilityGate(state, userId, "CRYPTO");

  const info = ASSETS[asset];
  const amount = side === "BUY" ? parseAmount(raw) : parseDecimal(raw);
  const notional = amount ? (side === "BUY" ? amount : amount * info.price) : 0;
  const quote = notional > 0 ? cryptoFee(asset, notional) : null;
  const held = positionOf(state, userId, asset);
  const enough =
    amount === null ? false : side === "BUY" ? amount <= (state.balances[userId] ?? 0) : amount <= held;
  const receiveUnits = quote ? Math.max(0, notional - quote.total) / info.price : 0;
  const valid = amount !== null && amount > 0 && enough;

  return (
    <div className="w-block">
      <h2>رمزارز</h2>
      <p className="w-help">
        دارایی به‌صورت امانی نزد PayFlow نگهداری می‌شود و برداشت به کیف پول بیرونی در این نسخه نیست. قیمت مرجع لحظه‌ای است
        و سفارش با همان قیمت به‌علاوه اسپرد اجرا می‌شود.
      </p>
      <ul className="w-pos">
        {ASSET_CODES.map((code) => {
          const units = positionOf(state, userId, code);
          return (
            <li key={code}>
              <span>
                <strong>{ASSETS[code].label}</strong>
                <small dir="ltr">
                  {code} · {formatQuantity(ASSETS[code].price, 0)} ریال
                </small>
              </span>
              <b className="num">{formatQuantity(units, ASSETS[code].decimals)}</b>
              <small className="num">{formatRial(units * ASSETS[code].price)}</small>
            </li>
          );
        })}
      </ul>

      {gate ? (
        <Gate message={gate} />
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!valid || amount === null) return;
            run(() => dispatch({ type: "CRYPTO_ORDER", side, asset, amount, key: crypto.randomUUID() }));
            setRaw("");
          }}
        >
          <div className="w-seg" role="radiogroup" aria-label="سمت سفارش">
            <button
              type="button"
              role="radio"
              aria-checked={side === "BUY"}
              className={side === "BUY" ? "is-on" : ""}
              onClick={() => {
                setSide("BUY");
                setRaw("");
              }}
            >
              خرید
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={side === "SELL"}
              className={side === "SELL" ? "is-on" : ""}
              onClick={() => {
                setSide("SELL");
                setRaw("");
              }}
            >
              فروش
            </button>
          </div>
          <label className="w-field">
            رمزارز
            <select value={asset} onChange={(event) => setAsset(event.target.value as AssetCode)}>
              {ASSET_CODES.map((code) => (
                <option key={code} value={code}>
                  {ASSETS[code].label}
                </option>
              ))}
            </select>
          </label>
          <label className="w-field">
            {side === "BUY" ? "مبلغ به ریال" : `مقدار ${info.label}`}
            <input inputMode="decimal" autoComplete="off" value={raw} onChange={(event) => setRaw(event.target.value)} />
          </label>
          <p className="w-help">{info.note}</p>
          {amount !== null && !enough ? (
            <p className="w-warn">{side === "BUY" ? "موجودی ریالی کافی نیست." : "مقدار دارایی کافی نیست."}</p>
          ) : null}
          {quote ? (
            <>
              <dl className="w-confirm">
                <div>
                  <dt>ارزش سفارش</dt>
                  <dd className="num">{formatRial(notional)}</dd>
                </div>
                <div>
                  <dt>{side === "BUY" ? "دریافتی برآوردی" : "ریال دریافتی"}</dt>
                  <dd className="num">
                    {side === "BUY"
                      ? `${formatQuantity(receiveUnits, info.decimals)} ${info.label}`
                      : formatRial(notional - quote.total)}
                  </dd>
                </div>
              </dl>
              <FeeBreakdown quote={quote} gross={notional} />
            </>
          ) : null}
          <button className="btn" type="submit" disabled={!valid || busy}>
            {busy ? "در حال اجرای سفارش…" : side === "BUY" ? "خرید" : "فروش"}
          </button>
        </form>
      )}
    </div>
  );
}

/* --------------------------------- investment -------------------------------- */

function Funds({ state, userId, dispatch, run, busy, onOpen }: Props) {
  const [side, setSide] = useState<"BUY" | "REDEEM">("BUY");
  const [fund, setFund] = useState<FundCode>("PF-FIX");
  const [raw, setRaw] = useState("");
  const gate = capabilityGate(state, userId, "FUND");

  const info = FUNDS[fund];
  const amount = side === "BUY" ? parseAmount(raw) : parseDecimal(raw);
  const quote = side === "BUY" && amount ? fundBuyFee(amount) : null;
  const units = quote && amount ? Math.max(0, amount - quote.total) / info.nav : 0;
  const held = positionOf(state, userId, fund);
  const enough =
    amount === null ? false : side === "BUY" ? amount <= (state.balances[userId] ?? 0) : amount <= held;
  const valid = amount !== null && amount > 0 && enough;

  const settling = state.transactions.filter(
    (tx) => tx.status === "PENDING" && tx.parties.includes(userId) && (tx.type === "FUND_BUY" || tx.type === "FUND_REDEEM"),
  );

  return (
    <div className="w-block">
      <h2>صندوق سرمایه‌گذاری</h2>
      <p className="w-help">
        صدور و ابطال واحد در روز سفارش قطعی نمی‌شود. مبلغ یا واحد همان لحظه کنار گذاشته می‌شود و تسویه در روز کاری تعیین‌شده
        انجام می‌گیرد. بازده گذشته تضمین آینده نیست.
      </p>
      <ul className="w-pos">
        {FUND_CODES.map((code) => {
          const own = positionOf(state, userId, code);
          return (
            <li key={code}>
              <span>
                <strong>{FUNDS[code].label}</strong>
                <small>
                  {FUNDS[code].kind} · ریسک {FUNDS[code].risk} · بازده سال گذشته{" "}
                  {toPersianDigits((FUNDS[code].annualReturn * 100).toFixed(0))}٪
                </small>
              </span>
              <b className="num">{formatQuantity(own, 4)}</b>
              <small className="num">{formatRial(own * FUNDS[code].nav)}</small>
            </li>
          );
        })}
      </ul>

      {settling.length > 0 ? (
        <div className="w-settling">
          <p className="w-fee-head">در انتظار تسویه</p>
          {settling.map((tx) => (
            <div key={tx.id} className="w-settle-row">
              <span>
                <strong>{tx.type === "FUND_BUY" ? "صدور" : "ابطال"}</strong>
                <small>
                  {tx.leg ? `${formatUnits(tx.leg.units, tx.leg.instrument)} واحد` : ""} ·{" "}
                  <button className="w-linkish ref" type="button" dir="ltr" onClick={() => onOpen(tx.id)}>
                    {tx.reference}
                  </button>
                </small>
              </span>
              <button
                className="btn btn-ghost"
                type="button"
                onClick={() => run(() => dispatch({ type: "FUND_SETTLE", transactionId: tx.id }))}
              >
                اجرای تسویه
              </button>
            </div>
          ))}
          <p className="w-help">
            در محیط آزمایش، تسویه را دستی اجرا می‌کنید تا دو مرحله‌ای بودنش دیده شود. سطرهای تسویه به همان تراکنش اول
            می‌چسبند و رکورد تازه‌ای نمی‌سازند.
          </p>
        </div>
      ) : null}

      {gate ? (
        <Gate message={gate} />
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!valid || amount === null) return;
            run(() => dispatch({ type: "FUND_ORDER", side, fund, amount, key: crypto.randomUUID() }));
            setRaw("");
          }}
        >
          <div className="w-seg" role="radiogroup" aria-label="نوع سفارش صندوق">
            <button
              type="button"
              role="radio"
              aria-checked={side === "BUY"}
              className={side === "BUY" ? "is-on" : ""}
              onClick={() => {
                setSide("BUY");
                setRaw("");
              }}
            >
              صدور
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={side === "REDEEM"}
              className={side === "REDEEM" ? "is-on" : ""}
              onClick={() => {
                setSide("REDEEM");
                setRaw("");
              }}
            >
              ابطال
            </button>
          </div>
          <label className="w-field">
            صندوق
            <select value={fund} onChange={(event) => setFund(event.target.value as FundCode)}>
              {FUND_CODES.map((code) => (
                <option key={code} value={code}>
                  {FUNDS[code].label}
                </option>
              ))}
            </select>
          </label>
          <label className="w-field">
            {side === "BUY" ? "مبلغ به ریال" : "تعداد واحد"}
            <input inputMode="decimal" autoComplete="off" value={raw} onChange={(event) => setRaw(event.target.value)} />
          </label>
          <p className="w-help">
            ارزش هر واحد {formatRial(info.nav)} · تسویه {toPersianDigits(info.settlementDays)} روز کاری · واحد شما{" "}
            {formatQuantity(held, 4)}
          </p>
          {amount !== null && !enough ? (
            <p className="w-warn">{side === "BUY" ? "موجودی ریالی کافی نیست." : "تعداد واحد کافی نیست."}</p>
          ) : null}
          {quote ? (
            <>
              <dl className="w-confirm">
                <div>
                  <dt>واحد برآوردی</dt>
                  <dd className="num">{formatQuantity(units, 4)}</dd>
                </div>
              </dl>
              <FeeBreakdown quote={quote} gross={amount ?? 0} />
            </>
          ) : null}
          {side === "REDEEM" && amount !== null && amount > 0 ? (
            <p className="w-help">
              ارزش برآوردی {formatRial(amount * info.nav)}. کارمزد ابطال در زمان تسویه حساب می‌شود و اگر نگهداری کمتر از
              ۳۰ روز باشد، نرخ بالاتر است.
            </p>
          ) : null}
          <button className="btn" type="submit" disabled={!valid || busy}>
            {busy ? "در حال ثبت سفارش…" : side === "BUY" ? "ثبت صدور" : "ثبت ابطال"}
          </button>
        </form>
      )}
    </div>
  );
}
