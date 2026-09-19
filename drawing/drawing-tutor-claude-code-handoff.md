# Drawing tutor app — build handoff

## Context

I'm rebuilding a drawing tutor app from a fixed 8-lesson curriculum into a
dynamic 16-skill tracking engine. The full design has been scoped and
bench-tested (including an independent review) in a separate planning
session — it is fully locked, not up for renegotiation, and is provided in
full below. Your job is to build it, staged as described in section "Build
order" below — not to re-derive or re-question the design itself, though
you should flag it plainly if you hit a genuine contradiction or
implementation blocker while building.

## Files

- The current live app is a single self-contained HTML file (plain
  HTML/JS, using `window.storage` for persistence) — I'll attach/paste it
  separately. Treat this as the starting point to edit and extend, not
  something to throw away and rebuild from scratch — the existing page
  structure, styling, and upload-zone UI are reusable.
- The full design document is below in this prompt.

## Build order (staged — please build and let me review each stage before
moving to the next, rather than doing this as one big rewrite)

**Stage 1 — Data model rewrite**
Replace the current lesson-based state object with the new per-skill data
structure described in section 5 of the design doc below. No new features
or UI changes yet — just get the storage shape right, since every later
stage depends on it.

**Stage 2 — Exercise bank**
Add the full 16-skill exercise bank as static reference data (pass
criteria/assessment notes, drill variants, full exercise variants,
incidental-skill tags, reference-photo relevance flags) per section 2 of
the design doc. I will supply the actual drafted content for each skill
separately — for this stage, build the structure/shape the bank data
should take, and I'll confirm the content fits before we move on.

**Stage 3 — Selection engine**
Build the actual decision logic per sections 6, 7, 8, and 10 of the design
doc: working set management, weighted selection, the first-pass exception,
the working-set backfill tiebreak, the passed-skill refresh rule, warmup
selection, and the feedback-processing responsibilities (turning the AI's
raw feedback into updated skill state, triggering the pass confirmation
step). This is the highest-risk stage — please test it against
simulated/fake data before wiring it into the real UI, so we can verify
the logic works before it's live.

**Stage 4 — Session screen rewrite**
Update the exercise-taking screen to work from bundles produced by the
selection engine, instead of the old fixed lesson array. Also add the
optional second (reference) photo upload here, shown only when the
current exercise's bank entry flags it as relevant (section 3 of the
design doc) — this was originally scoped as a self-contained change but
we're folding it into this stage since it naturally belongs on this
screen.

**Stage 5 — AI feedback call rewrite**
Rewrite the prompt and response handling per section 4 of the design doc:
send the bundle the session screen already has (never re-fetch bank data
independently), support a variable number of feedback points (not padded
or trimmed to a fixed count), and return pass/fail/not-assessable per
criterion rather than the old freeform struggle-tag string. Per the
architecture (section 10), this step's raw result goes back to the
selection engine — it must NOT write to the data layer directly.

**Stage 6 — Skills view screen (new)**
Build the new read-only screen per section 9 of the design doc: Passed /
In rotation / Future skills categories, reading only from the finished
data model, no interactive controls.

**Stage 7 — Pass confirmation step**
Wire in the in-session "you've met the pass criteria — confirm, or keep
working on it?" moment per section 7 of the design doc.

## Important architectural constraints (do not deviate from these without
flagging it to me first)

- One active decision-maker: the selection engine is the only component
  that makes decisions or processes AI feedback into state changes. The
  exercise bank, data layer, and skills view screen are all passive — see
  section 10 of the design doc for the full component responsibility
  breakdown and the corrected data flow (AI feedback → selection engine →
  data layer, not AI feedback → data layer directly).
- Every submission stores a snapshot of the actual criteria/task text sent
  to the AI, not just a reference to the bank entry (section 5) — this
  matters for historical accuracy if the bank is edited later.
- Persistence is currently `window.storage` (Claude artifact environment).
  Per this project's existing conventions, this will eventually move to
  `localStorage` + a user-supplied Anthropic API key for self-hosting on
  GitHub Pages — but that migration is a separate future step, not part of
  this build. Keep the current `window.storage` approach for now unless I
  say otherwise.

## Full design document

[Paste the contents of drawing-tutor-design-doc.md here]

## What I want from you right now

Please start with Stage 1 only. Show me the new data model structure
before writing any UI or logic code around it, so I can confirm it's
right before you build on top of it.
