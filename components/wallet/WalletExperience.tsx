"use client";

import Link from "next/link";
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { TxIcon } from "@/components/Icons";
import { FeeBreakdown, ResultBlock, Row, Tab, TxRow } from "@/components/wallet/parts";
import { Assets } from "@/components/wallet/screens/Assets";
import { CardScreen } from "@/components/wallet/screens/CardScreen";
import { Credit } from "@/components/wallet/screens/Credit";
import { Identity } from "@/components/wallet/screens/Identity";
import { MerchantScreen } from "@/components/wallet/screens/MerchantScreen";
import { Remittance } from "@/components/wallet/screens/Remittance";
import { Services, type ServiceKey } from "@/components/wallet/screens/Services";
import {
  formatGrouped,
  formatRial,
  formatWhen,
  maskMobile,
  maskName,
  parseAmount,
  shortKey,
  toPersianDigits,
} from "@/lib/format";
import { prefersReducedMotion } from "@/lib/motion";
import { TIERS, instrumentLabel } from "@/lib/catalog";
import {
  DEMO_MOBILE,
  DEMO_SECRET,
  DESCRIPTION_MAX,
  SECRET_MIN,
  TOPUP_MAX,
  TOPUP_MIN,
  availableBalance,
  counterpartyMasked,
  createState,
  currentUser,
  currentWallet,
  dailyUsed,
  directionFor,
  directoryFor,
  effectLabel,
  formatUnits,
  outstandingDebt,
  portfolioValue,
  reducer,
  statusLabel,
  statusNote,
  tierOf,
  txStatusLabel,
  txTypeLabel,
  visibleTransactions,
  walletBalance,
  type Account,
  type ResultView,
  type Transaction,
  type TxStatus,
  type TxType,
  type WalletState,
  type WalletStatus,
} from "@/lib/wallet-state";

type Screen =
  | "home"
  | "history"
  | "detail"
  | "topup"
  | "transfer"
  | "ops"
  | "assets"
  | "services"
  | "identity"
  | "credit"
  | "card"
  | "remit"
  | "merchant";

const SERVICE_SCREENS: Record<ServiceKey, Screen> = {
  identity: "identity",
  credit: "credit",
  card: "card",
  remit: "remit",
  merchant: "merchant",
};
type TopupStep = "form" | "review" | "after";
type TransferStep = "who" | "amount" | "confirm" | "after";

const PAGE_SIZE = 5;

export function WalletExperience() {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  if (!ready) {
    return (
      <main id="content" className="w-boot">
        <p className="serif">PayFlow</p>
        <p role="status">در حال گشودن کیف پول…</p>
      </main>
    );
  }
  return <WalletApp />;
}

function WalletApp() {
  const [state, dispatch] = useReducer(reducer, undefined, () => createState(new Date()));
  const [screen, setScreen] = useState<Screen>("home");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [notesOpen, setNotesOpen] = useState(false);
  const [topupStep, setTopupStep] = useState<TopupStep>("form");
  const [transferStep, setTransferStep] = useState<TransferStep>("who");
  const [amountRaw, setAmountRaw] = useState("");
  const [description, setDescription] = useState("");
  const [receiverId, setReceiverId] = useState("");
  const [transferKey, setTransferKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [typeFilter, setTypeFilter] = useState<"ALL" | TxType>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | TxStatus>("ALL");
  const [range, setRange] = useState<"all" | "today" | "week">("all");
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [reason, setReason] = useState("");
  const [reverseId, setReverseId] = useState("");
  const [reverseReason, setReverseReason] = useState("");
  const timers = useRef<number[]>([]);

  const user = currentUser(state);
  const wallet = currentWallet(state);
  const rows = useMemo(() => visibleTransactions(state), [state]);
  const [nextStatus, setNextStatus] = useState<WalletStatus>("SUSPENDED");

  useEffect(
    () => () => {
      timers.current.forEach((id) => window.clearTimeout(id));
    },
    [],
  );

  useEffect(() => {
    if (!notesOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setNotesOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [notesOpen]);

  if (!user || !wallet) {
    return (
      <AuthGate
        error={state.authError}
        onLogin={(mobile, secret) => dispatch({ type: "LOGIN", mobile, secret })}
        onRegister={(name, mobile, secret) => dispatch({ type: "REGISTER", name, mobile, secret })}
        onClearError={() => dispatch({ type: "CLEAR_AUTH_ERROR" })}
      />
    );
  }

  const balance = walletBalance(state);
  const available = availableBalance(state);
  const used = dailyUsed(state);
  const remaining = Math.max(0, wallet.dailyLimit - used);
  const notices = state.notices.filter((notice) => notice.userId === user.id);
  const unread = notices.filter((notice) => !notice.read).length;
  const directory = directoryFor(state);
  const pendingTx =
    rows.find((tx) => tx.status === "PENDING" && tx.paymentId) ?? null;
  const resultTx = rows.find((tx) => tx.id === state.lastResult?.transactionId) ?? null;
  const inServices =
    screen === "services" ||
    screen === "identity" ||
    screen === "credit" ||
    screen === "card" ||
    screen === "remit" ||
    screen === "merchant";
  const screenProps = { state, userId: user.id, dispatch, run: withProcessing, busy, onOpen: openDetail };

  function openDetail(id: string) {
    setDetailId(id);
    setScreen("detail");
    setNotesOpen(false);
  }

  function goHome() {
    setScreen("home");
    setTopupStep("form");
    setTransferStep("who");
    setAmountRaw("");
    setDescription("");
    setBusy(false);
  }

  function go(next: Screen) {
    setScreen(next);
    setBusy(false);
    if (next === "history") setPage(1);
  }

  function withProcessing(run: () => void) {
    if (busy) return;
    setBusy(true);
    const delay = prefersReducedMotion() ? 0 : 520;
    const id = window.setTimeout(() => {
      run();
      setBusy(false);
    }, delay);
    timers.current.push(id);
  }

  return (
    <div className="w-app">
      <header className="w-top">
        <div className="w-bar">
          <Link className="w-back" href="/">
            معرفی
          </Link>
          <button className="w-mark serif" type="button" onClick={goHome}>
            PayFlow
          </button>
          <div className="w-spacer" />
          <div className="w-bell">
            <button
              type="button"
              aria-expanded={notesOpen}
              aria-controls="notices"
              onClick={() => {
                setNotesOpen((open) => !open);
                dispatch({ type: "READ_NOTICES" });
              }}
            >
              اعلان
              {unread > 0 ? <span className="w-badge">{toPersianDigits(unread)}</span> : null}
            </button>
            {notesOpen ? (
              <div id="notices" className="w-notes">
                <strong>اعلان‌ها</strong>
                {notices.length === 0 ? <p>اعلانی نیست.</p> : null}
                {notices.slice(0, 6).map((notice) => (
                  <button
                    key={notice.id}
                    type="button"
                    onClick={() => notice.transactionId && openDetail(notice.transactionId)}
                  >
                    <span>{notice.title}</span>
                    <small>{notice.body}</small>
                    <small className={notice.delivery === "RETRYING" ? "w-warn" : ""}>
                      {notice.delivery === "RETRYING"
                        ? "ارسال ناموفق · در صف تلاش دوباره · تراکنش مالی برنگشت"
                        : "ارسال شد"}
                    </small>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div className="w-identity">
            <strong>{user.name}</strong>
            <span dir="ltr">{maskMobile(user.mobile)}</span>
          </div>
          <button className="w-linkish" type="button" onClick={() => dispatch({ type: "LOGOUT" })}>
            خروج
          </button>
        </div>
      </header>

      <main id="content" className="w-shell">
        <p className="w-banner">محیط آزمایش · تراکنش واقعی انجام نمی‌شود · واحد پول ریال</p>
        <nav className="w-tabs" aria-label="بخش‌های کیف پول">
          <Tab on={screen === "home" || screen === "topup" || screen === "transfer"} onClick={goHome}>
            کیف پول
          </Tab>
          <Tab on={screen === "assets"} onClick={() => go("assets")}>
            دارایی‌ها
          </Tab>
          <Tab on={inServices} onClick={() => go("services")}>
            خدمات
          </Tab>
          <Tab on={screen === "history" || screen === "detail"} onClick={() => go("history")}>
            تاریخچه
          </Tab>
          <Tab on={screen === "ops"} onClick={() => go("ops")}>
            عملیات
          </Tab>
        </nav>

        {screen === "home" ? (
          <Home
            state={state}
            userId={user.id}
            balance={balance}
            available={available}
            remaining={remaining}
            recent={rows.slice(0, 4)}
            onTopup={() => {
              setAmountRaw("");
              setTopupStep("form");
              setScreen("topup");
            }}
            onTransfer={() => {
              setAmountRaw("");
              setDescription("");
              setReceiverId(directory[0]?.id ?? "");
              setTransferStep("who");
              setScreen("transfer");
            }}
            onOpen={openDetail}
            onAll={() => go("history")}
          />
        ) : null}

        {screen === "topup" ? (
          <Topup
            wallet={wallet}
            step={topupStep}
            busy={busy}
            amountRaw={amountRaw}
            setAmountRaw={setAmountRaw}
            pendingTx={pendingTx}
            result={state.lastResult}
            onReview={() => setTopupStep("review")}
            onBegin={() =>
              withProcessing(() => {
                dispatch({ type: "TOPUP_BEGIN", amount: parseAmount(amountRaw) ?? 0 });
                setTopupStep("after");
              })
            }
            onCallback={(outcome) => {
              const paymentId = pendingTx?.paymentId;
              if (!paymentId) return;
              withProcessing(() => dispatch({ type: "TOPUP_CALLBACK", paymentId, outcome }));
            }}
            onCancel={() => {
              const paymentId = pendingTx?.paymentId;
              if (!paymentId) {
                goHome();
                return;
              }
              dispatch({ type: "TOPUP_CANCEL", paymentId });
            }}
            onReplay={() => {
              const paymentId = resultTx?.paymentId;
              if (!paymentId) return;
              dispatch({ type: "TOPUP_CALLBACK", paymentId, outcome: "SUCCESS" });
            }}
            onBack={() => {
              if (topupStep === "review") setTopupStep("form");
              else goHome();
            }}
            onView={() => resultTx && openDetail(resultTx.id)}
            canReplay={Boolean(resultTx?.paymentId)}
          />
        ) : null}

        {screen === "transfer" ? (
          <Transfer
            wallet={wallet}
            directory={directory}
            step={transferStep}
            busy={busy}
            receiverId={receiverId}
            setReceiverId={setReceiverId}
            amountRaw={amountRaw}
            setAmountRaw={setAmountRaw}
            description={description}
            setDescription={setDescription}
            available={available}
            remaining={remaining}
            transferKey={transferKey}
            result={state.lastResult}
            onAmount={() => setTransferStep("amount")}
            onConfirm={() => {
              setTransferKey(crypto.randomUUID());
              setTransferStep("confirm");
            }}
            onInvalid={(id) => {
              dispatch({
                type: "TRANSFER",
                receiverId: id,
                amount: 10_000,
                description: "",
                key: crypto.randomUUID(),
              });
              setTransferStep("after");
            }}
            onSubmit={() =>
              withProcessing(() => {
                dispatch({
                  type: "TRANSFER",
                  receiverId,
                  amount: parseAmount(amountRaw) ?? 0,
                  description,
                  key: transferKey,
                });
                setTransferStep("after");
              })
            }
            onReplay={() =>
              dispatch({
                type: "TRANSFER",
                receiverId,
                amount: parseAmount(amountRaw) ?? 0,
                description,
                key: transferKey,
              })
            }
            onBack={() => {
              if (transferStep === "confirm") setTransferStep("amount");
              else if (transferStep === "amount") setTransferStep("who");
              else goHome();
            }}
            onView={openDetail}
          />
        ) : null}

        {screen === "history" ? (
          <History
            state={state}
            userId={user.id}
            rows={rows}
            typeFilter={typeFilter}
            statusFilter={statusFilter}
            range={range}
            page={page}
            onType={(value) => {
              setTypeFilter(value);
              setPage(1);
            }}
            onStatus={(value) => {
              setStatusFilter(value);
              setPage(1);
            }}
            onRange={(value) => {
              setRange(value);
              setPage(1);
            }}
            onPage={setPage}
            onOpen={openDetail}
            onTopup={() => {
              setAmountRaw("");
              setTopupStep("form");
              setScreen("topup");
            }}
          />
        ) : null}

        {screen === "detail" ? (
          <Detail
            state={state}
            userId={user.id}
            tx={rows.find((item) => item.id === detailId) ?? null}
            onBack={() => setScreen("history")}
            onOpen={openDetail}
          />
        ) : null}

        {screen === "ops" ? (
          <Ops
            state={state}
            userId={user.id}
            wallet={wallet}
            rows={rows}
            query={query}
            setQuery={setQuery}
            nextStatus={nextStatus}
            setNextStatus={setNextStatus}
            reason={reason}
            setReason={setReason}
            reverseId={reverseId}
            setReverseId={setReverseId}
            reverseReason={reverseReason}
            setReverseReason={setReverseReason}
            onStatus={() => {
              dispatch({ type: "CHANGE_STATUS", status: nextStatus, reason });
              setReason("");
            }}
            onReverse={() => {
              dispatch({ type: "REVERSE", transactionId: reverseId, reason: reverseReason });
              setReverseReason("");
            }}
            onOpen={openDetail}
          />
        ) : null}

        {screen === "assets" ? <Assets {...screenProps} /> : null}

        {screen === "services" ? (
          <Services state={state} userId={user.id} onOpenService={(key) => go(SERVICE_SCREENS[key])} />
        ) : null}

        {screen === "identity" ? <Identity {...screenProps} onBack={() => go("services")} /> : null}
        {screen === "credit" ? <Credit {...screenProps} onBack={() => go("services")} /> : null}
        {screen === "card" ? <CardScreen {...screenProps} onBack={() => go("services")} /> : null}
        {screen === "remit" ? <Remittance {...screenProps} onBack={() => go("services")} /> : null}
        {screen === "merchant" ? <MerchantScreen {...screenProps} onBack={() => go("services")} /> : null}
      </main>

      <nav className="w-bottom" aria-label="ناوبری کیف پول">
        <button
          type="button"
          className={screen === "home" || screen === "topup" || screen === "transfer" ? "is-on" : ""}
          onClick={goHome}
        >
          کیف پول
        </button>
        <button type="button" className={screen === "assets" ? "is-on" : ""} onClick={() => go("assets")}>
          دارایی‌ها
        </button>
        <button type="button" className={inServices ? "is-on" : ""} onClick={() => go("services")}>
          خدمات
        </button>
        <button type="button" className={screen === "history" || screen === "detail" ? "is-on" : ""} onClick={() => go("history")}>
          تاریخچه
        </button>
        <button type="button" className={screen === "ops" ? "is-on" : ""} onClick={() => go("ops")}>
          عملیات
        </button>
      </nav>
    </div>
  );
}

function AuthGate({
  error,
  onLogin,
  onRegister,
  onClearError,
}: {
  error: string | null;
  onLogin: (mobile: string, secret: string) => void;
  onRegister: (name: string, mobile: string, secret: string) => void;
  onClearError: () => void;
}) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [secret, setSecret] = useState("");

  function swap(next: "login" | "register") {
    setMode(next);
    setSecret("");
    onClearError();
  }

  return (
    <main id="content" className="w-auth">
      <div className="w-auth-side">
        <Link className="serif w-auth-mark" href="/">
          PayFlow
        </Link>
        <h1>برای دیدن کیف پول، وارد شوید.</h1>
        <p>
          دسترسی به موجودی و تراکنش فقط برای صاحب همان کیف پول است. ورود نمونه با حساب موجود، یا ثبت‌نام تازه که یک کیف پول
          خالی می‌سازد و مسیر اولین شارژ را نشان می‌دهد.
        </p>
        <dl className="w-demo">
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
      </div>

      <div className="w-auth-form">
        <div className="w-auth-tabs" role="tablist" aria-label="ورود یا ثبت‌نام">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "login"}
            className={mode === "login" ? "is-on" : ""}
            onClick={() => swap("login")}
          >
            ورود
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "register"}
            className={mode === "register" ? "is-on" : ""}
            onClick={() => swap("register")}
          >
            ثبت‌نام
          </button>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (mode === "login") onLogin(mobile, secret);
            else onRegister(name, mobile, secret);
          }}
        >
          {mode === "register" ? (
            <label className="w-field">
              نام و نام خانوادگی
              <input value={name} autoComplete="name" onChange={(event) => setName(event.target.value)} required />
            </label>
          ) : null}
          <label className="w-field">
            موبایل
            <input
              value={mobile}
              inputMode="numeric"
              autoComplete="username"
              dir="ltr"
              placeholder="09xxxxxxxxx"
              onChange={(event) => setMobile(event.target.value)}
              required
            />
          </label>
          <label className="w-field">
            گذرواژه
            <input
              type="password"
              value={secret}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              dir="ltr"
              onChange={(event) => setSecret(event.target.value)}
              required
            />
          </label>
          {error ? (
            <p className="w-warn" role="alert">
              {error}
            </p>
          ) : null}
          <p className="w-help">
            {mode === "register"
              ? `گذرواژه دست‌کم ${toPersianDigits(SECRET_MIN)} نویسه. گذرواژه ذخیره نمی‌شود؛ فقط حاصل درهم‌سازی مقاوم نگه داشته می‌شود.`
              : "اگر اطلاعات نادرست باشد، پیام خطا نمی‌گوید کدام بخش اشتباه است."}
          </p>
          <button className="btn" type="submit">
            {mode === "login" ? "ورود" : "ساخت حساب و کیف پول"}
          </button>
        </form>
        {mode === "login" ? (
          <button
            className="w-linkish"
            type="button"
            onClick={() => {
              setMobile(DEMO_MOBILE);
              setSecret(DEMO_SECRET);
              onClearError();
            }}
          >
            پر کردن اطلاعات نمونه
          </button>
        ) : null}
      </div>
    </main>
  );
}

function Home({
  state,
  userId,
  balance,
  available,
  remaining,
  recent,
  onTopup,
  onTransfer,
  onOpen,
  onAll,
}: {
  state: WalletState;
  userId: string;
  balance: number;
  available: number;
  remaining: number;
  recent: Transaction[];
  onTopup: () => void;
  onTransfer: () => void;
  onOpen: (id: string) => void;
  onAll: () => void;
}) {
  const wallet = currentWallet(state)!;
  const inactive = wallet.status !== "ACTIVE";
  const empty = recent.length === 0;
  const holdings = portfolioValue(state, userId) - balance;
  const debt = outstandingDebt(state, userId);
  const tier = tierOf(state, userId);

  return (
    <section>
      <div className="w-balance">
        <p>
          موجودی ثبت‌شده · <span dir="ltr">{wallet.currency}</span>
        </p>
        <strong className="num">
          {formatGrouped(balance)}
          <small>ریال</small>
        </strong>
        <span className="w-status" data-status={wallet.status}>
          {statusLabel(wallet.status)}
        </span>
        <span className="w-tier">سطح {TIERS[tier].label}</span>
        <div className="w-available">
          <span>قابل استفاده برای انتقال</span>
          <b className="num">{formatRial(available)}</b>
        </div>
        <div className="w-available">
          <span>مانده سقف امروز</span>
          <b className="num">{formatRial(remaining)}</b>
        </div>
        {holdings > 0 ? (
          <div className="w-available">
            <span>دارایی غیرریالی، برآورد</span>
            <b className="num">{formatRial(holdings)}</b>
          </div>
        ) : null}
        {debt > 0 ? (
          <div className="w-available">
            <span>بدهی اعتبار</span>
            <b className="num">−{formatGrouped(debt)}</b>
          </div>
        ) : null}
        {holdings > 0 || debt > 0 ? (
          <div className="w-available w-net">
            <span>دارایی خالص</span>
            <b className="num">{formatRial(balance + holdings - debt)}</b>
          </div>
        ) : null}
        <details className="details-quiet">
          <summary>تفاوت این عددها</summary>
          <p>
            موجودی ثبت‌شده همان ریال نقد کیف پول است. قابل استفاده بخشی است که همین حالا می‌توان با آن انتقال داد. دارایی
            غیرریالی با نرخ مرجع برآورد می‌شود و نقد نیست. بدهی اعتبار از دارایی خالص کم می‌شود، چون پولی است که باید
            برگردانید. سقف روزانه از سطح احراز هویت می‌آید، نه از موجودی.
          </p>
        </details>
      </div>
      {inactive ? <p className="w-alert">{statusNote(wallet.status)}</p> : null}
      <div className="w-actions">
        <button className="btn" type="button" disabled={wallet.status === "CLOSED"} onClick={onTopup}>
          شارژ کیف پول
        </button>
        <button className="btn btn-ghost" type="button" disabled={inactive || balance === 0} onClick={onTransfer}>
          انتقال وجه
        </button>
      </div>
      {balance === 0 && !inactive ? (
        <p className="w-help">برای انتقال، اول کیف پول را شارژ کنید.</p>
      ) : null}
      <div className="w-block">
        <h2>تراکنش‌های اخیر</h2>
        {empty ? (
          <div className="w-empty">
            <p>هنوز تراکنشی ندارید.</p>
            <p className="w-help">اولین شارژ موفق، کیف پول شما را فعال می‌کند و از همان لحظه در تاریخچه رد می‌گذارد.</p>
          </div>
        ) : null}
        {recent.map((tx) => (
          <TxRow key={tx.id} state={state} userId={userId} tx={tx} onOpen={onOpen} />
        ))}
        {empty ? null : (
          <button className="w-linkish" type="button" onClick={onAll}>
            همه تراکنش‌ها
          </button>
        )}
      </div>
    </section>
  );
}

function Topup({
  wallet,
  step,
  busy,
  amountRaw,
  setAmountRaw,
  pendingTx,
  result,
  onReview,
  onBegin,
  onCallback,
  onCancel,
  onReplay,
  onBack,
  onView,
  canReplay,
}: {
  wallet: ReturnType<typeof currentWallet>;
  step: TopupStep;
  busy: boolean;
  amountRaw: string;
  setAmountRaw: (value: string) => void;
  pendingTx: Transaction | null;
  result: ResultView | null;
  onReview: () => void;
  onBegin: () => void;
  onCallback: (outcome: "SUCCESS" | "FAILED") => void;
  onCancel: () => void;
  onReplay: () => void;
  onBack: () => void;
  onView: () => void;
  canReplay: boolean;
}) {
  const amount = parseAmount(amountRaw);
  const valid = amount !== null && amount >= TOPUP_MIN && amount <= TOPUP_MAX;
  const waiting = step === "after" && pendingTx !== null;

  return (
    <section className="w-flow">
      <button className="w-linkish" type="button" onClick={waiting ? onCancel : onBack}>
        بازگشت
      </button>
      <p className="w-steps">شارژ کیف پول</p>

      {step === "form" ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (valid) onReview();
          }}
        >
          <h2>مبلغ شارژ</h2>
          <label className="w-field">
            مبلغ به ریال
            <input inputMode="numeric" autoComplete="off" value={amountRaw} onChange={(event) => setAmountRaw(event.target.value)} />
          </label>
          <p className="w-help">{amount ? formatRial(amount) : "عدد را به فارسی یا انگلیسی وارد کنید."}</p>
          {!valid && amountRaw ? (
            <p className="w-warn">
              مبلغ باید بین {formatRial(TOPUP_MIN)} و {formatRial(TOPUP_MAX)} باشد.
            </p>
          ) : null}
          <button className="btn" type="submit" disabled={!valid || wallet?.status === "CLOSED"}>
            ادامه
          </button>
        </form>
      ) : null}

      {step === "review" && amount ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onBegin();
          }}
        >
          <h2>بازبینی شارژ</h2>
          <dl className="w-confirm">
            <Row k="مبلغ" v={formatRial(amount)} />
            <Row k="کارمزد" v={formatRial(0)} />
            <Row k="جمع" v={formatRial(amount)} />
          </dl>
          <p className="w-help">اول رکورد پرداخت در انتظار ساخته می‌شود. تا تأیید درگاه، موجودی تغییر نمی‌کند.</p>
          <div className="w-actions">
            <button className="btn" type="submit" disabled={busy}>
              {busy ? "در حال ساخت پرداخت…" : "ادامه به درگاه"}
            </button>
            <button className="btn btn-ghost" type="button" onClick={onBack}>
              ویرایش مبلغ
            </button>
          </div>
        </form>
      ) : null}

      {waiting && pendingTx ? (
        <div className="w-gateway">
          <p className="serif">درگاه آزمایشی</p>
          <p>پذیرنده: PayFlow</p>
          <p className="w-result-amount num">{formatRial(pendingTx.amount)}</p>
          <p>
            مرجع پرداخت{" "}
            <span className="ref" dir="ltr">
              {pendingTx.reference}
            </span>
          </p>
          <p>این صفحه به‌جای درگاه واقعی است. تأیید موفق یعنی یک‌بار بستانکار شدن. ناموفق یعنی موجودی دست نمی‌خورد.</p>
          <div className="w-actions">
            <button className="btn btn-light" type="button" disabled={busy} onClick={() => onCallback("SUCCESS")}>
              {busy ? "در حال بررسی تأیید…" : "پرداخت موفق"}
            </button>
            <button className="btn btn-ghost on-dark" type="button" disabled={busy} onClick={() => onCallback("FAILED")}>
              پرداخت ناموفق
            </button>
            <button className="text-btn" type="button" onClick={onCancel}>
              انصراف
            </button>
          </div>
        </div>
      ) : null}

      {step === "after" && !waiting && result ? (
        <ResultBlock result={result} onBack={onBack} onView={result.transactionId ? onView : undefined}>
          {canReplay ? (
            <div className="w-sandbox">
              <p>در محیط آزمایش می‌توانید رسیدن دوباره پیام درگاه را ببینید.</p>
              <button className="btn btn-ghost" type="button" onClick={onReplay}>
                ارسال دوباره تأیید درگاه
              </button>
            </div>
          ) : null}
        </ResultBlock>
      ) : null}
    </section>
  );
}

function Transfer({
  wallet,
  directory,
  step,
  busy,
  receiverId,
  setReceiverId,
  amountRaw,
  setAmountRaw,
  description,
  setDescription,
  available,
  remaining,
  transferKey,
  result,
  onAmount,
  onConfirm,
  onInvalid,
  onSubmit,
  onReplay,
  onBack,
  onView,
}: {
  wallet: ReturnType<typeof currentWallet>;
  directory: Account[];
  step: TransferStep;
  busy: boolean;
  receiverId: string;
  setReceiverId: (id: string) => void;
  amountRaw: string;
  setAmountRaw: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  available: number;
  remaining: number;
  transferKey: string;
  result: ResultView | null;
  onAmount: () => void;
  onConfirm: () => void;
  onInvalid: (id: string) => void;
  onSubmit: () => void;
  onReplay: () => void;
  onBack: () => void;
  onView: (id: string) => void;
}) {
  const amount = parseAmount(amountRaw);
  const receiver = directory.find((person) => person.id === receiverId) ?? null;
  const nearLimit = amount !== null && amount > 0 && amount <= remaining && amount >= remaining * 0.8 && remaining > 0;
  const canContinue =
    wallet?.status === "ACTIVE" && amount !== null && amount > 0 && description.length <= DESCRIPTION_MAX;

  return (
    <section className="w-flow">
      <button className="w-linkish" type="button" onClick={onBack}>
        بازگشت
      </button>
      <p className="w-steps">انتقال وجه</p>

      {step === "who" ? (
        <div>
          <h2>گیرنده را انتخاب کنید</h2>
          <div className="w-choices" role="radiogroup" aria-label="گیرنده">
            {directory.map((person) => (
              <button
                key={person.id}
                type="button"
                role="radio"
                aria-checked={receiverId === person.id}
                className={receiverId === person.id ? "is-on" : ""}
                onClick={() => setReceiverId(person.id)}
              >
                <span>{person.name}</span>
                <span dir="ltr">{maskMobile(person.mobile)}</span>
              </button>
            ))}
          </div>
          <div className="w-actions">
            <button className="btn" type="button" onClick={onAmount} disabled={!receiver}>
              ادامه
            </button>
          </div>
          <details className="details-quiet">
            <summary>دیدن رد شدن گیرنده نامعتبر</summary>
            <div className="w-actions">
              <button className="btn btn-ghost" type="button" onClick={() => onInvalid("USR-4040")}>
                شناسه ناشناس
              </button>
            </div>
          </details>
        </div>
      ) : null}

      {step === "amount" && receiver ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (canContinue) onConfirm();
          }}
        >
          <h2>مبلغ</h2>
          <p className="w-help">
            به {receiver.name} · <span dir="ltr">{maskMobile(receiver.mobile)}</span>
          </p>
          <label className="w-field">
            مبلغ به ریال
            <input inputMode="numeric" autoComplete="off" value={amountRaw} onChange={(event) => setAmountRaw(event.target.value)} />
          </label>
          <label className="w-field">
            توضیح، اختیاری
            <input maxLength={DESCRIPTION_MAX} value={description} onChange={(event) => setDescription(event.target.value)} />
          </label>
          <p className="w-help">
            قابل استفاده {formatRial(available)} · مانده سقف امروز {formatRial(remaining)} از{" "}
            {formatRial(wallet?.dailyLimit ?? 0)}
          </p>
          {amount !== null && amount > available ? <p className="w-warn">مبلغ از موجودی قابل استفاده بیشتر است.</p> : null}
          {amount !== null && amount > remaining ? <p className="w-warn">این مبلغ از سقف روزانه عبور می‌کند.</p> : null}
          {nearLimit ? <p className="w-warn">این مبلغ به سقف روزانه نزدیک است.</p> : null}
          {wallet && wallet.status !== "ACTIVE" ? <p className="w-warn">{statusNote(wallet.status)}</p> : null}
          <button className="btn" type="submit" disabled={!canContinue}>
            بازبینی
          </button>
        </form>
      ) : null}

      {step === "confirm" && receiver && amount ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <h2>تأیید انتقال</h2>
          <dl className="w-confirm">
            <Row k="گیرنده" v={receiver.name} />
            <Row k="موبایل" v={maskMobile(receiver.mobile)} />
            <Row k="مبلغ" v={formatRial(amount)} />
            <Row k="کارمزد" v={formatRial(0)} />
            <Row k="جمع" v={formatRial(amount)} />
          </dl>
          <p className="w-help">
            کلید یکتاسازی{" "}
            <span className="ref" dir="ltr">
              {shortKey(transferKey)}
            </span>
          </p>
          {amount > available ? (
            <p className="w-warn">مبلغ از موجودی قابل استفاده بیشتر است. در صورت ادامه، درخواست رد می‌شود و موجودی تغییر نمی‌کند.</p>
          ) : null}
          {amount > remaining ? <p className="w-warn">این مبلغ از سقف روزانه عبور می‌کند.</p> : null}
          {nearLimit ? <p className="w-warn">این مبلغ به سقف روزانه نزدیک است.</p> : null}
          <div className="w-actions">
            <button className="btn" type="submit" disabled={busy}>
              {busy ? "در حال ثبت…" : "تأیید و انتقال"}
            </button>
            <button className="btn btn-ghost" type="button" onClick={onBack}>
              ویرایش
            </button>
          </div>
          <p className="w-help">دکمه تا پایان ثبت غیرفعال می‌شود، اما کنترل اصلی تکرار سمت سرور است.</p>
        </form>
      ) : null}

      {step === "after" && result ? (
        <ResultBlock
          result={result}
          onBack={onBack}
          onView={result.transactionId ? () => onView(result.transactionId!) : undefined}
        >
          {transferKey && result.code !== "INVALID_RECIPIENT" ? (
            <div className="w-sandbox">
              <p>تکرار همین درخواست باید همان نتیجه را بدهد و پول را دوباره حرکت ندهد.</p>
              <button className="btn btn-ghost" type="button" onClick={onReplay}>
                ارسال مجدد همین درخواست
              </button>
            </div>
          ) : null}
        </ResultBlock>
      ) : null}
    </section>
  );
}

function History({
  state,
  userId,
  rows,
  typeFilter,
  statusFilter,
  range,
  page,
  onType,
  onStatus,
  onRange,
  onPage,
  onOpen,
  onTopup,
}: {
  state: WalletState;
  userId: string;
  rows: Transaction[];
  typeFilter: "ALL" | TxType;
  statusFilter: "ALL" | TxStatus;
  range: "all" | "today" | "week";
  page: number;
  onType: (value: "ALL" | TxType) => void;
  onStatus: (value: "ALL" | TxStatus) => void;
  onRange: (value: "all" | "today" | "week") => void;
  onPage: (value: number) => void;
  onOpen: (id: string) => void;
  onTopup: () => void;
}) {
  const filtered = rows.filter((tx) => {
    if (typeFilter !== "ALL" && tx.type !== typeFilter) return false;
    if (statusFilter !== "ALL" && tx.status !== statusFilter) return false;
    return inRange(tx.createdAt, range);
  });
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pages);
  const slice = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <section>
      <h2>تاریخچه</h2>
      <p className="w-help">فقط تراکنش‌های همین کیف پول، از تازه‌ترین.</p>
      <div className="w-filters">
        <label className="w-field">
          بازه
          <select value={range} onChange={(event) => onRange(event.target.value as "all" | "today" | "week")}>
            <option value="all">همه</option>
            <option value="today">امروز</option>
            <option value="week">۷ روز اخیر</option>
          </select>
        </label>
        <label className="w-field">
          نوع
          <select value={typeFilter} onChange={(event) => onType(event.target.value as "ALL" | TxType)}>
            <option value="ALL">همه</option>
            <option value="TOP_UP">شارژ</option>
            <option value="TRANSFER">انتقال</option>
            <option value="REVERSAL">برگشت وجه</option>
            <option value="FX_CONVERT">تبدیل ارز</option>
            <option value="CRYPTO_BUY">خرید رمزارز</option>
            <option value="CRYPTO_SELL">فروش رمزارز</option>
            <option value="FUND_BUY">صدور واحد صندوق</option>
            <option value="FUND_REDEEM">ابطال واحد صندوق</option>
            <option value="REMITTANCE">حواله بین‌المللی</option>
            <option value="LOAN_DISBURSE">پرداخت اعتبار</option>
            <option value="INSTALLMENT">پرداخت قسط</option>
            <option value="CARD_ISSUE">صدور کارت</option>
            <option value="SETTLEMENT">تسویه پذیرنده</option>
          </select>
        </label>
        <label className="w-field">
          وضعیت
          <select value={statusFilter} onChange={(event) => onStatus(event.target.value as "ALL" | TxStatus)}>
            <option value="ALL">همه</option>
            <option value="SUCCESS">موفق</option>
            <option value="FAILED">ناموفق</option>
            <option value="PENDING">در انتظار</option>
            <option value="CANCELLED">لغو شده</option>
            <option value="REVERSED">برگشت‌خورده</option>
          </select>
        </label>
      </div>
      {rows.length === 0 ? (
        <div className="w-empty">
          <p>تاریخچه خالی است.</p>
          <button className="btn" type="button" onClick={onTopup}>
            شارژ کیف پول
          </button>
        </div>
      ) : null}
      {rows.length > 0 && slice.length === 0 ? <p className="w-empty">تراکنشی با این فیلتر نیست.</p> : null}
      {slice.map((tx) => (
        <TxRow key={tx.id} state={state} userId={userId} tx={tx} onOpen={onOpen} showCounterparty />
      ))}
      {filtered.length > PAGE_SIZE ? (
        <div className="w-pages">
          <button className="btn btn-ghost" type="button" disabled={safePage <= 1} onClick={() => onPage(safePage - 1)}>
            قبلی
          </button>
          <span className="num">
            {toPersianDigits(safePage)} / {toPersianDigits(pages)}
          </span>
          <button className="btn btn-ghost" type="button" disabled={safePage >= pages} onClick={() => onPage(safePage + 1)}>
            بعدی
          </button>
        </div>
      ) : null}
    </section>
  );
}

function inRange(iso: string, range: "all" | "today" | "week") {
  if (range === "all") return true;
  const time = new Date(iso).getTime();
  if (range === "today") {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return time >= start.getTime();
  }
  return Date.now() - time <= 7 * 86_400_000;
}

function Detail({
  state,
  userId,
  tx,
  onBack,
  onOpen,
}: {
  state: WalletState;
  userId: string;
  tx: Transaction | null;
  onBack: () => void;
  onOpen: (id: string) => void;
}) {
  if (!tx) {
    return (
      <section>
        <p>این تراکنش در کیف پول شما نیست.</p>
        <button className="btn" type="button" onClick={onBack}>
          بازگشت
        </button>
      </section>
    );
  }
  const linked = tx.reversalOf ?? tx.reversedBy;
  const linkedTx = linked ? state.transactions.find((item) => item.id === linked) : null;
  const ownLines = tx.ledger.filter((line) => !line.system);
  const systemLines = tx.ledger.filter((line) => line.system);

  return (
    <section className="w-detail">
      <button className="w-linkish" type="button" onClick={onBack}>
        بازگشت به تاریخچه
      </button>
      <h2>{txTypeLabel(tx, userId)}</h2>
      <dl>
        <Row k="مرجع" v={tx.reference} />
        <Row k="شناسه" v={tx.id} />
        <Row k="وضعیت" v={txStatusLabel(tx.status)} />
        <Row k="مبلغ" v={formatRial(tx.amount)} />
        <Row k="کارمزد" v={formatRial(tx.fee)} />
        {tx.leg ? (
          <>
            <Row k={`سمت ${instrumentLabel(tx.leg.instrument)}`} v={formatUnits(tx.leg.units, tx.leg.instrument)} />
            <Row k="نرخ اعمال‌شده" v={formatRial(tx.leg.rate)} />
          </>
        ) : null}
        <Row k="زمان" v={formatWhen(tx.createdAt)} />
        {tx.settlesAt ? <Row k="زمان تسویه" v={formatWhen(tx.settlesAt)} /> : null}
        <Row k="طرف مقابل" v={counterpartyMasked(state, tx, userId)} />
        <Row k="اثر" v={effectLabel(tx, userId)} />
        <Row k="رهگیری" v={tx.traceId} />
        {tx.description ? <Row k="توضیح" v={tx.description} /> : null}
        {tx.idempotencyKey ? <Row k="کلید یکتاسازی" v={shortKey(tx.idempotencyKey)} /> : null}
        {tx.code ? <Row k="کد" v={tx.code} /> : null}
      </dl>
      {tx.feeQuote ? <FeeBreakdown quote={tx.feeQuote} /> : null}
      {linkedTx ? (
        <p className="w-help">
          {tx.reversalOf ? "جبران تراکنش" : "تراکنش جبرانی"}{" "}
          <button className="w-linkish ref" type="button" dir="ltr" onClick={() => onOpen(linkedTx.id)}>
            {linkedTx.reference}
          </button>
        </p>
      ) : null}
      <h3>اثر بر دارایی</h3>
      {tx.ledger.length === 0 ? <p>سطر دفترکل نوشته نشد، چون دارایی تغییر نکرد.</p> : null}
      <div className="w-ledger">
        {ownLines.map((line) => (
          <LedgerRow key={line.id} line={line} userId={userId} />
        ))}
      </div>
      {systemLines.length > 0 ? (
        <details className="details-quiet">
          <summary>سطرهای دفترهای داخلی ({toPersianDigits(systemLines.length)})</summary>
          <p className="w-help">
            هر کارمزد و هر سمت تبدیل، سطر مقابل خودش را در دفترهای داخلی دارد. بدون این سطرها، دفترکل تراز نمی‌شد.
          </p>
          <div className="w-ledger">
            {systemLines.map((line) => (
              <LedgerRow key={line.id} line={line} userId={userId} />
            ))}
          </div>
        </details>
      ) : null}
    </section>
  );
}

function LedgerRow({ line, userId }: { line: Transaction["ledger"][number]; userId: string }) {
  const unit = line.instrument === "IRR" ? "ریال" : instrumentLabel(line.instrument);
  return (
    <article>
      <strong>
        {line.side === "DEBIT" ? "بدهکار" : "بستانکار"} ·{" "}
        {line.ownerId === userId ? line.ownerName : maskName(line.ownerName)}
        {line.instrument === "IRR" ? null : <span className="w-unit">{unit}</span>}
      </strong>
      <span className="num">
        {formatUnits(line.before, line.instrument)} ← {formatUnits(line.after, line.instrument)}
      </span>
    </article>
  );
}

function Ops({
  state,
  userId,
  wallet,
  rows,
  query,
  setQuery,
  nextStatus,
  setNextStatus,
  reason,
  setReason,
  reverseId,
  setReverseId,
  reverseReason,
  setReverseReason,
  onStatus,
  onReverse,
  onOpen,
}: {
  state: WalletState;
  userId: string;
  wallet: NonNullable<ReturnType<typeof currentWallet>>;
  rows: Transaction[];
  query: string;
  setQuery: (value: string) => void;
  nextStatus: WalletStatus;
  setNextStatus: (value: WalletStatus) => void;
  reason: string;
  setReason: (value: string) => void;
  reverseId: string;
  setReverseId: (value: string) => void;
  reverseReason: string;
  setReverseReason: (value: string) => void;
  onStatus: () => void;
  onReverse: () => void;
  onOpen: (id: string) => void;
}) {
  const user = currentUser(state)!;
  const q = query.trim().toLowerCase();
  const hits = rows.filter((tx) => {
    if (!q) return true;
    const blob = [tx.reference, tx.id, tx.traceId, user.name, user.id, user.mobile, tx.code ?? ""]
      .join(" ")
      .toLowerCase();
    return blob.includes(q);
  });
  const reversible = rows.filter((tx) => tx.status === "SUCCESS" && tx.type !== "REVERSAL");
  const result = state.opsResult;

  return (
    <section>
      <h2>نمای عملیات</h2>
      <p className="w-ops-note">
        این نما برای نقش مجاز است و اصل کمترین دسترسی را رعایت می‌کند. جستجو با مرجع، شناسه تراکنش، کد خطا یا کاربر انجام
        می‌شود. رکورد مالی از اینجا حذف نمی‌شود؛ برگشت وجه رکورد تازه‌ای می‌سازد که به تراکنش اصلی ارجاع دارد.
      </p>
      <label className="w-field">
        جستجو
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="PF… یا TX… یا نام" />
      </label>
      {hits.length === 0 ? <p className="w-empty">موردی یافت نشد.</p> : null}
      {hits.slice(0, 8).map((tx) => (
        <button className="w-hit" type="button" key={tx.id} onClick={() => onOpen(tx.id)}>
          <TxIcon status={tx.status} direction={directionFor(tx, userId)} />
          <span>
            <strong className="ref" dir="ltr">
              {tx.reference}
            </strong>
            <small>
              {txStatusLabel(tx.status)} · {formatWhen(tx.createdAt)} · {counterpartyMasked(state, tx, userId)}
            </small>
          </span>
          <b className="num">{formatGrouped(tx.amount)}</b>
        </button>
      ))}

      {result ? (
        <p className={result.tone === "bad" ? "w-alert w-alert-bad" : "w-alert"} role="status">
          <strong>{result.title}.</strong> {result.message}
        </p>
      ) : null}

      <form
        className="w-block"
        onSubmit={(event) => {
          event.preventDefault();
          if (reason.trim()) onStatus();
        }}
      >
        <h3>
          وضعیت کیف پول{" "}
          <span className="ref" dir="ltr">
            {wallet.id}
          </span>
        </h3>
        <p className="w-help">
          وضعیت فعلی {statusLabel(wallet.status)} · نسخه رکورد {toPersianDigits(wallet.version)}
        </p>
        <label className="w-field">
          وضعیت جدید
          <select value={nextStatus} onChange={(event) => setNextStatus(event.target.value as WalletStatus)}>
            <option value="ACTIVE">فعال</option>
            <option value="SUSPENDED">معلق</option>
            <option value="BLOCKED">مسدود</option>
            <option value="CLOSED">بسته</option>
          </select>
        </label>
        <label className="w-field">
          دلیل، الزامی
          <textarea value={reason} onChange={(event) => setReason(event.target.value)} required />
        </label>
        <button className="btn" type="submit" disabled={!reason.trim()}>
          ثبت تغییر وضعیت
        </button>
      </form>

      <form
        className="w-block"
        onSubmit={(event) => {
          event.preventDefault();
          if (reverseId && reverseReason.trim()) onReverse();
        }}
      >
        <h3>برگشت وجه</h3>
        <p className="w-help">
          عمل جبرانی اثر تراکنش اصلی را خنثی می‌کند، آن را حذف نمی‌کند. اگر موجودی طرف مقابل برای جبران کافی نباشد، درخواست رد
          می‌شود.
        </p>
        <label className="w-field">
          تراکنش موفق
          <select value={reverseId} onChange={(event) => setReverseId(event.target.value)} required>
            <option value="">انتخاب کنید</option>
            {reversible.map((tx) => (
              <option key={tx.id} value={tx.id}>
                {`${tx.reference} · ${txTypeLabel(tx, userId)} · ${formatGrouped(tx.amount)}`}
              </option>
            ))}
          </select>
        </label>
        <label className="w-field">
          دلیل، الزامی
          <textarea value={reverseReason} onChange={(event) => setReverseReason(event.target.value)} required />
        </label>
        <button className="btn" type="submit" disabled={!reverseId || !reverseReason.trim() || reversible.length === 0}>
          ثبت برگشت وجه
        </button>
      </form>

      <h3>ممیزی</h3>
      {state.audits.length === 0 ? <p className="w-help">در این نشست هنوز عملیات حساسی ثبت نشده است.</p> : null}
      <ul className="w-audits">
        {state.audits.map((audit) => (
          <li key={audit.id}>
            <strong>
              {audit.action === "WALLET_STATUS" ? "تغییر وضعیت کیف پول" : "برگشت وجه"} · {audit.from} ← {audit.to}
            </strong>
            <span>{audit.reason}</span>
            <small>
              {audit.actor} · <span className="ref">{audit.entity}</span> · {formatWhen(audit.createdAt)}
            </small>
          </li>
        ))}
      </ul>
    </section>
  );
}
