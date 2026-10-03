"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const LINKS = [
  { href: "/#problem", label: "مسئله" },
  { href: "/#journey", label: "مسیر" },
  { href: "/#flow", label: "دفترکل" },
  { href: "/#concurrency", label: "همزمانی" },
  { href: "/#layers", label: "لایه‌ها" },
  { href: "/#contract", label: "قرارداد" },
  { href: "/about", label: "کیس‌استادی" },
];

export function Header() {
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > window.innerHeight * 0.72);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const tone = solid || open ? "is-solid" : "is-ghost";

  return (
    <header className={`site-header ${tone}`}>
      <Link className="brand" href="/">
        <span className="serif brand-mark">PayFlow</span>
        <span className="brand-sub">کیف پول دیجیتال</span>
      </Link>
      <nav className="desk-nav" aria-label="بخش‌های صفحه">
        {LINKS.map((link) => (
          <Link key={link.href} href={link.href}>
            {link.label}
          </Link>
        ))}
      </nav>
      <Link className="btn btn-small header-cta" href="/wallet">
        گشودن کیف پول
      </Link>
      <button
        className="menu-btn"
        type="button"
        aria-expanded={open}
        aria-controls="site-menu"
        onClick={() => setOpen((value) => !value)}
      >
        {open ? "بستن" : "منو"}
      </button>
      {open ? (
        <div id="site-menu" className="mobile-menu">
          <nav aria-label="منوی همراه">
            {LINKS.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setOpen(false)}>
                {link.label}
              </Link>
            ))}
            <Link href="/#rules" onClick={() => setOpen(false)}>
              قواعد
            </Link>
            <Link href="/#glossary" onClick={() => setOpen(false)}>
              واژه‌نامه
            </Link>
            <Link className="btn" href="/wallet" onClick={() => setOpen(false)}>
              گشودن کیف پول
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
