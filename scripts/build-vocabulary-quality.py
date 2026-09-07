#!/usr/bin/env python3
"""Build the Phase 2 vocabulary candidate from pinned local source snapshots.

Usage:
  /path/to/python scripts/build-vocabulary-quality.py SOURCE_ROOT INPUT_JSON OUTPUT_JSON

The Python interpreter must provide fugashi with UniDic. SOURCE_ROOT must hold
JmdictFurigana.json, jmdict/jmdict-examples-eng-3.6.2.json (the full JMdict,
not the common-only subset), and the raw per-source lists (openjlpt-n5.json,
openjlpt-n4.json, waller-n5.csv, waller-n4.csv, open-anki-n5.csv,
open-anki-n4.csv) used to cross-check each source's own observed level. This
script makes stored ruby segments and dictionary/attribution links; the web
app never derives readings or sense identity at runtime.
"""

from __future__ import annotations

import csv
import hashlib
import json
import re
import sys
from pathlib import Path

import fugashi

HAN = re.compile(r"[㐀-鿿々〆ヶ]")
KANJI_RUN = re.compile(r"[㐀-鿿々〆ヶ]+")
KANA = re.compile(r"[ぁ-ゖァ-ヺー]+")
STOP_WORDS = {
    "a", "an", "and", "as", "at", "be", "by", "for", "from", "in", "is",
    "it", "of", "on", "or", "the", "to", "with",
}

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

# Phase 2 editorial corrections. Each entry replaces specific fields on the
# generated record. Sources: docs/vocabulary-quality-plan.md "Confirmed
# quality defects" and docs/phase3-vocabulary-audit.md chunk 1 "Required"
# and "Polish" decisions. Sentences are original editorial candidates, not
# imported quotations, unless exampleKind stays "imported".
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
    # Phase 3 chunk 1 "Required" corrections (docs/phase3-vocabulary-audit.md).
    "v-jlpt-n5-0713": {
        "meaning": "~ weeks (duration)",
        "example": "日本に二週間います。", "exampleMeaning": "I will stay in Japan for two weeks.",
        "exampleKind": "editorial",
        "notes": ["Replaces a metalinguistic placeholder with a numbered-duration example (Phase 3 chunk 1)."],
    },
    "v-jlpt-n5-0442": {
        "example": "この服は少し大きいです。", "exampleMeaning": "These clothes are a little too big.",
        "exampleKind": "editorial",
        "notes": ["Replaces an example of the unrelated word 一服 (Phase 3 chunk 1)."],
    },
    "v-jlpt-n4-0554": {
        "example": "天気がいいので、布団を干します。",
        "exampleMeaning": "The weather is nice, so I will air the futon.",
        "exampleKind": "editorial",
        "notes": ["Replaces a colloquial sentence whose contextual 干し reading the generator stored incorrectly as ぼし (Phase 3 chunk 1)."],
    },
    # Phase 3 chunk 1 "Polish" recommendations.
    "v-jlpt-n5-0446": {
        "meaning": "to clear up; to be sunny",
        "example": "明日は晴れると思います。", "exampleMeaning": "I think it will be sunny tomorrow.",
        "exampleKind": "editorial",
        "notes": ["Uses a concrete time and the more explanatory gloss (Phase 3 chunk 1 polish)."],
    },
    "v-jlpt-n5-0384": {
        "meaning": "car; automobile",
        "example": "父は自動車で会社に行きます。", "exampleMeaning": "My father drives to work.",
        "exampleKind": "editorial",
        "notes": ["Prefers everyday English and avoids the more advanced turning vocabulary (Phase 3 chunk 1 polish)."],
    },
    "v-jlpt-n4-0326": {
        "meaning": "ring (jewelry)",
        "notes": ["Meaning made specific to the jewelry sense; short imported example kept pending attribution (Phase 3 chunk 1 polish)."],
    },
    "v-jlpt-n4-0609": {
        "partOfSpeech": "noun; suru verb",
        "notes": ["POS display corrected: headword is 予約, not 予約する (Phase 3 chunk 1 polish)."],
    },
    "v-jlpt-n4-0577": {
        "meaning": "to catch; to capture",
        "example": "子どもたちが虫を捕まえています。",
        "exampleMeaning": "The children are catching insects.",
        "exampleKind": "editorial",
        "notes": ["Uses a more natural example and a less stiff gloss (Phase 3 chunk 1 polish)."],
    },
    # Structural reading-format corrections found while finishing Phase 2:
    # annotated readings, a swapped tilde, and a combined double reading.
    "v-jlpt-n5-0403": {
        "reading": "じゅう", "partOfSpeech": "number",
        "example": "りんごが十個あります。", "exampleMeaning": "There are ten apples.",
        "exampleKind": "editorial",
        "notes": ["Reading field combined two native/Sino-Japanese readings (じゅう とお); kept the Sino-Japanese counting reading and replaced the unrelated idiom example."],
    },
    "v-jlpt-n4-0684": {
        "expression": "～建て", "kanjiForm": "～建て", "reading": "～だて",
        "meaning": "-story (building suffix); free-standing (housing)",
        "example": "これは二階建ての家です。", "exampleMeaning": "This is a two-story house.",
        "exampleKind": "editorial",
        "notes": ["Expression was missing its leading ～; added it to match the reading and replaced the placeholder example."],
    },
    "v-jlpt-n4-0688": {
        "expression": "～てしまう", "kanjiForm": "～てしまう", "reading": "～てしまう",
        "meaning": "to end up doing ~; to finish doing ~ (often regrettably)",
        "example": "宿題を忘れてしまいました。", "exampleMeaning": "I ended up forgetting my homework.",
        "exampleKind": "editorial",
        "notes": ["Folded the inline “(て)” usage note into the headword and cleaned the reading field."],
    },
    "v-jlpt-n4-0698": {
        "expression": "～によると", "kanjiForm": "～によると", "reading": "～によると",
        "meaning": "according to ~",
        "example": "天気予報によると、明日は雨です。",
        "exampleMeaning": "According to the weather forecast, it will rain tomorrow.",
        "exampleKind": "editorial",
        "notes": ["Folded the inline “(に)” usage note into the headword and cleaned the reading field."],
    },
    "v-jlpt-n4-0708": {
        "expression": "～について", "kanjiForm": "～について", "reading": "～について",
        "meaning": "about; concerning ~",
        "example": "日本の歴史について話しましょう。",
        "exampleMeaning": "Let's talk about Japanese history.",
        "exampleKind": "editorial",
        "notes": ["Folded the inline “(に)” usage note into the headword and cleaned the reading field."],
    },
    # Further structural cleanups found while validating canonical word
    # readings against their stored ruby (docs/vocabulary-quality-plan.md
    # systematic correction requirement #1).
    "v-jlpt-n5-0301": {
        "expression": "見る", "kanjiForm": "見る",
        "notes": ["Expression combined two spellings (見る 観る) in one field; kept the general-purpose 見る."],
    },
    "v-jlpt-n4-0681": {
        "expression": "パート", "kanjiForm": None,
        "example": "パートで働いています。", "exampleMeaning": "I work part-time.",
        "exampleKind": "editorial",
        "notes": ["Folded a parenthetical “(タイム)” annotation out of the headword and replaced the placeholder example."],
    },
    "v-jlpt-n4-0707": {
        "expression": "スーパー", "kanjiForm": None,
        "example": "スーパーで買い物をします。", "exampleMeaning": "I shop at the supermarket.",
        "exampleKind": "editorial",
        "notes": ["Folded a parenthetical “(マーケット)” annotation out of the headword and replaced the placeholder example."],
    },
    "v-jlpt-n4-0705": {
        "example": "御家族はお元気ですか。", "exampleMeaning": "How is your family doing?",
        "exampleKind": "editorial",
        "notes": ["Replaced the placeholder example for the 御～ honorific prefix."],
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
    "v-jlpt-n5-0174": "より、ほう combines two distinct comparison words in one card; splitting them safely needs a separately sourced editorial decision, not a mechanical rename.",
    "v-jlpt-n5-0676": "Duplicate 十/じゅう entry; v-jlpt-n5-0403 retains the canonical Sino-Japanese counting reading.",
    "v-jlpt-n4-0030": "Duplicate お金持ち/おかねもち entry with a reading missing its leading お; v-jlpt-n4-0640 already has the correct reading.",
    "v-jlpt-n4-0121": "Duplicate パート/パート entry whose example used アパート (apartment), a different word that only contains パート as a substring; v-jlpt-n4-0681 has a corrected, sense-aligned example.",
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


def canonical_form(value: str) -> str:
    return re.split(r"[;/；]", value.strip())[0].strip()


def gloss_tokens(value: str) -> set[str]:
    return {
        token
        for token in re.findall(r"[a-z]+", value.lower())
        if token not in STOP_WORDS and len(token) > 1
    }


def reading_format_ok(expression: str, reading: str) -> bool:
    """Structural check: clean canonical kana, consistent tilde placement,
    no parenthetical usage notes or multiple readings folded into one field."""
    lead_e = expression.startswith(("〜", "～"))
    trail_e = expression.endswith(("〜", "～"))
    lead_r = reading.startswith(("〜", "～"))
    trail_r = reading.endswith(("〜", "～"))
    if lead_e != lead_r or trail_e != trail_r:
        return False
    core = reading.strip("〜～")
    return bool(re.fullmatch(r"[ぁ-ゖァ-ヺー〜～]*", core))


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


def jmdict_index(path: Path) -> tuple[dict[str, dict], dict[tuple[str, str], dict], set[tuple[str, str]], dict[str, str], str]:
    """Single pass over the full JMdict snapshot (not the common-only subset).

    Returns (entries by id, entries by exact expression+reading form, the
    subset of forms JMdict flags common, a Tatoeba JA-sentence -> sentence-ID
    attribution index, and the dictionary revision date)."""
    with path.open(encoding="utf-8") as source:
        dictionary = json.load(source)
    by_id: dict[str, dict] = {}
    by_form: dict[tuple[str, str], dict] = {}
    common: set[tuple[str, str]] = set()
    tatoeba: dict[str, str] = {}
    for entry in dictionary["words"]:
        by_id[entry["id"]] = entry
        kanji = entry.get("kanji", [])
        kana = entry.get("kana", [])
        kana_texts = [item["text"] for item in kana]
        for item in kanji + kana:
            readings = [
                k["text"] for k in kana
                if not k.get("appliesToKanji") or "*" in k["appliesToKanji"] or item["text"] in k.get("appliesToKanji", [])
            ] or kana_texts or [item["text"]]
            for reading in readings:
                key = (normalized(item["text"]), normalized(hira(reading)))
                by_form.setdefault(key, entry)
                if item.get("common"):
                    common.add(key)
        for sense in entry.get("sense", []):
            for example in sense.get("examples", []) or []:
                source_info = example.get("source", {})
                if source_info.get("type") != "tatoeba":
                    continue
                ja = next(
                    (s["text"] for s in example.get("sentences", []) if s["lang"] == "jpn"),
                    None,
                )
                if ja:
                    tatoeba.setdefault(ja, source_info["value"])
    return by_id, by_form, common, tatoeba, dictionary.get("dictDate", "")


def select_sense(entry: dict, meaning: str) -> tuple[int | None, int]:
    meaning_tokens = gloss_tokens(meaning)
    best_index, best_score = None, -1
    for index, sense in enumerate(entry.get("sense", [])):
        gloss_text = "; ".join(
            gloss["text"] for gloss in sense.get("gloss", []) if gloss.get("lang", "eng") == "eng"
        )
        score = len(gloss_tokens(gloss_text) & meaning_tokens)
        if score > best_score:
            best_index, best_score = index, score
    return best_index, max(best_score, 0)


def source_level_index(root: Path) -> dict[str, dict[tuple[str, str], set[str]]]:
    """Each source's own observed level for a term, read from the raw
    per-source lists rather than the already-merged, single-level record."""
    index: dict[str, dict[tuple[str, str], set[str]]] = {
        source_id: {} for source_id in SOURCE_IDS.values()
    }

    def add(source_id: str, expression: str, reading: str, level: str) -> None:
        key = (normalized(canonical_form(expression)), normalized(hira(canonical_form(reading or expression))))
        index[source_id].setdefault(key, set()).add(level)

    for level in ("n5", "n4"):
        for item in json.loads((root / f"openjlpt-{level}.json").read_text()):
            add("openjlpt", item["word"], item["reading"] or item["word"], level.upper())
        for item in csv.DictReader((root / f"waller-{level}.csv").open()):
            add("waller", item["kanji"] or item["kana"], item["kana"] or item["kanji"], level.upper())
        for item in csv.DictReader((root / f"open-anki-{level}.csv").open()):
            add("open-anki-jlpt", item["expression"], item["reading"] or item["expression"], level.upper())
    return index


def source_evidence(item: dict, level_index: dict[str, dict[tuple[str, str], set[str]]]) -> list[dict]:
    key = (normalized(item["expression"]), normalized(hira(item["reading"])))
    evidence = []
    for source in item["sources"]:
        source_id = SOURCE_IDS[source]
        observed = level_index.get(source_id, {}).get(key)
        lineage = "Waller-derived community list" if source_id in {"waller", "openjlpt", "open-anki-jlpt"} else "community list"
        if observed is None:
            evidence.append({
                "sourceId": source_id, "lineage": lineage, "level": item["level"], "agrees": None,
            })
        else:
            level = sorted(observed)[0]
            evidence.append({
                "sourceId": source_id, "lineage": lineage, "level": level,
                "agrees": item["level"] in observed,
            })
    return evidence


def priority(item: dict, index: int, common: set[tuple[str, str]]) -> dict:
    expression = item["expression"]
    if item["level"] == "N5" and expression in FOUNDATION:
        return {
            "rank": FOUNDATION[expression], "band": "essential",
            "reason": "N5 foundation: everyday reference, request, or core verb.",
        }
    form = (normalized(expression), normalized(hira(canonical_reading(item["reading"]))))
    band = "common" if form in common else "additional"
    base = 100 if item["level"] == "N5" else 1000
    # The band is decided directly from foundation/common-dictionary membership
    # so a large index can no longer push every later-imported record past a
    # shared numeric threshold; index only orders items within their own band.
    band_offset = 0 if band == "common" else 100_000
    return {
        "rank": base + band_offset + index,
        "band": band,
        "reason": "Dictionary commonness is used as a supporting signal after the curated foundation; within that band, the imported catalog order is retained pending Phase 3 editorial reprioritization.",
    }


def item_kind(tagger: fugashi.Tagger, expression: str) -> str:
    if " " in expression or "、" in expression or "～" in expression or "〜" in expression:
        return "expression"
    # A bare separator character misses phrases like 電話をかける, which
    # read as one word but are grammatically headword+particle+verb. Ask
    # the tokenizer instead: any standalone particle token means this is a
    # multi-word expression, not a single dictionary lexeme.
    for token in tagger(expression):
        if getattr(token.feature, "pos1", None) == "助詞":
            return "expression"
    return "word"


def tokenize(tagger: fugashi.Tagger, text: str) -> list[tuple[object, int, int]]:
    tokens = []
    cursor = 0
    for token in tagger(text):
        start = text.find(token.surface, cursor)
        if start < 0:
            start = cursor
        end = start + len(token.surface)
        tokens.append((token, start, end))
        cursor = end
    return tokens


def generated_segments(text: str, reading: str) -> tuple[list[dict], bool]:
    """Align one tokenizer token without splitting a kanji compound by guesswork."""
    if not has_kanji(text):
        return [{"text": text, "reading": None}], True
    segments: list[dict] = []
    position = 0
    pieces = re.findall(r"[㐀-鿿々〆ヶ]+|[^㐀-鿿々〆ヶ]+", text)
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
        # Search after `position` (not at it): a kanji piece always covers at
        # least one kana character, and if the okurigana suffix happens to
        # equal the very next kana in the reading (e.g. 痛い -> いたい, where
        # the suffix い also opens the reading), searching from `position`
        # finds that coincidental match and assigns 痛 an empty ruby.
        # When no kana follows, consume to the end of the reading -- but not
        # a trailing ～/〜 placeholder, which (like the ～ in a headword such
        # as 御～) carries no phonetic content of its own and must stay its
        # own zero-reading segment rather than being folded into the kanji's ruby.
        end = reading.find(suffix, position + 1) if suffix else len(reading.rstrip("〜～"))
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
    for token, start, end in tokenize(tagger, text):
        surface = token.surface
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
        cursor = end
    if cursor < len(text):
        remainder = text[cursor:]
        segments.append({"text": remainder, "reading": None})
        reading += hira(remainder)
    return segments, reading, complete


def phrase_match(tagger: fugashi.Tagger, expression: str, example: str, tokens: list[tuple[object, int, int]]) -> dict | None:
    """Match a multi-word expression (e.g. 電話をかける) against a window of
    example tokens the same length as the expression's own tokenization,
    requiring particles/kana to match verbatim but allowing a content word's
    surface to differ from the expression's citation form as long as its
    lemma agrees -- so a natural conjugated example (電話をかけます) still
    matches its dictionary-form vocabulary entry (電話をかける)."""
    expr_tokens = tokenize(tagger, expression)
    if not expr_tokens:
        return None
    window_size = len(expr_tokens)
    for start_index in range(len(tokens) - window_size + 1):
        window = tokens[start_index : start_index + window_size]
        matched = True
        for (e_token, _, _), (token, _, _) in zip(expr_tokens, window):
            e_surface = e_token.surface
            e_lemma = getattr(e_token.feature, "lemma", None) or e_surface
            t_surface = token.surface
            t_lemma = getattr(token.feature, "lemma", None) or t_surface
            if has_kanji(e_surface) or has_kanji(e_lemma):
                if t_surface != e_surface and t_lemma != e_lemma and t_lemma != e_surface:
                    matched = False
                    break
            elif t_surface != e_surface:
                matched = False
                break
        if matched:
            start, end = window[0][1], window[-1][2]
            return {"start": start, "end": end, "surface": example[start:end], "lemma": expression, "match": "inflected"}
    return None


def target_spans(tagger: fugashi.Tagger, item: dict, example: str, tokens: list[tuple[object, int, int]]) -> list[dict]:
    """Token/lemma-aligned target matching. A bare substring search (the
    Phase 2 candidate's original approach) let a short word match inside an
    unrelated longer word, e.g. 服 inside 一服. Matching against token
    boundaries and dictionary lemmas rejects that: a fused compound token
    such as 一服 never exposes 服 as its own surface or lemma."""
    expression = item["expression"]
    kanji_form = item.get("kanjiForm") or expression
    kind = item["vocabulary_item_kind"]
    lemma_targets = {expression, kanji_form}
    # Exact match over a contiguous run of WHOLE tokens. UniDic-lite often
    # splits a dictionary headword into more than one token (お + 菓子, or
    # even あさっ + て for あさって); requiring token-boundary alignment
    # while allowing multiple tokens still rejects a match that starts or
    # ends mid-token, which is what let 服 match inside the single fused
    # token 一服 under plain substring search.
    token_count = len(tokens)
    for start_index in range(token_count):
        combined = ""
        for end_index in range(start_index, token_count):
            combined += tokens[end_index][0].surface
            if combined == expression:
                start, end = tokens[start_index][1], tokens[end_index][2]
                return [{"start": start, "end": end, "surface": combined, "lemma": expression, "match": "exact"}]
            if len(combined) >= len(expression) + 2:
                break
    for token, start, end in tokens:
        lemma = getattr(token.feature, "lemma", None)
        if lemma and lemma in lemma_targets:
            return [{"start": start, "end": end, "surface": token.surface, "lemma": lemma, "match": "inflected"}]
    if kind in ("expression", "phrase"):
        core = expression.strip("〜～")
        if core and "〜" not in core and "～" not in core:
            phrase = phrase_match(tagger, core, example, tokens)
            if phrase:
                return [phrase]
        if core:
            found = example.find(core)
            if found >= 0:
                match_kind = "counter" if expression != core else "exact"
                return [{
                    "start": found, "end": found + len(core), "surface": example[found:found + len(core)],
                    "lemma": core, "match": match_kind,
                }]
    return []


def main() -> None:
    if len(sys.argv) != 4:
        raise SystemExit("Usage: build-vocabulary-quality.py SOURCE_ROOT INPUT_JSON OUTPUT_JSON")
    root, input_path, output_path = map(Path, sys.argv[1:])
    with input_path.open() as source:
        original = json.load(source)
    furigana_path = root / "JmdictFurigana.json"
    jmdict_path = root / "jmdict" / "jmdict-examples-eng-3.6.2.json"
    furigana = furigana_index(furigana_path)
    by_id, by_form, common, tatoeba, dict_date = jmdict_index(jmdict_path)
    level_index = source_level_index(root)
    tagger = fugashi.Tagger()
    output: list[dict] = []
    for index, raw in enumerate(original["items"], start=1):
        if raw["id"] in RETIRED:
            continue
        item = dict(raw)
        override = OVERRIDES.get(item["id"], {})
        item.update({key: value for key, value in override.items() if key not in {"exampleKind", "notes"}})
        # Computed from the current (possibly overridden) text, not the raw
        # exampleFallback flag: an override that replaces the example must
        # clear fallback status, not inherit the pre-correction value.
        was_fallback = item["example"] == f"「{item['expression']}」という言葉を練習しています。"
        reading = canonical_reading(item["reading"])
        item["reading"] = reading
        format_ok = reading_format_ok(item["expression"], reading)
        key = (normalized(item["expression"]), normalized(hira(reading)))
        expression_furigana = furigana.get(key)
        word_exact = (
            expression_furigana is not None
            and "".join(part["text"] for part in expression_furigana) == item["expression"]
        )
        if word_exact:
            reconstructed = "".join(
                (part["reading"] or hira(part["text"])) for part in expression_furigana
            ).replace("ー", "ー")
            word_reading_valid = hira(reconstructed) == hira(reading)
            if not word_reading_valid:
                word_exact = False
        else:
            word_reading_valid = False
        if not word_exact:
            expression_furigana, generated_ok = generated_segments(item["expression"], hira(reading))
            # Segments are derived directly from `reading`, so they always
            # reconstruct it; `generated_ok` instead reports whether every
            # kanji run could be aligned at all (false only for pathological
            # input), kept separate from the word_exact/dictionary-sourced flag.
            word_reading_valid = generated_ok
        example_furigana, example_reading, sentence_complete = sentence_segments(tagger, item["example"])
        source_ids = [SOURCE_IDS[source] for source in item["sources"]]
        notes = list(override.get("notes", []))
        if was_fallback:
            notes.append("Inherited fallback example requires Phase 3 editorial review.")
        if not word_exact:
            notes.append("Expression segmentation was generated from its stored reading and needs review.")
        if not word_reading_valid:
            notes.append("Expression ruby does not reconstruct the canonical reading; regenerate or correct by hand.")
        if not sentence_complete:
            notes.append("At least one sentence token could not be aligned confidently by the tokenizer.")
        if not format_ok:
            notes.append("Reading field is not clean canonical kana (annotation, combined reading, or tilde mismatch).")
        confidence_evidence = source_evidence(item, level_index)
        known_agreement = [e["agrees"] for e in confidence_evidence if e["agrees"] is not None]
        confidence = (
            "low" if len(source_ids) == 1
            else "high" if len(source_ids) >= 3 and known_agreement and all(known_agreement)
            else "medium"
        )
        item["vocabulary_item_kind"] = item_kind(tagger, item["expression"])
        tokens = tokenize(tagger, item["example"])
        spans = target_spans(tagger, item, item["example"], tokens)
        dictionary_entry = by_form.get(key)
        if dictionary_entry is not None:
            sense_index, gloss_overlap = select_sense(dictionary_entry, item["meaning"])
            dictionary = {
                "entryId": dictionary_entry["id"],
                "senseIds": [f"{dictionary_entry['id']}:{sense_index}"] if sense_index is not None else [],
                "glossOverlap": gloss_overlap,
            }
            if gloss_overlap == 0:
                notes.append("Matched a JMdict entry by form, but no sense's English gloss shares a word with the stored meaning; sense identity is unconfirmed.")
        else:
            dictionary = None
        attribution = tatoeba.get(item["example"])
        example_kind = override.get("exampleKind", "fallback" if was_fallback else "imported")
        if example_kind == "imported" and attribution is None:
            notes.append("Imported example has no recovered Tatoeba attribution; replace with an original sentence or recover its source before release.")
        approval_reasons = []
        if was_fallback:
            approval_reasons.append("placeholder example")
        if not word_reading_valid:
            approval_reasons.append("expression ruby does not validate against its canonical reading")
        if not sentence_complete:
            approval_reasons.append("sentence tokenization incomplete")
        if not format_ok:
            approval_reasons.append("reading field is not clean canonical kana")
        if not spans:
            approval_reasons.append("no validated target span in the example")
        item["vocabulary"] = {
            "expressionFurigana": expression_furigana,
            "exampleFurigana": example_furigana,
            "exampleReading": example_reading,
            "secondaryMeanings": [],
            "itemKind": item["vocabulary_item_kind"],
            "linkedKanji": re.findall(r"[㐀-鿿々〆ヶ]+", item["expression"]),
            "priority": priority(item, index, common),
            "classification": {
                "confidence": confidence,
                "evidence": confidence_evidence,
                "reason": "Source records share Waller lineage; agreement is not counted as independent frequency evidence. \"agrees\" compares each source's own raw list to the assigned level; null means the term could not be relocated in that source's raw list (for example after an editorial spelling correction).",
            },
            "provenance": {
                "lexicalSourceIds": source_ids,
                "dictionary": dictionary,
                "ruby": {
                    "source": "jmdict-furigana" if word_exact else "generated",
                    "wordExact": word_exact,
                },
                "example": {
                    "kind": example_kind,
                    "attribution": {"sourceId": "tatoeba", "sentenceId": attribution} if attribution else None,
                },
            },
            "targetSpans": spans,
            "review": {
                "lexical": "reviewed" if item["id"] in OVERRIDES else "pending",
                "example": "reviewed" if item["id"] in OVERRIDES else "pending",
                "furigana": "automated" if word_exact and sentence_complete else "uncertain",
                "reviewer": "phase2-agent" if item["id"] in OVERRIDES else None,
                "notes": notes,
            },
            "approval": {
                "approved": not approval_reasons,
                "reasons": approval_reasons,
            },
        }
        del item["vocabulary_item_kind"]
        item.pop("exampleFallback", None)
        output.append(item)
    n5 = sum(item["level"] == "N5" for item in output)
    n4 = sum(item["level"] == "N4" for item in output)
    approved = [item for item in output if item["vocabulary"]["approval"]["approved"]]
    n5_approved = sum(item["level"] == "N5" for item in approved)
    n4_approved = sum(item["level"] == "N4" for item in approved)
    payload = {
        "schemaVersion": 3,
        "license": "CC BY-SA 4.0",
        "sources": original["sources"],
        "sourceManifest": {
            "jmdictFurigana": {"version": "2.3.1+2026-08-25", "sha256": sha256(furigana_path)},
            "jmdict": {"schema": "3.6.2", "dictDate": dict_date, "commonOnly": False, "sha256": sha256(jmdict_path)},
            "tokenizer": "fugashi 1.5.2 with UniDic-lite 1.0.8",
        },
        "counts": {"n5": n5, "n4Only": n4, "total": n5 + n4},
        "approvedCounts": {"n5": n5_approved, "n4Only": n4_approved, "total": n5_approved + n4_approved},
        "retired": [{"id": key, "reason": value} for key, value in RETIRED.items()],
        "items": output,
    }
    output_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"counts": payload["counts"], "approvedCounts": payload["approvedCounts"]}))
    print(f"expression furigana uncertain: {sum(item['vocabulary']['review']['furigana'] == 'uncertain' for item in output)}")
    print(f"not approved: {len(output) - len(approved)}")


if __name__ == "__main__":
    main()
