"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

/** A password `<input>` with a show/hide toggle -- used anywhere someone has
 * to type a secret they can't easily verify by feel (an invite password, a
 * newly-chosen password with no autofill to double-check it). */
export function PasswordInput({
  id,
  value,
  onChange,
  autoComplete,
  required,
  minLength,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="password-field">
      <input
        id={id}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        minLength={minLength}
        required={required}
      />
      <button
        type="button"
        className="password-toggle"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}
