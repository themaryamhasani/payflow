import Link from "next/link";

export default function NotFound() {
  return (
    <main id="content" className="missing">
      <p className="serif">PayFlow</p>
      <h1>این صفحه در دفتر نیست.</h1>
      <p>مسیر درخواستی وجود ندارد.</p>
      <Link className="btn" href="/">
        بازگشت به معرفی
      </Link>
    </main>
  );
}
