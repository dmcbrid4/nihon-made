export function BrandMark() {
  return (
    <svg
      className="identity-mark identity-bookplate"
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M7 9h13l4 4 4-4h13v31H28l-4 3-4-3H7V9Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M24 13v28M12 19h7M12 25h7M29 25h7M29 31h7"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path d="M30 8h6v13l-3-2-3 2V8Z" fill="var(--accent)" />
    </svg>
  );
}

export function Brand({ subtitle = "Nihon Made" }: { subtitle?: string }) {
  return (
    <>
      <BrandMark />
      <span>
        <span className="brand-japanese" lang="ja">
          日本まで
        </span>
        <span className="brand-english">{subtitle}</span>
      </span>
    </>
  );
}
