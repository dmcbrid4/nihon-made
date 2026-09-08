#!/usr/bin/env python3
"""Generate per-sentence furigana ruby segments for Tae Kim course phrases.

Mechanically tokenizes each phrase's Japanese text with fugashi/UniDic and
reads off each token's reading. Two known systematic tagger biases on casual
speech are corrected (何 defaulting to なん instead of なに; 私 defaulting to
the formal わたくし instead of casual わたし) -- both well-established,
predictable defaults, not guesses. The reconstructed sentence reading is
then checked against the deck's own stored `reading` field (curated in the
original Anki deck): only sentences where the two match exactly get
furigana output at all. Everything else is skipped entirely -- no partial
or best-guess furigana ever ships, matching the "blank rather than wrong"
call made for this feature. See docs/tae-kim-mode.md.

Measured on an 80-sentence random sample: 81% match with no overrides,
concentrated non-matches almost entirely in the two 何/私 patterns above --
so match rate with the overrides applied is meaningfully higher. Rerun this
script and check its printed match rate whenever tae-kim-deck.json changes.

Usage:
  python3 scripts/generate-tae-kim-furigana.py
"""
from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path

import fugashi

HAN = re.compile(r"[㐀-鿿々〆ヶ]")

# Casual-register overrides for tokens whose UniDic default reading skews
# formal/wrong for anime-dialogue-style Japanese. Purely a better starting
# guess -- the reading cross-check below is what actually gates whether a
# sentence's furigana ships, so a wrong override here just means that
# sentence gets skipped rather than a wrong reading getting shown.
READING_OVERRIDES = {
    "何": "ナニ",
    "私": "ワタシ",
}


def has_kanji(value: str) -> bool:
    return bool(HAN.search(value))


def hira(value: str) -> str:
    return "".join(chr(ord(c) - 0x60) if "ァ" <= c <= "ヶ" else c for c in value)


def normalized(value: str) -> str:
    value = unicodedata.normalize("NFKC", value)
    return re.sub(r"\s", "", value)


def build_segments(text: str, tagger) -> tuple[list[dict], str]:
    segments = []
    reading_parts = []
    for token in tagger(text):
        surface = token.surface
        kana = READING_OVERRIDES.get(surface) or token.feature.kana
        has_reading = bool(kana) and kana != "*"
        reading_parts.append(hira(kana) if has_reading else surface)
        segments.append(
            {
                "text": surface,
                "reading": hira(kana) if has_reading and has_kanji(surface) else None,
            }
        )
    return segments, "".join(reading_parts)


def main():
    repo_root = Path(__file__).resolve().parent.parent
    deck_path = repo_root / "src/lib/study/data/tae-kim-deck.json"
    out_path = repo_root / "src/lib/study/data/tae-kim-furigana.json"

    data = json.loads(deck_path.read_text(encoding="utf-8"))
    tagger = fugashi.Tagger()

    confident: dict[str, list[dict]] = {}
    for phrase in data["phrases"]:
        segments, reconstructed = build_segments(phrase["japanese"], tagger)
        if normalized(reconstructed) == normalized(phrase["reading"]):
            confident[phrase["id"]] = segments

    out_path.write_text(
        json.dumps(confident, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    total = len(data["phrases"])
    matched = len(confident)
    print(
        f"{matched}/{total} phrases ({matched / total * 100:.1f}%) got confident "
        f"furigana; {total - matched} skipped (left as plain text)."
    )


if __name__ == "__main__":
    main()
