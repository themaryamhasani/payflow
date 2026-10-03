const DIGITS = "۰۱۲۳۴۵۶۷۸۹";

export function toPersianDigits(value: string | number) {
  return String(value).replace(/\d/g, (digit) => DIGITS[Number(digit)] ?? digit);
}

export function formatGrouped(amount: number) {
  const safe = Math.trunc(Math.abs(amount));
  const grouped = safe.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "٬");
  return toPersianDigits(grouped);
}

export function formatRial(amount: number) {
  return `${formatGrouped(amount)} ریال`;
}

export function formatMillion(amount: number) {
  const million = amount / 1_000_000;
  const text = Number.isInteger(million) ? String(million) : million.toFixed(1).replace(".", "٫");
  return `${toPersianDigits(text)} میلیون`;
}

export function parseAmount(raw: string) {
  const normalized = raw
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[^\d]/g, "");
  if (!normalized) return null;
  const value = Number(normalized);
  if (!Number.isSafeInteger(value)) return null;
  return value;
}

/** Accepts Persian or Latin digits with either decimal mark. */
export function parseDecimal(raw: string) {
  const normalized = raw
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٫،,]/g, ".")
    .replace(/[^\d.]/g, "");
  if (!normalized || normalized === ".") return null;
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0) return null;
  return value;
}

export function formatQuantity(value: number, decimals: number) {
  if (!Number.isFinite(value)) return toPersianDigits("0");
  const fixed =
    decimals === 0
      ? String(Math.round(value))
      : value.toFixed(decimals).replace(/0+$/, "").replace(/\.$/, "");
  const [whole, fraction] = fixed.split(".");
  const grouped = (whole || "0").replace(/\B(?=(\d{3})+(?!\d))/g, "٬");
  return toPersianDigits(fraction ? `${grouped}٫${fraction}` : grouped);
}

export function maskMobile(mobile: string) {
  if (mobile.length < 11) return toPersianDigits(mobile);
  return toPersianDigits(`${mobile.slice(0, 4)}****${mobile.slice(-4)}`).replace(/\*/g, "•");
}

export function maskName(full: string) {
  const parts = full.trim().split(/\s+/);
  if (parts.length < 2) return full;
  return `${parts[0]?.slice(0, 1)}. ${parts.slice(1).join(" ")}`;
}

export function formatWhen(iso: string) {
  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function shortKey(key: string) {
  if (key.length <= 14) return key;
  return `${key.slice(0, 8)}…${key.slice(-4)}`;
}
