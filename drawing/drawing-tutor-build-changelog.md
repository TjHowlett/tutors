# Drawing tutor app — build changelog (spec deviations & decisions)

This documents every place the actual build (all 7 stages, now live at
tjhowlett.github.io/tutors/drawing) deviated from, extended, or had to
resolve an ambiguity in the original design doc / handoff / exercise bank
content. Bring this back to the design project as the record of what's
now actually true, superseding the locked doc where they conflict.

Source repo: `TjHowlett/tutors`, path `drawing/index.html`, branch `main`.

---

## 1. Persistence

**Handoff said:** keep `window.storage` for Stage 1–7, treat the
localStorage + user-supplied API key migration as a later, separate step.

**Actual:** the file handed over already used `localStorage` and a
user-supplied Anthropic API key end-to-end — that "future migration" had
already happened before this build started. Confirmed and built the new
data model against `localStorage` from Stage 1 onward. No action needed;
just noting the handoff's persistence section was stale.

---

## 2. Data model (Stage 1)

- **Pass-rule recent window locked at exactly 3**, not "2–3" as the design
  doc phrased it. Decision: a skill needs ≥5 primary reps AND no failed
  criteria in the most recent **3** primary-evidence entries.
- **Submission history does not store photos at all**, despite section 5
  saying to store "the drawing photo, plus reference photo if used."
  Confirmed this was never actually intended — photos are used transiently
  to get AI feedback and then discarded, never persisted.
- **Old (pre-rewrite) saved progress is not migrated** — the storage key
  was deliberately bumped to a new name/version so incompatible old-shape
  data is simply ignored on load, rather than attempting a lossy migration.
- **`combining-objects`' second prerequisite** ("one form skill," not a
  named one) is resolved at runtime by checking for any *passed* skill
  tagged `category: 'form'`, rather than hardcoding a specific skill id.
  Required adding a `category` field to every skill (Foundations /
  Perspective / Proportion / Form / Value & shading / Composition) that
  wasn't explicit as a queryable field in the original doc.

---

## 3. Exercise bank (Stage 2)

Reference-photo relevance (`none` / `optional` / `required`) is tracked
**per drill/full-exercise variant**, not per skill — the design doc's
prose sometimes blanket-stated it for a whole skill. Two places required
judgment calls to split it correctly:

- **Proportion by eye**: drills 1–2 (real objects) → `required`; drill 3
  (dividing an abstract rectangle, no real subject) → `none`.
- **Measuring angles and lengths**: drill 1 (self-check against a
  protractor, no external subject) → `none`; drills 2–3 and both full
  exercises (real objects) → `required`, matching the skill's blanket
  "YES, needed" statement.

**Videos and materials were missing from the first Stage 2 handoff** and
added in a follow-up pass from a separate addendum file:
- Every skill now carries a `videos` array (1–3 curated links, trusted
  channels flagged vs. "secondary source").
- A separate top-level `MATERIALS_REFERENCE` block holds general
  pencil/eraser reference content — explicitly *not* a tracked skill, no
  reps/pass-fail.
- Confirmed this required zero changes to the already-built Stage 3
  selection engine, since it only ever reads bank fields by name.

---

## 4. Selection engine (Stage 3) — assumptions made where the design doc gave no formula

All three were flagged and confirmed by you as reasonable defaults:

1. **Selection weighting formula**: each working-set skill gets a base
   weight of 1 ("every skill still gets some airtime"), +1 for every rep
   in its last-3 window that had a failed criterion. Open-ended skills
   never carry a fail bonus (no pass/fail concept), so they sit at the
   base weight.
2. **Drill vs. full-exercise ratio**: 50/50 whenever a skill has both
   available; drill-only when it doesn't (value-scale).
3. **Not-assessable granularity**: per-**skill** all-or-nothing — if *any*
   criterion for a touched skill comes back not-assessable, that whole
   skill's result for the submission is discarded (no rep, no evidence),
   rather than partial credit for the criteria that *were* judgeable, and
   rather than discarding the entire multi-skill submission. Your
   reasoning: err toward more reps, not fewer — not building this to be
   gamified or optimized for speed.

Two further implementation decisions not explicitly covered by the doc:

- **Evidence-array ordering convention fixed explicitly**: skill-level
  `primaryEvidence`/`fullEvidence` are chronological (push, oldest→newest;
  "most recent N" = `slice(-N)`), while `state.submissions` stays
  newest-first (unshift), matching the original app's history-list
  convention. Called out clearly in code comments since mixing the two
  conventions up would be an easy, silent bug.
- **Declining a pass confirmation wipes `primaryEvidence` alongside the
  rep counter**, not just the counter — needed so the two stay in
  lockstep for the next recent-window check. `fullEvidence` (selection
  weighting / diagnostic history) is left untouched. The design doc only
  explicitly mentioned resetting the counter.

---

## 5. Session screen (Stage 4)

- **The old "revisit an earlier lesson" feature was removed entirely** —
  it only made sense against a fixed linear lesson list. There's no
  equivalent in the skill-rotation model; a skill resurfaces naturally via
  incidental exposure or the passed-skill refresh rule instead.
- **Warmup timing**: runs once per newly-initiated lesson/session (your
  clarification), tracked as in-memory (non-persisted) state — not once
  per page load as I'd first guessed, and not tied to any fixed calendar
  cadence.
- **The old fixed-lesson-position progress bar (pegs) is gone**, replaced
  with a simple "X/16 skills passed" counter in the header, since there's
  no single linear position left to show a bar for.
- Struggle-tag / remedial-mode UI removed (superseded by the Stage 3
  pass-criteria system).

---

## 6. AI feedback call (Stage 5)

- **Response format**: the AI returns results **by position** — a
  `results: ["pass","fail",...]` array per checkable skill, index-matched
  against criteria the client already knows (from the bundle), rather than
  having the AI echo criterion text back. Chosen for robustness (no risk
  of the AI paraphrasing/drifting on criterion wording). A
  length-mismatch or missing-skill response throws before it can touch
  `processFeedback`/state.
- **Added one optional overall `tip` field** (nullable, expected to be
  empty most of the time) so `MATERIALS_REFERENCE` has a concrete place to
  surface — the design doc says the AI "may optionally draw on" that
  content, but the new strict per-criterion pass/fail format had no
  natural slot for a freeform pencil/eraser aside. This was a genuine gap;
  you chose to add the field rather than leave the reference data unused.
- The old freeform strengths/focus_areas/encouragement fields are fully
  retired, replaced by strict per-criterion results — this was the
  explicit point of section 4 (eliminating the old app's formulaic
  2-strengths/2-focus/1-encouragement pattern).

---

## 7. Skills view (Stage 6)

Built as specified in section 9 — no deviations. One implementation note:
it's a session-only UI toggle (a "View your 16 skills" link), not a
separate route/page, and is hidden while a pass confirmation is pending
(section 7's decision point stays the one place that state gets resolved).

---

## 8. Stage 7 (pass confirmation)

Ended up built as part of Stages 3–4 rather than as its own separate pass
— the engine logic (`confirmPass`/`declinePass`) landed in Stage 3, the
dedicated confirmation screen in Stage 4. Functionally complete per
section 7; just noting it wasn't a discrete final stage the way the
handoff's build order implied.

---

## 9. Post-build addition: direct camera capture

Not part of the original design doc at all — added after the initial
build/deploy, per your request. Both photo inputs (drawing + reference)
now carry `capture="environment"`, which prompts mobile browsers to offer
the rear camera directly alongside the normal file/gallery picker.

---

## Known open item (not yet resolved)

You flagged after live testing that **incidental-skill feedback may not
be calling/behaving correctly** — not yet diagnosed. Needs a few more
real iterations to pin down what's actually happening before treating it
as a confirmed bug.
