#!/usr/bin/env python3
"""Match our N5/N4 corpus against mined Kaishi data by (expression, reading)
and emit a side-by-side comparison for editorial review.

This produces a private diff report only -- it embeds Kaishi's own meaning
and example-sentence text for comparison purposes, so its output must never
be committed (same rule as the miner; see mine-kaishi-deck.py's docstring).
Corrections written back into the corpus must be independently authored,
not copied from this report.

Usage:
  python3 compare-kaishi.py CORPUS_JSON KAISHI_JSON OUTPUT_JSON
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path


def normalized(value: str) -> str:
    return re.sub(r"[\s・;；〜～]", "", value)


def main() -> None:
    if len(sys.argv) != 4:
        raise SystemExit("Usage: compare-kaishi.py CORPUS_JSON KAISHI_JSON OUTPUT_JSON")
    corpus_path, kaishi_path, output_path = (Path(p) for p in sys.argv[1:])

    corpus = json.loads(corpus_path.read_text())
    kaishi = json.loads(kaishi_path.read_text())

    by_form_reading: dict[tuple[str, str], list[dict]] = {}
    by_form: dict[str, list[dict]] = {}
    for entry in kaishi["words"]:
        key_form = normalized(entry["word"])
        key = (key_form, normalized(entry["reading"]))
        by_form_reading.setdefault(key, []).append(entry)
        by_form.setdefault(key_form, []).append(entry)

    matched = []
    unmatched = []
    for item in corpus["items"]:
        if not item.get("vocabulary", {}).get("approval", {}).get("approved"):
            continue  # only compare records actually in the active/approved set
        expression = item["expression"]
        reading = item["reading"]
        key = (normalized(expression), normalized(reading))
        exact = by_form_reading.get(key)
        form_only = by_form.get(normalized(expression))
        candidates = exact or form_only
        if not candidates:
            unmatched.append({
                "id": item["id"],
                "expression": expression,
                "reading": reading,
                "level": item["level"],
                "ourMeaning": item["meaning"],
            })
            continue
        kaishi_entry = candidates[0]
        matched.append({
            "id": item["id"],
            "expression": expression,
            "reading": reading,
            "level": item["level"],
            "matchKind": "exact" if exact else "formOnly",
            "kaishiReading": kaishi_entry["reading"],
            "ourMeaning": item["meaning"],
            "ourExample": item["example"],
            "ourExampleMeaning": item["exampleMeaning"],
            "kaishiMeaning": kaishi_entry["meaning"],
            "kaishiSentence": kaishi_entry["sentence"],
            "kaishiSentenceMeaning": kaishi_entry["sentenceMeaning"],
            "kaishiFrequencyRank": kaishi_entry["frequency"],
        })

    payload = {
        "counts": {
            "corpusApproved": sum(
                1 for i in corpus["items"]
                if i.get("vocabulary", {}).get("approval", {}).get("approved")
            ),
            "matched": len(matched),
            "unmatchedInKaishi": len(unmatched),
        },
        "matched": matched,
        "unmatchedInKaishi": unmatched,
    }
    output_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(payload["counts"]))


if __name__ == "__main__":
    main()
