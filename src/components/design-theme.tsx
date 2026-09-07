"use client";

import { useEffect, useSyncExternalStore } from "react";

const designOptions = [
  {
    id: "2",
    name: "Theme 2",
    description: "The current look: warm paper, dark ink, quieter borders.",
  },
  {
    id: "1",
    name: "Theme 1",
    description: "The original look: graph-paper background and blue ink.",
  },
] as const;
type DesignId = (typeof designOptions)[number]["id"];
const key = "nihon-made:design";

function readDesign(): DesignId {
  try {
    return localStorage.getItem(key) === "1" ? "1" : "2";
  } catch {
    return "2";
  }
}
function subscribe(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener("nihon-made:design", listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener("nihon-made:design", listener);
  };
}
const serverDesign = (): DesignId => "2";

export function DesignThemePicker() {
  const selected = useSyncExternalStore(subscribe, readDesign, serverDesign);
  useEffect(() => {
    const root = document.documentElement;
    if (selected === "1") root.dataset.design = "1";
    else delete root.dataset.design;
  }, [selected]);
  function choose(id: DesignId) {
    try {
      if (id === "1") localStorage.setItem(key, "1");
      else localStorage.removeItem(key);
    } catch {
      return;
    }
    window.dispatchEvent(new Event("nihon-made:design"));
  }
  return (
    <div className="design-options">
      {designOptions.map((option) => (
        <button
          key={option.id}
          type="button"
          className="design-option"
          aria-pressed={selected === option.id}
          onClick={() => choose(option.id)}
        >
          <strong>{option.name}</strong>
          <span>{option.description}</span>
          <span className="design-selection">
            {selected === option.id ? "Selected" : "Switch to this theme"}
          </span>
        </button>
      ))}
    </div>
  );
}
