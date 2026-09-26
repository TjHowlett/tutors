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
  cadence. **Superseded by section 13:** the warm-up now runs on every page
  open.
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
were given `capture="environment"`, intended to offer the rear camera
directly alongside the normal file/gallery picker.

**Superseded by section 11** — on phones that setting turned out to force
the camera and remove the gallery option entirely, so it was replaced with
two separate controls.

---

## 10. Post-launch bug fix (2026-09-19): first-pass exception stuck on the first skill

**Symptom you reported:** 4 real submissions in, all 4 had Line confidence
as the primary skill. Proportion by eye and Drawing from observation vs
imagination had only appeared as *incidental* skills (via Line
confidence's own full-exercise variants), never their own primary turn —
this also explains the "incidental-skill feedback may not be calling
correctly" item flagged as an open question in the previous version of
this changelog. There wasn't a separate incidental-feedback bug; it was
this.

**Root cause:** `pickPrimarySkill()` read `state.firstPassRemaining[0]`
to decide what to serve next during the first pass, but nothing anywhere
in the app ever removed an entry from that array once serving it — it was
set once at state creation and never touched again. So it permanently
returned the first listed skill (`line-confidence`) forever instead of
advancing through the initial 5.

**Why the Stage 3 test suite didn't catch it:** the original test for
this exact behavior manually called `state.firstPassRemaining.shift()`
itself, to simulate what the app "should" do after each pick — which
proved the *queue's order* was correct without ever proving the *app*
advances it. A real gap in the test's design, not just an edge case.

**Fix:** `processFeedback()` now shifts the front entry off
`firstPassRemaining` once its skill has just received a real primary
result, with two deliberate exceptions:
- **Incidental exposure to another queued skill does not consume its
  turn** — e.g. Line confidence's full-exercise variant touching
  Proportion by eye incidentally does not count as Proportion by eye's
  own dedicated turn.
- **A not-assessable primary result does not consume the turn either**,
  consistent with section 4's "not-assessable... no other action taken."

The test suite was corrected to go through the real
`selectNextExercise()` → `processFeedback()` path with no manual
shifting, plus two new regression tests specifically covering the two
exceptions above. All 97 assertions pass.

**Status:** fixed and pushed (`TjHowlett/tutors` commit `fd0039c`). You
confirmed live that it now correctly advances Line confidence → Circle/curve
control after one rep.

---

## 11. Post-launch bug fix (2026-09-25): photo upload only opened the camera

**Symptom you reported:** after the camera-capture addition (section 9),
tapping upload on a phone went straight to the camera and there was no way
to choose an existing photo from the gallery/files.

**Root cause:** `capture="environment"` tells the phone to skip its normal
picker and open the camera directly. It's a hint that removes the choice,
not one that adds the camera as an extra option.

**Fix:** each photo (the drawing, and the reference photo where an exercise
uses one) now has two separate controls:
- Tapping the upload box opens the normal gallery/file picker (no `capture`).
- A separate "Take photo with camera" button (and "Take reference photo with
  camera") opens the camera directly (uses `capture`).

Chosen over simply removing `capture` because two explicit controls behave
the same on every phone, whereas a single input leaves the choice of
camera-versus-gallery up to each browser.

**Also fixed in passing:** the raw browser "Choose file" boxes were visible
on the page (a leftover from Stage 4 — the CSS hid file inputs only inside
the upload box, and these sat outside it). They're now hidden.

**Verification:** checked in a desktop preview only (each upload box triggers
the gallery input, each camera button triggers the camera input, no raw
inputs visible). It has **not** been confirmed on a real phone camera — that
check was left for you to do on the live site.

**Status:** pushed (`TjHowlett/tutors` commit `f8240eb`).

---

## 12. Enhancement (2026-09-26): saved in-progress exercise + manual re-roll

**Problem:** the exercise chosen by the selection engine only lived in the
page's memory. Leaving the page (switching apps, closing the tab, a reload)
lost it — you'd come back to a different exercise and could no longer submit
the one you'd actually been drawing. Real cost: about an hour of drawing.

**Change 1 — the loaded exercise is now saved.**
- A new field, `state.activeExercise`, holds the whole exercise bundle
  (skill, drill/full variant, task text, criteria/assessment wording,
  incidental skills, reference-photo requirement) the moment it's chosen. It
  lives inside the existing saved progress, so no extra storage key.
- Reopening the page restores that exact exercise instead of calling the
  selection engine again. (As first built, this also skipped the warm-up;
  that was changed later the same day — see section 13.)
- The saved exercise **clears** when a submission is recorded, and when the
  exercise is skipped or re-rolled.
- **Exception:** if the AI can't judge the photo at all (everything comes
  back not-assessable), the saved exercise is deliberately kept so the same
  exercise can be retried.
- A saved exercise that looks damaged or incomplete is ignored and replaced
  by a normal fresh one rather than crashing the page. Older saves that
  predate the new field load normally.

**Change 2 — "↻ Give me a different exercise".**
- Shown at the bottom of the exercise card until feedback is given.
- Discards the loaded exercise **without counting a rep or touching any
  skill data or history**, then re-rolls through the normal selection engine.
- It retries a few times so you don't get the identical exercise straight
  back. This is done in the button's own code — the selection and weighting
  logic itself was not changed, per the brief.
- If a photo has already been added, it asks you to confirm first, because
  the photo would be discarded.

**Deliberate limits (things that did not fit the brief as written):**
- **Photos are still not saved.** Only the exercise is restored, so if you
  lose the page mid-drawing you'll get the same exercise back but must
  re-take the photo. Saving photos would be a much bigger change — phone
  photos are large and browser storage is small — and section 2's earlier
  decision was that photos are never persisted.
- **No change** to how submissions are scored or stored.
- The first time the new version loads, any exercise that was open in the
  previous version is gone, because the previous version never saved it.

**Verification:** 23 simulated checks (repeated reloads restore the same
exercise; re-roll changes the exercise, touches no skill data and itself
survives a reload; submitting clears the saved exercise; damaged and
old-format saves load safely) plus the existing 97 engine checks, all
passing. Simulated in a test harness, **not** tested on a real phone.

**Status:** pushed (`TjHowlett/tutors` commit `d113c48`).

---

## 13. Follow-up (2026-09-26, later the same day): warm-up on every page open

**Change:** section 12 originally skipped the warm-up whenever a saved
exercise was being restored. That was reversed: the warm-up now runs **every
time the page is opened**, whether or not a saved exercise is waiting.

**Behaviour now:**
- Opening the page always shows a warm-up first. It's a fresh random pick each
  time and is still not saved.
- After the warm-up is dismissed, the same saved exercise appears, untouched.
- No "session" boundary is defined; the warm-up simply fires on load.

**This supersedes** two earlier statements: section 12's "skips the warm-up
when restoring", and section 5's reading that the warm-up runs "once per
newly-initiated lesson/session".

**Not changed:** the exercise saving and the "↻ Give me a different exercise"
button behave exactly as described in section 12.

**Verification:** 14 simulated checks (the warm-up shows on repeated opens, the
saved exercise stays intact behind it, the same exercise appears after it, and
a re-rolled exercise still survives a reload). Simulated only, **not** tested
on a real phone.

**Status:** pushed (`TjHowlett/tutors` commit `8c0e77a`).

---

## Known open items

None outstanding as of 2026-09-26. Still to confirm on a real phone: the two
camera/gallery paths (section 11), and the reload-restores-same-exercise and
warm-up-on-every-open behaviour (sections 12 and 13) were only verified in
simulation.
