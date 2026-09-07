# Vocabulary data attribution

Nihon Made’s N5–N4 vocabulary corpus is a derived dataset released under
[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). It combines
and normalizes the following sources:

- [OpenJLPT](https://github.com/evanclan/OpenJLPT), CC BY-SA 4.0, for
  vocabulary, readings, English glosses, and many Japanese–English examples.
- [Jonathan Waller’s JLPT Resources](https://www.tanos.co.uk/jlpt/), CC BY
  (the site's sharing page does not specify a licence version), for
  community-standard N5/N4 level assignments.
- [Open Anki JLPT Decks](https://github.com/jamsinclair/open-anki-jlpt-decks),
  whose repository is MIT but whose acknowledged deck data includes Waller
  material, for additional coverage. The repository licence does not replace
  attribution or licence obligations of its source data.
- [JMdict / EDRDG](https://www.edrdg.org/edrdg/licence.html), CC BY-SA 4.0,
  for part-of-speech metadata and lexical checks.
- [Tatoeba](https://tatoeba.org/en/downloads), CC BY 2.0 FR, for example
  sentences where supplied through OpenJLPT or JMdict.

The JLPT does not publish a modern official N5/N4 vocabulary list. These
levels are community-standard study classifications rather than guarantees of
test content. Some source lists disagree about borderline terms and spelling
variants; Nihon Made keeps the natural contemporary spelling where possible.

The Phase 2 corpus stores per-record provenance, review status, and furigana
segments. Imported examples that lack a reviewed source attribution remain in
the editorial review queue; see [docs/data-quality-report.md](docs/data-quality-report.md).
