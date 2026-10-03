export function IconDebit() {
  return (
    <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 12h8M12 8l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

export function IconCredit() {
  return (
    <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M12 7v10M8 11l4-4 4 4" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

export function IconFail() {
  return (
    <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M9 9l6 6M15 9l-6 6" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

export function IconPending() {
  return (
    <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M12 7.5V12l3 2" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

export function TxIcon({ status, direction }: { status: string; direction: "DEBIT" | "CREDIT" }) {
  if (status === "FAILED" || status === "CANCELLED") return <IconFail />;
  if (status === "PENDING" || status === "PROCESSING" || status === "CREATED") return <IconPending />;
  if (direction === "DEBIT") return <IconDebit />;
  return <IconCredit />;
}
