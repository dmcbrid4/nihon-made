import Link from "next/link";

export default function NotFound() {
  return (
    <div className="empty-state">
      <span className="eyebrow">A SMALL DETOUR</span>
      <h1>This page isn’t here.</h1>
      <p>Let’s get back to your Japanese.</p>
      <Link href="/" className="primary-button">
        Back to Today
      </Link>
    </div>
  );
}
