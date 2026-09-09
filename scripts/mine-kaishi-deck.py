#!/usr/bin/env python3
"""Mine the Kaishi 1.5k Anki deck into structured word/sentence records for
cross-checking against src/lib/study/data/jlpt-n5-n4-vocabulary.json.

Kaishi 1.5k (https://github.com/donkuri/kaishi) has no explicit license
granting reuse/redistribution -- a "please add one" issue on its repo was
closed without one being added. Treat its output as a private reference
only: never commit the mined JSON, never copy its example sentences or
translation wording verbatim into the corpus. Word meanings are used only to
corroborate or challenge our own independently-written glosses; where they
disagree, we write our own corrected content rather than borrowing Kaishi's
text. See the conversation/plan context for the full reasoning.

Usage:
  python3 mine-kaishi-deck.py APKG_PATH OUTPUT_JSON
"""
from __future__ import annotations

import html
import json
import re
import sqlite3
import sys
import tempfile
import zipfile
from pathlib import Path


def strip_html(value: str) -> str:
    value = re.sub(r"<br\s*/?>", "\n", value, flags=re.I)
    value = re.sub(r"<[^>]+>", "", value)
    value = html.unescape(value)
    return value.strip()


def load_notes(db_path: Path) -> tuple[list[str], list[dict]]:
    conn = sqlite3.connect(str(db_path))
    cur = conn.cursor()
    cur.execute("select models from col")
    models = json.loads(cur.fetchone()[0])
    mid = next(mid for mid, m in models.items() if m["name"] == "Kaishi 1.5k")
    names = [f["name"] for f in models[mid]["flds"]]
    cur.execute(f"select id, flds from notes where mid={mid} order by id")
    notes = []
    for note_id, flds in cur.fetchall():
        fields = dict(zip(names, flds.split(chr(0x1F))))
        notes.append({"noteId": note_id, **fields})
    return names, notes


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("Usage: mine-kaishi-deck.py APKG_PATH OUTPUT_JSON")
    apkg_path, output_path = (Path(p) for p in sys.argv[1:])

    with tempfile.TemporaryDirectory() as tmp:
        deck_dir = Path(tmp)
        with zipfile.ZipFile(apkg_path) as archive:
            archive.extractall(deck_dir)
        db_path = deck_dir / "collection.anki21"
        if not db_path.exists():
            db_path = deck_dir / "collection.anki2"
        _, notes = load_notes(db_path)

    words = []
    skipped = 0
    for note in notes:
        word = note["Word"].strip()
        reading = note["Word Reading"].strip()
        meaning = strip_html(note["Word Meaning"])
        if not word or not reading or not meaning:
            # The deck's own welcome/intro note has no Word Reading; skip it
            # rather than special-case its note id.
            skipped += 1
            continue
        words.append({
            "id": f"kaishi-{note['noteId']}",
            "word": word,
            "reading": reading,
            "meaning": meaning,
            "notes": strip_html(note["Notes"]),
            "frequency": int(note["Frequency"]) if note["Frequency"].strip().isdigit() else None,
            "sentence": strip_html(note["Sentence"]),
            "sentenceMeaning": strip_html(note["Sentence Meaning"]),
        })

    payload = {
        "sourceDeck": "Kaishi 1.5k",
        "sourceNoteCount": len(notes),
        "skipped": skipped,
        "counts": {"words": len(words)},
        "words": words,
    }
    output_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(payload["counts"] | {"skipped": skipped}))


if __name__ == "__main__":
    main()
