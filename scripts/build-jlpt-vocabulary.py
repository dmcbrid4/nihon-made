#!/usr/bin/env python3
"""Build the distributable N5/N4 vocabulary corpus from its open sources.

Usage:
  python3 scripts/build-jlpt-vocabulary.py /path/to/source-downloads output.json

The source directory must contain the OpenJLPT N5/N4 JSON files, Jonathan
Waller N5/N4 CSV files, the Open Anki N5/N4 CSV files, and the extracted
JMdict common/example JSON files.  See ATTRIBUTION.md for licences.
"""

from __future__ import annotations

import csv
import json
import re
import sys
from collections import defaultdict
from pathlib import Path


STOP_WORDS = {
    "a", "an", "and", "as", "at", "be", "by", "for", "from", "in", "is",
    "it", "of", "on", "or", "the", "to", "with",
}


def normalize(value: str) -> str:
    return re.sub(r"[\s・;；〜～]", "", value).replace("ヶ", "ケ").replace("ヵ", "カ")


def canonical_form(value: str) -> str:
    return re.split(r"[;/；]", value.strip())[0].strip()


def has_kanji(value: str) -> bool:
    return bool(re.search(r"[\u3400-\u9fff]", value))


def gloss_tokens(value: str) -> set[str]:
    return {
        token
        for token in re.findall(r"[a-z]+", value.lower())
        if token not in STOP_WORDS and len(token) > 1
    }


def same_meaning(left: "Candidate", right: "Candidate") -> bool:
    left_tokens = gloss_tokens(left.meaning)
    right_tokens = gloss_tokens(right.meaning)
    if not left_tokens or not right_tokens:
        return normalize(left.meaning.lower()) == normalize(right.meaning.lower())
    return bool(left_tokens & right_tokens)


def part_of_speech(tags: list[str], tag_labels: dict[str, str]) -> str:
    tag_set = set(tags)
    if "pn" in tag_set:
        return "pronoun"
    if "num" in tag_set:
        return "number"
    if "ctr" in tag_set:
        return "counter"
    if "adj-i" in tag_set:
        return "i-adjective"
    if "adj-na" in tag_set:
        return "na-adjective"
    if "adj-no" in tag_set:
        return "no-adjective"
    if "adv" in tag_set:
        return "adverb"
    if "conj" in tag_set:
        return "conjunction"
    if "int" in tag_set:
        return "interjection"
    if "pref" in tag_set:
        return "prefix"
    if "suf" in tag_set:
        return "suffix"
    if "aux" in tag_set or "aux-v" in tag_set:
        return "auxiliary"
    if "cop" in tag_set:
        return "copula"
    if "exp" in tag_set:
        return "expression"
    if "vs" in tag_set or "vs-i" in tag_set or "vs-c" in tag_set:
        return "suru verb"
    if "v1" in tag_set or "v1-s" in tag_set:
        return "Ichidan verb"
    if any(tag.startswith("v5") for tag in tag_set):
        return "Godan verb"
    if "n" in tag_set:
        return "noun"
    if "adj-pn" in tag_set:
        return "pre-noun adjectival"
    for tag in tags:
        if tag in tag_labels:
            return tag_labels[tag]
    return "word"


class Candidate:
    def __init__(
        self,
        level: str,
        word: str,
        reading: str,
        meaning: str,
        source: str,
        examples: list[dict] | None = None,
        jmdict_id: str | None = None,
    ) -> None:
        self.level = level
        self.word = canonical_form(word)
        self.reading = canonical_form(reading) or self.word
        self.meaning = meaning
        self.source = source
        self.examples = examples or []
        self.jmdict_id = jmdict_id

    @property
    def key(self) -> tuple[str, str]:
        return (normalize(self.word), normalize(self.reading))


def source_candidates(root: Path, level: str) -> list[Candidate]:
    candidates: list[Candidate] = []
    for item in json.loads((root / f"openjlpt-{level}.json").read_text()):
        candidates.append(
            Candidate(
                level.upper(),
                item["word"],
                item["reading"] or item["word"],
                "; ".join(item["meanings"]),
                "OpenJLPT",
                item.get("examples", []),
            )
        )
    for item in csv.DictReader((root / f"waller-{level}.csv").open()):
        candidates.append(
            Candidate(
                level.upper(),
                item["kanji"] or item["kana"],
                item["kana"] or item["kanji"],
                item["waller_definition"],
                "Jonathan Waller JLPT Resources",
                jmdict_id=item["jmdict_seq"],
            )
        )
    for item in csv.DictReader((root / f"open-anki-{level}.csv").open()):
        candidates.append(
            Candidate(
                level.upper(),
                item["expression"],
                item["reading"] or item["expression"],
                item["meaning"],
                "Open Anki JLPT Decks",
            )
        )
    return candidates


def load_jmdict(root: Path) -> tuple[dict[str, dict], dict[tuple[str, str], dict], dict[str, str]]:
    common = json.loads((root / "jmdict" / "jmdict-eng-common-3.6.2.json").read_text())
    examples = json.loads((root / "jmdict" / "jmdict-examples-eng-3.6.2.json").read_text())
    by_id = {entry["id"]: entry for entry in examples["words"]}
    by_form: dict[tuple[str, str], dict] = {}
    for entry in common["words"]:
        kanji_forms = [item["text"] for item in entry["kanji"]]
        kana_forms = [item["text"] for item in entry["kana"]]
        for form in kanji_forms + kana_forms:
            for reading in kana_forms or [form]:
                by_form.setdefault((normalize(form), normalize(reading)), entry)
    return by_id, by_form, common["tags"]


def select_jmdict(candidate: Candidate, by_id: dict[str, dict], by_form: dict[tuple[str, str], dict]) -> dict | None:
    if candidate.jmdict_id and candidate.jmdict_id in by_id:
        return by_id[candidate.jmdict_id]
    return by_form.get(candidate.key)


def first_example(entry: dict | None) -> dict | None:
    if not entry:
        return None
    for sense in entry.get("sense", []):
        for example in sense.get("examples", []):
            sentences = {item["lang"]: item["text"] for item in example.get("sentences", [])}
            if sentences.get("jpn") and sentences.get("eng"):
                return {"ja": sentences["jpn"], "en": sentences["eng"]}
    return None


def first_pos(entry: dict | None, tag_labels: dict[str, str]) -> str:
    if not entry:
        return "word"
    for sense in entry.get("sense", []):
        if sense.get("partOfSpeech"):
            return part_of_speech(sense["partOfSpeech"], tag_labels)
    return "word"


def inferred_pos(expression: str, meaning: str) -> str:
    if "counter" in meaning.lower():
        return "counter"
    if "～" in expression or "~" in expression:
        return "expression"
    if expression.endswith("する") or expression.endswith("する"):
        return "suru verb"
    if expression.endswith("い"):
        return "i-adjective"
    return "noun"


def merge_level(candidates: list[Candidate]) -> list[list[Candidate]]:
    by_exact: dict[tuple[str, str], list[Candidate]] = defaultdict(list)
    for candidate in candidates:
        by_exact[candidate.key].append(candidate)
    unique = []
    for same_term in by_exact.values():
        same_term.sort(key=lambda item: {"OpenJLPT": 0, "Jonathan Waller JLPT Resources": 1, "Open Anki JLPT Decks": 2}[item.source])
        unique.append(same_term)

    by_reading: dict[str, list[list[Candidate]]] = defaultdict(list)
    for term in unique:
        by_reading[normalize(term[0].reading)].append(term)

    merged: list[list[Candidate]] = []
    for terms in by_reading.values():
        clusters: list[list[Candidate]] = []
        for term in terms:
            representative = term[0]
            matching_cluster = next(
                (
                    cluster
                    for cluster in clusters
                    if any(same_meaning(representative, prior) for prior in cluster)
                ),
                None,
            )
            if matching_cluster is None:
                clusters.append(term[:])
            else:
                matching_cluster.extend(term)
        merged.extend(clusters)
    return merged


def build_level(
    clusters: list[list[Candidate]],
    by_id: dict[str, dict],
    by_form: dict[tuple[str, str], dict],
    tag_labels: dict[str, str],
) -> list[dict]:
    result = []
    priority = {"OpenJLPT": 0, "Jonathan Waller JLPT Resources": 1, "Open Anki JLPT Decks": 2}
    for cluster in clusters:
        cluster.sort(key=lambda candidate: priority[candidate.source])
        primary = cluster[0]
        source_example = next((example for candidate in cluster for example in candidate.examples if example.get("ja") and example.get("en")), None)
        dictionary_entry = next(
            (entry for candidate in cluster if (entry := select_jmdict(candidate, by_id, by_form))),
            None,
        )
        dictionary_example = first_example(dictionary_entry)
        expression = primary.word
        reading = primary.reading
        sources = sorted({candidate.source for candidate in cluster})
        pos = first_pos(dictionary_entry, tag_labels)
        result.append(
            {
                "id": f"v-jlpt-{primary.level.lower()}-{len(result) + 1:04d}",
                "type": "vocabulary",
                "expression": expression,
                "kanjiForm": expression if has_kanji(expression) else None,
                "reading": reading,
                "meaning": primary.meaning,
                "level": primary.level,
                "partOfSpeech": inferred_pos(expression, primary.meaning) if pos == "word" else pos,
                "example": (source_example or dictionary_example or {"ja": f"「{expression}」という言葉を練習しています。"})["ja"],
                "exampleMeaning": (source_example or dictionary_example or {"en": f"I am practising the word “{expression}”."})["en"],
                "note": "Review the most useful meaning first, then say the example aloud.",
                "topic": "Core vocabulary",
                "sources": sources,
                "classificationNote": (
                    "This term appears in one community vocabulary source; its N5/N4 placement is less certain."
                    if len(sources) == 1
                    else None
                ),
                "exampleFallback": source_example is None and dictionary_example is None,
            }
        )
    return result


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("Usage: build-jlpt-vocabulary.py SOURCE_DIRECTORY OUTPUT_JSON")
    root = Path(sys.argv[1])
    output = Path(sys.argv[2])
    by_id, by_form, tag_labels = load_jmdict(root)
    n5 = build_level(merge_level(source_candidates(root, "n5")), by_id, by_form, tag_labels)
    n4_all = build_level(merge_level(source_candidates(root, "n4")), by_id, by_form, tag_labels)
    n5_keys = {(normalize(item["expression"]), normalize(item["reading"])) for item in n5}
    n4 = [
        item
        for item in n4_all
        if (normalize(item["expression"]), normalize(item["reading"])) not in n5_keys
    ]
    for index, item in enumerate(n4, start=1):
        item["id"] = f"v-jlpt-n4-{index:04d}"
    payload = {
        "license": "CC BY-SA 4.0",
        "sources": [
            "OpenJLPT (CC BY-SA 4.0)",
            "Jonathan Waller JLPT Resources (CC BY 4.0)",
            "Open Anki JLPT Decks (MIT)",
            "JMdict / EDRDG (CC BY-SA 4.0)",
            "Tatoeba examples (CC BY 2.0 FR)",
        ],
        "counts": {"n5": len(n5), "n4Only": len(n4), "total": len(n5) + len(n4)},
        "items": n5 + n4,
    }
    output.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(payload["counts"]))
    print(f"fallback examples: {sum(item['exampleFallback'] for item in payload['items'])}")


if __name__ == "__main__":
    main()
