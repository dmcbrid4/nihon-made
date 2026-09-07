#!/usr/bin/env python3
"""Build the Phase 2 vocabulary candidate from pinned local source snapshots.

Usage:
  /path/to/python scripts/build-vocabulary-quality.py SOURCE_ROOT INPUT_JSON OUTPUT_JSON

The Python interpreter must provide fugashi with UniDic. SOURCE_ROOT must hold
JmdictFurigana.json and jmdict/jmdict-eng-common-3.6.2.json. This script makes
stored ruby segments; the web app never derives readings at runtime.
"""

from __future__ import annotations

import hashlib
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

import fugashi

HAN = re.compile(r"[\u3400-\u9fff々〆ヶ]")
KANJI_RUN = re.compile(r"[\u3400-\u9fff々〆ヶ]+")
KANA = re.compile(r"[ぁ-ゖァ-ヺー]+")

SOURCE_IDS = {
    "OpenJLPT": "openjlpt",
    "Jonathan Waller JLPT Resources": "waller",
    "Open Anki JLPT Decks": "open-anki-jlpt",
}
FOUNDATION = {
    "これ": 1, "それ": 2, "あれ": 3, "ここ": 4, "そこ": 5, "あそこ": 6,
    "私": 7, "人": 8, "水": 9, "ご飯": 10, "家": 11, "学校": 12,
    "駅": 13, "店": 14, "時間": 15, "今日": 16, "明日": 17, "今": 18,
    "ある": 19, "いる": 20, "行く": 21, "来る": 22, "見る": 23,
    "食べる": 24, "飲む": 25, "買う": 26, "する": 27, "聞く": 28,
    "話す": 29, "読む": 30, "書く": 31, "大きい": 32, "小さい": 33,
    "いい": 34, "好き": 35, "ください": 36, "どうも": 37, "ありがとう": 38,
    "すみません": 39, "はい": 40, "いいえ": 41,
}

OVERRIDES = {
    "v-jlpt-n4-0003": {
        "expression": "赤ちゃん", "kanjiForm": "赤ちゃん", "reading": "あかちゃん",
        "meaning": "baby; infant", "partOfSpeech": "noun",
        "example": "赤ちゃんが寝ています。", "exampleMeaning": "The baby is sleeping.",
        "exampleKind": "editorial",
        "notes": ["Replaces an imported child-speech fragment with a simple teaching sentence."],
    },
    "v-jlpt-n5-0082": {
        "expression": "石けん", "kanjiForm": "石けん", "reading": "せっけん",
        "meaning": "soap", "partOfSpeech": "noun",
        "example": "石けんで手を洗います。", "exampleMeaning": "I wash my hands with soap.",
        "exampleKind": "editorial",
        "notes": ["Corrects a homograph that had the unrelated meaning “economy”."],
    },
    "v-jlpt-n5-0017": {
        "expression": "椅子", "kanjiForm": "椅子", "reading": "いす",
        "meaning": "chair", "partOfSpeech": "noun",
        "example": "椅子に座ってください。", "exampleMeaning": "Please sit on the chair.",
        "exampleKind": "editorial",
        "notes": ["Replaces an example that only contained an unrelated substring."],
    },
    "v-jlpt-n5-0043": {
        "expression": "電話をかける", "kanjiForm": "電話をかける", "reading": "でんわをかける",
        "meaning": "to make a phone call", "partOfSpeech": "expression",
        "example": "あとで母に電話をかけます。", "exampleMeaning": "I will call my mother later.",
        "exampleKind": "editorial",
        "notes": ["Stores the disambiguating phrase so it cannot be confused with 出かける."],
    },
    "v-jlpt-n5-0090": {
        "example": "それは私のかばんです。", "exampleMeaning": "That is my bag.",
        "exampleKind": "editorial",
        "notes": ["Replaces an example of the unrelated verb 逸れる."],
    },
    "v-jlpt-n5-0055": {
        "example": "このりんごは二百グラムです。", "exampleMeaning": "This apple weighs two hundred grams.",
        "exampleKind": "editorial",
        "notes": ["Replaces an unrelated sentence about pangrams."],
    },
    "v-jlpt-n5-0004": {
        "example": "あっちへ行ってください。", "exampleMeaning": "Please go over there.",
        "exampleKind": "editorial",
        "notes": ["Replaces a hostile register example with a neutral request."],
    },
    "v-jlpt-n4-0014": {
        "expression": "頂く", "kanjiForm": "頂く", "reading": "いただく",
        "meaning": "to receive (humble)", "partOfSpeech": "Godan verb",
        "example": "先生から本を頂きました。", "exampleMeaning": "I received a book from my teacher.",
        "exampleKind": "editorial",
        "notes": ["Replaces a fallback with the humble receive sense."],
    },
}

RETIRED = {
    "v-jlpt-n4-0070": "Ambiguous しかる entry; its sense and POS conflict and require a separately sourced decision.",
    "v-jlpt-n4-0690": "Duplicate/annotated いただく entry with a kanji value in the reading field; v-jlpt-n4-0014 retains the humble receive sense.",
    "v-jlpt-n4-0706": "Combined 回る、回す entry is not one lexeme and overlaps the active 回る card; do not transfer progress automatically.",
    "v-jlpt-n5-0706": "Duplicate 結婚 entry after separating the する annotation from the canonical reading.",
    "v-jlpt-n5-0711": "Duplicate 散歩 entry after separating the する annotation from the canonical reading.",
    "v-jlpt-n5-0719": "Duplicate 掃除 entry after separating the する annotation from the canonical reading.",
    "v-jlpt-n5-0726": "Duplicate 十 entry after separating the alternate reading annotation from the canonical reading.",
    "v-jlpt-n5-0737": "Duplicate 勉強 entry after separating the する annotation from the canonical reading.",
    "v-jlpt-n5-0742": "Duplicate 練習 entry after separating the する annotation from the canonical reading.",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def hira(value: str) -> str:
    return "".join(chr(ord(char) - 0x60) if "ァ" <= char <= "ヶ" else char for char in value)


def normalized(value: str) -> str:
    return re.sub(r"[\s・;；〜～]", "", value).replace("ヶ", "ケ").replace("ヵ", "カ")


def has_kanji(value: str) -> bool:
    return bool(HAN.search(value))


def canonical_reading(value: str) -> str:
    return re.sub(r"\s*\([^)]*\)", "", value).strip()


def furigana_index(path: Path) -> dict[tuple[str, str], list[dict]]:
    with path.open(encoding="utf-8-sig") as source:
        values = json.load(source)
    result: dict[tuple[str, str], list[dict]] = {}
    for value in values:
        key = (normalized(value["text"]), normalized(hira(value["reading"])))
        result.setdefault(key, [
            {"text": item["ruby"], "reading": item.get("rt")}
            for item in value["furigana"]
        ])
    return result


def common_forms(path: Path) -> set[tuple[str, str]]:
    with path.open(encoding="utf-8") as source:
        dictionary = json.load(source)
    forms: set[tuple[str, str]] = set()
    for entry in dictionary["words"]:
        spellings = [item["text"] for item in entry.get("kanji", [])]
        readings = [item["text"] for item in entry.get("kana", [])]
        for spelling in spellings + readings:
            for reading in readings or [spelling]:
                forms.add((normalized(spelling), normalized(hira(reading))))
    return forms


def generated_segments(text: str, reading: str) -> tuple[list[dict], bool]:
    """Align one tokenizer token without splitting a kanji compound by guesswork."""
    if not has_kanji(text):
        return [{"text": text, "reading": None}], True
    segments: list[dict] = []
    position = 0
    pieces = re.findall(r"[\u3400-\u9fff々〆ヶ]+|[^\u3400-\u9fff々〆ヶ]+", text)
    for index, piece in enumerate(pieces):
        if not KANJI_RUN.fullmatch(piece):
            segments.append({"text": piece, "reading": None})
            literal = hira(piece)
            if reading.startswith(literal, position):
                position += len(literal)
            else:
                found = reading.find(literal, position)
                if found >= position:
                    position = found + len(literal)
                elif literal:
                    return [{"text": text, "reading": None}], False
            continue
        suffix = ""
        for following in pieces[index + 1 :]:
            match = KANA.search(following)
            if match:
                suffix = hira(match.group())
                break
        end = reading.find(suffix, position) if suffix else len(reading)
        if end < position:
            return [{"text": text, "reading": None}], False
        ruby = reading[position:end]
        if not ruby:
            return [{"text": text, "reading": None}], False
        segments.append({"text": piece, "reading": ruby})
        position = end
    return segments, position == len(reading)


def sentence_segments(tagger: fugashi.Tagger, text: str) -> tuple[list[dict], str, bool]:
    segments: list[dict] = []
    reading = ""
    complete = True
    cursor = 0
    for token in tagger(text):
        surface = token.surface
        start = text.find(surface, cursor)
        if start < cursor:
            return [{"text": text, "reading": None}], hira(text), False
        if start > cursor:
            gap = text[cursor:start]
            segments.append({"text": gap, "reading": None})
            reading += hira(gap)
        kana = hira(getattr(token.feature, "kana", "") or "")
        if not kana:
            parts = [{"text": surface, "reading": None}]
            okay = not has_kanji(surface)
        else:
            parts, okay = generated_segments(surface, kana)
        segments.extend(parts)
        reading += "".join(part["reading"] if part["reading"] is not None else hira(part["text"]) for part in parts)
        complete = complete and okay
        cursor = start + len(surface)
    if cursor < len(text):
        remainder = text[cursor:]
        segments.append({"text": remainder, "reading": None})
        reading += hira(remainder)
    return segments, reading, complete


def source_evidence(item: dict) -> list[dict]:
    evidence = []
    for source in item["sources"]:
        source_id = SOURCE_IDS[source]
        evidence.append({
            "sourceId": source_id,
            "lineage": "Waller-derived community list" if source_id in {"waller", "openjlpt", "open-anki-jlpt"} else "community list",
            "level": item["level"],
        })
    return evidence


def priority(item: dict, index: int, common: set[tuple[str, str]]) -> dict:
    expression = item["expression"]
    if item["level"] == "N5" and expression in FOUNDATION:
        return {"rank": FOUNDATION[expression], "reason": "N5 foundation: everyday reference, request, or core verb."}
    form = (normalized(expression), normalized(hira(canonical_reading(item["reading"]))))
    base = 100 if item["level"] == "N5" else 1000
    return {
        "rank": base + (100 if form in common else 600) + index,
        "reason": "Dictionary commonness is used as a supporting signal after the curated foundation; within that band, the imported catalog order is retained pending Phase 3 review.",
    }


def item_kind(expression: str) -> str:
    if " " in expression or "、" in expression or "～" in expression or "〜" in expression:
        return "expression"
    return "word"


def target_spans(expression: str, example: str) -> list[dict]:
    direct = example.find(expression)
    if direct >= 0:
        return [{"start": direct, "end": direct + len(expression), "surface": expression, "match": "exact"}]
    if expression.endswith("る"):
        stem = expression[:-1]
        match = re.search(re.escape(stem) + r"(?:る|ます|ました|て|た|ない|れば|よう)", example)
        if match:
            return [{"start": match.start(), "end": match.end(), "surface": match.group(), "match": "inflected"}]
    return []


def main() -> None:
    if len(sys.argv) != 4:
        raise SystemExit("Usage: build-vocabulary-quality.py SOURCE_ROOT INPUT_JSON OUTPUT_JSON")
    root, input_path, output_path = map(Path, sys.argv[1:])
    with input_path.open() as source:
        original = json.load(source)
    furigana_path = root / "JmdictFurigana.json"
    common_path = root / "jmdict" / "jmdict-eng-common-3.6.2.json"
    furigana = furigana_index(furigana_path)
    common = common_forms(common_path)
    tagger = fugashi.Tagger()
    output: list[dict] = []
    for index, raw in enumerate(original["items"], start=1):
        if raw["id"] in RETIRED:
            continue
        item = dict(raw)
        override = OVERRIDES.get(item["id"], {})
        item.update({key: value for key, value in override.items() if key not in {"exampleKind", "notes"}})
        was_fallback = item.get("exampleFallback", item["example"] == f"「{item['expression']}」という言葉を練習しています。")
        reading = canonical_reading(item["reading"])
        item["reading"] = reading
        key = (normalized(item["expression"]), normalized(hira(reading)))
        expression_furigana = furigana.get(key)
        word_exact = expression_furigana is not None and "".join(part["text"] for part in expression_furigana) == item["expression"]
        if not word_exact:
            expression_furigana = None
        if expression_furigana is None:
            expression_furigana, word_exact = generated_segments(item["expression"], hira(reading))
        example_furigana, example_reading, sentence_complete = sentence_segments(tagger, item["example"])
        source_ids = [SOURCE_IDS[source] for source in item["sources"]]
        notes = list(override.get("notes", []))
        if was_fallback:
            notes.append("Inherited fallback example requires Phase 3 editorial review.")
        if not word_exact:
            notes.append("Expression segmentation was generated from its stored reading and needs review.")
        if not sentence_complete:
            notes.append("At least one sentence token could not be aligned confidently by the tokenizer.")
        confidence = "low" if len(source_ids) == 1 else "medium"
        item["vocabulary"] = {
            "expressionFurigana": expression_furigana,
            "exampleFurigana": example_furigana,
            "exampleReading": example_reading,
            "secondaryMeanings": [],
            "itemKind": item_kind(item["expression"]),
            "linkedKanji": re.findall(r"[\u3400-\u9fff々〆ヶ]+", item["expression"]),
            "priority": priority(item, index, common),
            "classification": {
                "confidence": confidence,
                "evidence": source_evidence(item),
                "reason": "Source records share Waller lineage; agreement is not counted as independent frequency evidence.",
            },
            "provenance": {
                "lexicalSourceIds": source_ids,
                "dictionarySourceId": "jmdict" if word_exact else None,
                "exampleKind": override.get("exampleKind", "fallback" if was_fallback else "imported"),
            },
            "targetSpans": target_spans(item["expression"], item["example"]),
            "review": {
                "lexical": "reviewed" if item["id"] in OVERRIDES else "pending",
                "example": "reviewed" if item["id"] in OVERRIDES else "pending",
                "furigana": "automated" if word_exact and sentence_complete else "uncertain",
                "notes": notes,
            },
        }
        item.pop("exampleFallback", None)
        output.append(item)
    n5 = sum(item["level"] == "N5" for item in output)
    n4 = sum(item["level"] == "N4" for item in output)
    payload = {
        "schemaVersion": 2,
        "license": "CC BY-SA 4.0",
        "sources": original["sources"],
        "sourceManifest": {
            "jmdictFurigana": {"version": "2.3.1+2026-08-25", "sha256": sha256(furigana_path)},
            "jmdictCommon": {"schema": "3.6.2", "sha256": sha256(common_path)},
            "tokenizer": "fugashi 1.5.2 with UniDic-lite 1.0.8",
        },
        "counts": {"n5": n5, "n4Only": n4, "total": n5 + n4},
        "retired": [{"id": key, "reason": value} for key, value in RETIRED.items()],
        "items": output,
    }
    output_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(payload["counts"]))
    print(f"expression furigana uncertain: {sum(item['vocabulary']['review']['furigana'] == 'uncertain' for item in output)}")


if __name__ == "__main__":
    main()
