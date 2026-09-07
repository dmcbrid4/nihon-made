#!/usr/bin/env python3
"""Mine the 'Japanese Like a Breeze' (Tae Kim + anime) Anki deck into
structured phrase and word records, with media copied out and JMdict
cross-references for word-level entries.

This deck's audio and screenshots are taken directly from copyrighted
anime/drama episodes. This script is for personal, non-redistributed use
only (see docs/tae-kim-mode.md); its output is gitignored except for the
text-only mined JSON.

Usage:
  python3 mine-taekim-deck.py APKG_PATH JMDICT_JSON MEDIA_OUT_DIR OUTPUT_JSON

APKG_PATH is the .apkg file itself (it is unzipped to a temp directory).
JMDICT_JSON is a local full (not common-only) JMdict snapshot, e.g.
jmdict-examples-eng-x.y.z.json, used for word-level dictionary lookups.
"""
from __future__ import annotations

import html
import json
import re
import sqlite3
import sys
import tempfile
import zipfile
from collections import Counter, defaultdict
from pathlib import Path

import fugashi

HAN = re.compile(r"[㐀-鿿々〆ヶ]")


def has_kanji(value: str) -> bool:
    return bool(HAN.search(value))


def hira(value: str) -> str:
    return "".join(chr(ord(c) - 0x60) if "ァ" <= c <= "ヶ" else c for c in value)


def normalized(value: str) -> str:
    return re.sub(r"[\s・;；〜～]", "", value)


def strip_html(value: str) -> str:
    value = re.sub(r"<br\s*/?>", "\n", value, flags=re.I)
    value = re.sub(r"<[^>]+>", "", value)
    value = html.unescape(value)
    return value.strip()


def split_remarks(remarks_back: str) -> tuple[str, str]:
    """RemarksBack is "translation<br><br>notes" in this deck; some cards
    have only a translation."""
    parts = re.split(r"(?:<br\s*/?>\s*){2,}", remarks_back, maxsplit=1)
    translation = strip_html(parts[0])
    notes = strip_html(parts[1]) if len(parts) > 1 else ""
    return translation, notes


def load_notes(db_path: Path) -> list[dict]:
    conn = sqlite3.connect(str(db_path))
    cur = conn.cursor()
    cur.execute("select models from col")
    models = json.loads(cur.fetchone()[0])
    jlab_model = next(m for m in models.values() if m["name"].startswith("JlabNote"))
    names = [f["name"] for f in jlab_model["flds"]]
    cur.execute(f"select id, flds from notes where mid={jlab_model['id']} order by id")
    notes = []
    for note_id, flds in cur.fetchall():
        fields = dict(zip(names, flds.split(chr(0x1F))))
        notes.append({"noteId": note_id, **fields})
    return notes


def media_filename_to_number(deck_dir: Path) -> dict[str, str]:
    manifest = json.loads((deck_dir / "media").read_text())
    return {name: number for number, name in manifest.items()}


POS_JMDICT_TAGS = {
    "動詞": {"v1", "v1-s", "v5", "vk", "vs", "vz"},
    "形容詞": {"adj-i", "adj-ix"},
    "形状詞": {"adj-na", "adj-no"},
    "名詞": {"n", "n-adv", "n-t", "pn"},
    "副詞": {"adv", "adv-to"},
    "連体詞": {"adj-pn"},
    "接続詞": {"conj"},
    "感動詞": {"int"},
}
# Grammar/function words (particles, auxiliaries, symbols) are excluded from
# word mining: they belong to the deck's sentence-level grammar teaching, not
# a vocabulary list, and (being short, kana-only, and highly homophonous --
# ます, です) are exactly where bare-text JMdict lookup is least reliable.
CONTENT_POS = set(POS_JMDICT_TAGS)


def jmdict_indexes(path: Path) -> tuple[dict[tuple[str, str], list[dict]], dict[str, list[dict]]]:
    """(form, reading) -> candidate entries, and a form-only fallback index,
    each with common-flagged entries first. Even with a reading match, two
    genuinely distinct words can be homophones (枡 vs the auxiliary ます);
    the caller also prefers entries whose part-of-speech matches the
    token's UniDic category. This remains a best-effort cross-reference,
    not the disambiguated sense match the N5/N4 corpus build performs."""
    with path.open(encoding="utf-8") as source:
        dictionary = json.load(source)
    by_reading: dict[tuple[str, str], list[dict]] = defaultdict(list)
    by_form: dict[str, list[dict]] = defaultdict(list)
    for entry in dictionary["words"]:
        kanji = [item["text"] for item in entry.get("kanji", [])]
        kana = [item["text"] for item in entry.get("kana", [])]
        is_common = any(item.get("common") for item in entry.get("kanji", []) + entry.get("kana", []))
        pos_tags = {
            tag
            for sense in entry.get("sense", [])
            for tag in sense.get("partOfSpeech", [])
        }
        record = {"entry": entry, "common": is_common, "posTags": pos_tags}
        for form in set(kanji + kana):
            by_form[normalized(form)].append(record)
            for reading in kana or [form]:
                by_reading[(normalized(form), normalized(hira(reading)))].append(record)
    for candidates in list(by_reading.values()) + list(by_form.values()):
        candidates.sort(key=lambda item: not item["common"])
    return by_reading, by_form


def match_word(
    lemma: str,
    reading: str,
    pos1: str,
    by_reading: dict[tuple[str, str], list[dict]],
    by_form: dict[str, list[dict]],
) -> dict | None:
    key = (normalized(lemma), normalized(hira(reading)))
    candidates = by_reading.get(key) or by_form.get(normalized(lemma)) or []
    if not candidates:
        return None
    expected_tags = POS_JMDICT_TAGS.get(pos1)
    if expected_tags:
        pos_matched = [c for c in candidates if c["posTags"] & expected_tags]
        if pos_matched:
            return pos_matched[0]
    return candidates[0]


def best_gloss(entry: dict) -> str:
    for sense in entry.get("sense", []):
        glosses = [g["text"] for g in sense.get("gloss", []) if g.get("lang", "eng") == "eng"]
        if glosses:
            return "; ".join(glosses[:3])
    return ""


def clean_lemma(value: str) -> str:
    """UniDic sometimes appends a sense-disambiguation suffix to a lemma
    (私-代名詞, ビルヘルム-Wilhelm); keep only the headword before it."""
    return value.split("-", 1)[0]


def main() -> None:
    if len(sys.argv) != 5:
        raise SystemExit("Usage: mine-taekim-deck.py APKG_PATH JMDICT_JSON MEDIA_OUT_DIR OUTPUT_JSON")
    apkg_path, jmdict_path, media_out, output_path = (Path(p) for p in sys.argv[1:])
    media_out.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory() as tmp:
        deck_dir = Path(tmp)
        with zipfile.ZipFile(apkg_path) as archive:
            archive.extractall(deck_dir)
        db_path = deck_dir / "collection.anki21"
        if not db_path.exists():
            db_path = deck_dir / "collection.anki2"
        notes = load_notes(db_path)
        filename_to_number = media_filename_to_number(deck_dir)
        by_reading, by_form = jmdict_indexes(jmdict_path)
        tagger = fugashi.Tagger()
        run(notes, deck_dir, filename_to_number, by_reading, by_form, tagger, media_out, output_path)


def run(notes, deck_dir, filename_to_number, by_reading, by_form, tagger, media_out, output_path) -> None:

    phrases = []
    # content-word lemma -> (phrase ids, Counter of (pos1, pronBase reading))
    lemma_occurrences: dict[str, list[str]] = defaultdict(list)
    lemma_pos_reading: dict[str, Counter] = defaultdict(Counter)
    copied_media: set[str] = set()

    for note in notes:
        sequence = note["Sequence"]
        kanji = note["Jlab-Kanji"].strip()
        reading = note["Jlab-Hiragana"].strip()
        lemma_field = note["Jlab-Lemma"].strip()
        romaji = note["Jlab-ListeningFront"].strip()
        source = note["Source"].strip()
        translation, notes_text = split_remarks(note["RemarksBack"])
        grammar_note = strip_html(note["RemarksFront"]) if note["RemarksFront"].strip() else ""

        audio_match = re.search(r"\[sound:([^\]]+)\]", note["Audio"])
        image_match = re.search(r'src="([^"]+)"', note["Image"])
        audio_file = audio_match.group(1) if audio_match else None
        image_file = image_match.group(1) if image_match else None

        for original_name in (audio_file, image_file):
            if not original_name or original_name in copied_media:
                continue
            number = filename_to_number.get(original_name)
            if number is None:
                continue
            source_path = deck_dir / number
            if source_path.exists():
                (media_out / original_name).write_bytes(source_path.read_bytes())
                copied_media.add(original_name)

        phrase_id = f"tk-p-{sequence}"
        tokens = list(tagger(kanji))
        token_lemmas = [
            clean_lemma(t.feature.lemma or t.surface)
            for t in tokens
            if getattr(t.feature, "pos1", None) not in ("補助記号",)
        ]
        seen_this_phrase: set[str] = set()
        for token in tokens:
            pos1 = getattr(token.feature, "pos1", None)
            if pos1 not in CONTENT_POS:
                continue
            lemma = clean_lemma(token.feature.lemma or token.surface)
            pron_base = hira(getattr(token.feature, "pronBase", "") or "")
            if lemma not in seen_this_phrase:
                lemma_occurrences[lemma].append(phrase_id)
                seen_this_phrase.add(lemma)
            lemma_pos_reading[lemma][(pos1, pron_base)] += 1

        phrases.append({
            "id": phrase_id,
            "japanese": kanji,
            "reading": reading,
            "lemmaField": lemma_field,
            "romaji": romaji,
            "translation": translation,
            "grammarNote": grammar_note,
            "notes": notes_text,
            "source": source,
            "audioFile": audio_file,
            "imageFile": image_file,
            "tokenLemmas": token_lemmas,
            "itemKind": "word" if len(tokens) <= 1 else "sentence",
        })

    words = []
    for lemma, phrase_ids in sorted(lemma_occurrences.items(), key=lambda kv: -len(kv[1])):
        if lemma.isdigit():
            continue  # numeral tokens (episode timestamps etc.), not vocabulary
        pos1, pron_reading = lemma_pos_reading[lemma].most_common(1)[0][0]
        match = match_word(lemma, pron_reading, pos1, by_reading, by_form)
        # pronBase is UniDic's phonetic transcription (long vowels collapse
        # to ー, e.g. きょう -> きょー); it's a good lookup key but not the
        # orthographic reading to display. Prefer the matched JMdict entry's
        # own kana spelling; only fall back to a phonetic-to-orthographic
        # guess when nothing matched.
        if match:
            kana_forms = match["entry"].get("kana", [])
            reading = (kana_forms[0]["text"] if kana_forms else pron_reading)
        else:
            reading = pron_reading
        # A handful of rare proper nouns (character/place names UniDic
        # doesn't know) have no pronBase at all; fall back to the lemma's
        # own (katakana) spelling so reading is never empty.
        reading = reading or lemma
        words.append({
            "id": f"tk-w-{lemma}",
            "lemma": lemma,
            "reading": reading,
            "partOfSpeech": pos1,
            "frequency": len(phrase_ids),
            "examplePhraseIds": phrase_ids[:5],
            "dictionary": {
                "matched": match is not None,
                "entryId": match["entry"]["id"] if match else None,
                "common": match["common"] if match else False,
                "gloss": best_gloss(match["entry"]) if match else None,
            },
        })

    payload = {
        "sourceDeck": "Japanese course based on Tae Kim's grammar guide (anime)",
        "sourceNoteCount": len(notes),
        "counts": {"phrases": len(phrases), "words": len(words), "mediaFilesCopied": len(copied_media)},
        "phrases": phrases,
        "words": words,
    }
    output_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(payload["counts"]))
    matched = sum(1 for w in words if w["dictionary"]["matched"])
    print(f"words matched to JMdict: {matched} / {len(words)}")


if __name__ == "__main__":
    main()
