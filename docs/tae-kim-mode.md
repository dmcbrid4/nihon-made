# Tae Kim course mode

A third, personal-use study mode alongside N5/N4: real sentences and words
mined from "Japanese course based on Tae Kim's grammar guide (anime)" (the
"Japanese Like a Breeze" Anki deck), which follows Tae Kim's grammar guide
illustrated with dialogue from real anime and drama. Switch to it from
Settings or the sidebar mode picker, the same way as N5/N4 mode.

## Personal use only

This deck's audio clips and screenshots are taken directly from copyrighted
anime and drama episodes (AnoHana, Code Geass, K-ON!, Cardcaptor Sakura, and
many others -- the source show is stored per card). That is fine for
personal, non-redistributed study -- this is exactly what the deck is for --
but it is a different situation from the openly licensed N5/N4 vocabulary
corpus (see [ATTRIBUTION.md](../ATTRIBUTION.md)), which is built to be
shareable. Tae Kim mode is exempt from that licensing rigor specifically
because this is a single-user app:

- Media files (`public/tae-kim/media/`, ~113MB of clips and screenshots) are
  committed alongside the text-only mined dataset
  (`src/lib/study/data/tae-kim-deck.json`) so they're present in every
  deployment, including Vercel.
- This only stays acceptable while the GitHub repo is **private**. If the
  repo is ever made public (or the app deployed somewhere reachable by
  others), the media should go back to gitignored/local-only first -- do not
  leave copyrighted clips in a public repo.
- Guest mode (`/guest`) is unaffected: it uses its own small hardcoded
  sample list and never touches this data.

## Regenerating the data

The mined dataset and media are built from your local copy of the `.apkg`
file plus a local JMdict snapshot (the same kind of snapshot used for the
N5/N4 corpus; see `docs/vocabulary-quality-plan.md`). Neither is committed.

```bash
python3 scripts/mine-tae-kim-deck.py \
  /path/to/Japanese_course_based_on_Tae_Kims_grammar_guide__anime.apkg \
  /path/to/jmdict-examples-eng-x.y.z.json \
  public/tae-kim/media \
  src/lib/study/data/tae-kim-deck.json
```

Requires `fugashi` and `unidic-lite` (`pip install fugashi unidic-lite`;
the same interpreter already used for `scripts/build-vocabulary-quality.py`).
`JMDICT_JSON` must be the **full** dictionary snapshot (`commonOnly: false`),
not the common-only subset -- word mining needs the long tail of proper
nouns and less common terms real dialogue actually uses.

## What gets mined

- **2,076 sentence cards** (`type: "listening"`): the deck's Japanese text,
  a spaced hiragana reading, an English translation, grammar notes, an audio
  clip, and a screenshot, each with its source show.
- **~700 word cards** (`type: "vocabulary"`): every content word (nouns,
  verbs, adjectives, adverbs) that appears in those sentences, tokenized
  with `fugashi`/UniDic-lite and cross-referenced against the full JMdict for
  a dictionary-grade reading and gloss. Particles and auxiliaries (ます,
  です, ...) are deliberately excluded -- they're grammar, not vocabulary,
  and are exactly where bare-text dictionary lookup is least reliable
  (homophones like ます the auxiliary vs. 枡 "measuring box"). About 90% of
  words resolve to a confirmed JMdict entry; most of the rest are character
  or place names from the source shows, which is expected, not a data gap.
  Each word card also carries the audio/screenshot from one sentence it
  actually appears in.

This is a best-effort mining pass, not the disambiguated, approval-gated
pipeline the N5/N4 corpus goes through (see
`docs/vocabulary-quality-plan.md`) -- word-sense matching is by dictionary
form and part-of-speech agreement, not full sense reconciliation, since
there's no reliable per-token dictionary reading to key off (only the
inflected surface reading). Treat gloss/reading fields as a strong starting
point, not a certified one.

## Curriculum integration

Tae Kim concepts share the same `Concept` shape, scheduler, session planner,
and progress tracking as N5/N4 -- they're just a third value of the shared
study-mode enum (`"N5" | "N4" | "tae-kim"`, see `src/lib/study/types.ts`),
routed the same way `level` already routed N5 vs. N4. They sit in one
curriculum unit ("Tae Kim · Sentence mining course"), ordered by frequency
(words) and the original course sequence (sentences); there's no
JLPT-aligned leveling or prerequisite structure for this track. If you're
using Supabase cloud mode, run `npm run db:generate`-reviewed migration
`drizzle/0004_add_tae_kim_mode.sql` (`ALTER TYPE jlpt_level ADD VALUE
'tae-kim'`) before switching to Tae Kim mode there.
