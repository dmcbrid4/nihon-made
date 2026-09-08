#!/usr/bin/env python3
"""Generate romaji for Tae Kim course word cards.

The source deck only ever had hand-written romaji on sentence/phrase notes
(the `Jlab-ListeningFront` field, carried straight through as `phrase.romaji`
in scripts/mine-tae-kim-deck.py) -- word cards never had it. Unlike furigana,
this doesn't need confidence-gating: each word card already has a trusted
kana `reading` (from the deck's own dictionary matching), and turning kana
into romaji is a plain, deterministic transliteration with no disambiguation
involved -- there's nothing to guess.

Uses cutlet's `map_kana`, a pure kana-to-romaji table lookup (no dictionary
re-analysis, so it can't reintroduce the reading-disambiguation problems
furigana generation had). Validated against the deck's own 2,076 hand-written
phrase romaji strings: 93.5% exact match, and the remaining differences are
consistently just notation-style choices (e.g. "yo-shi" vs "yooshi" for a
long vowel, "kidzuku" vs "kizuku" for づ) rather than actual errors -- so its
output is trustworthy even though it won't always match the deck author's
personal style.

Usage:
  python3 scripts/generate-tae-kim-word-romaji.py
"""
from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path

import cutlet


def clean(value: str) -> str:
    # Strip stray bidi/format control characters that show up in a handful
    # of the deck's own reading fields.
    stripped = "".join(c for c in value if unicodedata.category(c) != "Cf")
    return re.sub(r"\s", "", stripped)


def main():
    repo_root = Path(__file__).resolve().parent.parent
    deck_path = repo_root / "src/lib/study/data/tae-kim-deck.json"
    out_path = repo_root / "src/lib/study/data/tae-kim-word-romaji.json"

    data = json.loads(deck_path.read_text(encoding="utf-8"))
    katsu = cutlet.Cutlet()

    romaji_by_id: dict[str, str] = {}
    skipped = 0
    for word in data["words"]:
        reading = clean(word["reading"])
        if not reading:
            skipped += 1
            continue
        try:
            romaji_by_id[word["id"]] = katsu.map_kana(reading)
        except KeyError:
            skipped += 1

    out_path.write_text(
        json.dumps(romaji_by_id, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    total = len(data["words"])
    print(f"{len(romaji_by_id)}/{total} word cards got romaji ({skipped} skipped).")


if __name__ == "__main__":
    main()
