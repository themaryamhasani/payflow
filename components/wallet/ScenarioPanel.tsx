"use client";

import { SCENARIOS, type ScenarioId } from "@/lib/demo-scenarios";

export function ScenarioPanel({
  busy,
  onRun,
}: {
  busy: boolean;
  onRun: (id: ScenarioId) => void;
}) {
  return (
    <section className="w-scenarios" aria-labelledby="scenario-heading">
      <h2 id="scenario-heading">سناریوهای آماده</h2>
      <p className="w-help">
        برای نمایش سریع، یکی را بزنید. وضعیت فعلی ذخیره می‌شود؛ اگر خواستید از صفر شروع کنید، «بازنشانی» را بزنید.
      </p>
      <ul>
        {SCENARIOS.map((item) => (
          <li key={item.id}>
            <button type="button" disabled={busy} onClick={() => onRun(item.id)}>
              <strong>{item.title}</strong>
              <small>{item.summary}</small>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
