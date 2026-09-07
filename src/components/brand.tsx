"use client";

import { useSyncExternalStore } from "react";

export const logoOptions = [
  {
    id: "bookplate",
    name: "Bookplate",
    description: "An open page with a red bookmark. The default.",
  },
  {
    id: "margin",
    name: "Margin",
    description: "A spare 日 monogram with a red margin rule.",
  },
  {
    id: "index",
    name: "Index",
    description: "A compact tab, drawn like the edge of a reference book.",
  },
] as const;
type LogoStyle = (typeof logoOptions)[number]["id"];
const key = "nihon-made:logo-preview";

function readLogo(): LogoStyle {
  try {
    const value = localStorage.getItem(key);
    if (logoOptions.some((option) => option.id === value))
      return value as LogoStyle;
  } catch {
    /* The default works when storage is unavailable. */
  }
  return "bookplate";
}
function subscribe(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener("nihon-made:logo", listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener("nihon-made:logo", listener);
  };
}
const serverLogo = (): LogoStyle => "bookplate";

export function BrandMark({ variant }: { variant?: LogoStyle }) {
  const selected = useSyncExternalStore(subscribe, readLogo, serverLogo);
  const style = variant ?? selected;
  return (
    <svg
      className={`identity-mark identity-${style}`}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
    >
      {style === "bookplate" ? (
        <>
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
        </>
      ) : style === "margin" ? (
        <>
          <path
            d="M16 8h22v32H16V8Zm0 16h22"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path d="M7 8v32" stroke="var(--accent)" strokeWidth="3" />
        </>
      ) : (
        <>
          <path
            d="M9 7h22l8 8v26H9V7Z"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <path
            d="M31 7v9h8M17 21h14v12H17V21Zm0 6h14"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <path d="M6 13h6v9H6z" fill="var(--accent)" />
        </>
      )}
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

export function LogoChoices() {
  const selected = useSyncExternalStore(subscribe, readLogo, serverLogo);
  return (
    <div className="logo-options">
      {logoOptions.map((option) => (
        <button
          key={option.id}
          type="button"
          className="logo-option"
          aria-pressed={selected === option.id}
          onClick={() => {
            try {
              localStorage.setItem(key, option.id);
            } catch {
              return;
            }
            window.dispatchEvent(new Event("nihon-made:logo"));
          }}
        >
          <span className="brand">
            <BrandMark variant={option.id} />
            <span className="brand-japanese" lang="ja">
              日本まで
            </span>
          </span>
          <strong>{option.name}</strong>
          <span>{option.description}</span>
          <span className="logo-selection">
            {selected === option.id ? "Selected" : "Try this logo"}
          </span>
        </button>
      ))}
    </div>
  );
}
