import type { ReactNode } from "react";

export function SectionHeading({
  index,
  kicker,
  title,
  children,
}: {
  index: string;
  kicker: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <header className="sec-head">
      <p className="sec-index">
        <span className="serif">{index}</span>
        <span>{kicker}</span>
      </p>
      <h2>{title}</h2>
      {children ? <div className="sec-lead">{children}</div> : null}
    </header>
  );
}
