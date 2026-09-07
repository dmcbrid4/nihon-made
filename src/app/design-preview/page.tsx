import { notFound } from "next/navigation";
import Link from "next/link";
import { LogoChoices } from "@/components/brand";

export default function DesignPreview() {
  if (process.env.NODE_ENV !== "development") notFound();
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">DESIGN REVIEW</span>
          <h1>Logo options</h1>
          <p>Choose a logo, then view it in the sidebar and study screens.</p>
        </div>
      </div>
      <LogoChoices />
      <section className="design-notes">
        <h2>What changed</h2>
        <p>
          Warmer paper, quieter borders, larger text, and an ink-and-red
          identity. The menus use plain labels; session details replace
          decorative messages.
        </p>
        <div className="preview-links">
          <Link className="text-link" href="/">
            Today →
          </Link>
          <Link className="text-link" href="/collection">
            Collection →
          </Link>
          <Link className="text-link" href="/settings">
            Settings →
          </Link>
          <Link className="text-link" href="/guest">
            Guest demo →
          </Link>
        </div>
        <p>
          Your choice is saved in this browser. Study progress is separate. This
          page is only available on the local development server.
        </p>
      </section>
    </>
  );
}
