# Drawing tutor app — design document

Status: design and architecture fully locked, including two rounds of bench
testing (self-trace + independent ChatGPT review). Next step is agreeing a
staged build order, then coding.

This replaces the app's current fixed 8-lesson curriculum with a dynamic
engine built around 16 tracked skills.

---

## 1. The 16 skills

**Foundations**
1. Line confidence — no prerequisite
2. Circle/curve control — no prerequisite
3. Ellipse consistency — requires Circle/curve control

**Perspective**
4. 1-point perspective — requires Line confidence
5. 2-point perspective — requires 1-point perspective
6. Perspective in real spaces (interiors) — requires 2-point perspective

**Proportion & measurement**
7. Proportion by eye — no prerequisite
8. Measuring angles and lengths — requires Proportion by eye

**Form**
9. Cylinders — requires Circle/curve control
10. Spheres — requires Circle/curve control
11. Boxes as volume — requires 1-point perspective

**Value & shading**
12. Value scale control — no prerequisite
13. Rendering form with shading (open-ended) — requires Value scale control
14. Light source consistency (open-ended) — requires Rendering form with shading

**Composition**
15. Combining multiple objects (open-ended) — requires Proportion by eye AND one form skill
16. Drawing from observation vs imagination (open-ended) — no prerequisite

Skills 1–12 are **checkable** (pass/fail). Skills 13–16 are **open-ended**
(never pass — periodic "are you happy with this?" check-ins instead).

**Pass rule for checkable skills:** 5 logged primary reps, with no failed
criteria in the most recent 2–3 reps.

---

## 2. Exercise bank

Each skill has a bank entry containing:
- Specific pass criteria (checkable skills) or assessment notes (open-ended
  skills) — concrete things the AI checks for, never a freeform label it
  invents itself
- A handful of **drill** variants — short, isolated technique reps
- A handful of **full exercise** variants — real subjects/scenes, which may
  be tagged as also touching other skills "incidentally"
- Some drills/exercises are deliberately open-ended on subject matter (e.g.
  "draw a geometric shape" rather than a fixed shape), so the difficulty can
  be varied by the user's own choice of subject without needing more bank
  entries
- A flag for whether an optional second "reference photo" upload is useful
  for that specific exercise (e.g. a photo of the object being copied)

**Confirmed decisions:**
- Value scale control has no full exercise — it's a pure isolated drill,
  intentionally
- Combining multiple objects has drills that are simplified versions of its
  own full exercises, since the skill is inherently about combination

---

## 3. Reference photo upload

- Optional second photo upload, per-exercise (not always shown) — for
  exercises where comparing to a reference (the object being copied, a
  face, etc.) helps the AI judge accurately
- Each bank entry flags whether this is relevant, and what the photo should
  be of
- Self-contained change to the existing app; doesn't depend on the rest of
  this rewrite

---

## 4. AI assessment approach

- The AI assesses each skill against its **specific written pass criteria**
  — never inventing its own freeform "struggle tag," which is what the
  current app does and which produces inconsistent, formulaic feedback
- The prompt must allow a **variable number** of feedback points — not
  padded or trimmed to a fixed count. (The current app tends to fall into a
  fixed pattern of 2 strengths / 2 areas to improve / 1 encouraging line
  regardless of how many real issues are present — this must not carry over)
- Every per-criterion result has **three** possible outcomes: pass, fail, or
  **not-assessable**. Not-assessable is used when the photo genuinely can't
  be judged (blurry, cropped, bad lighting, missing/mismatched reference
  photo). A not-assessable result:
  - Does NOT count as a rep
  - Does NOT affect pass progress in any way
  - Produces a plain "please retake the photo" message, with no other
    action taken

---

## 5. Data model

### Per skill (all 16)
- **Primary rep count** — reps where this skill was the exercise's main
  target. Counts toward the pass rule. For open-ended skills, this is an
  exposure counter only (no pass path exists) — it should never be read as
  a progress measure
- **Incidental rep count** — reps where this skill was touched as a side
  effect of an exercise targeting a different skill. Tracked separately;
  does NOT count toward the pass rule, but still produces full feedback
  every time
- **Two separate evidence histories** (this split matters — a single
  combined field would let an incidental failure on an already-passed
  skill leak into its pass status):
  1. **Primary-only evidence** — used only to evaluate the pass rule
  2. **Full evidence** (primary + incidental) — used for selection
     weighting
- **Pass status:** not-started / in-progress / passed
- **Open-ended skills only:** last check-in date

### Per submission (one round of feedback)
- Date
- Which exercise was served (skill(s), drill vs full, which variant)
- A **snapshot** of the actual criteria/task text as sent to the AI at that
  moment — not just a reference to the current bank entry. This protects
  old history from becoming misleading if the bank wording is edited later.
  (Storage cost checked: roughly 50KB over 100 exercises — trivial next to
  the photos themselves)
- The drawing photo, plus reference photo if used
- For every skill touched (primary AND incidental): per-criterion
  pass/fail/not-assessable, or a written note for open-ended skills

### Notes on what was deliberately removed
- There is no "repeat" flag. Reps are tracked **per skill**, not per
  exercise — any genuine new drawing submission counts as a rep for every
  skill it touches, regardless of whether the exercise itself is new or
  has been served before. A bad photo of an existing drawing is simply
  handled as not-assessable and logs nothing.
- There is no "overridden-still-working-on" status — replaced entirely by
  the pass confirmation step (section 7).

---

## 6. Selection logic (how the app decides what to serve next)

- A **working set of up to 5 skills** is kept in rotation — skills that
  haven't passed yet. ("Up to 5," not always exactly 5 — see note below.)
- The working set starts as the 5 no-prerequisite skills: Line confidence,
  Circle/curve control, Proportion by eye, Value scale control, Drawing
  from observation vs imagination
- **Prerequisites are a hard gate for entering the working set** — a skill
  cannot enter rotation until its prerequisite(s) have passed. Once a skill
  is in the working set, prerequisites have no further effect.
- Within the working set, selection uses **weighted probability**, not
  strict priority — weaker/more foundational skills get picked more often,
  but every skill still gets some airtime. Weighting is based on the full
  evidence history (primary + incidental) from the last 2–3 reps.
- **First-pass exception:** with zero submission history there's nothing to
  weight on. The very first pass through the initial 5-skill working set
  serves each skill once, in listed order. Real weighting starts after that.
- Passed skills keep appearing as pure incidental exposure through other
  exercises, without taking a working-set slot.
- **Passed-skill refresh rule:** a passed skill can still be served as a
  full exercise's *primary* skill, but only if that exercise also
  incidentally touches at least 2 currently-active working-set skills.
  This happens at roughly 4-in-20 selections, randomly distributed (not on
  a fixed schedule).
- Open-ended skills, once they enter the working set, stay there
  permanently (no pass, so no mechanism to free the slot). This is part of
  why the working set is "up to 5" rather than always exactly 5 — once all
  12 checkable skills have passed, only the 4 permanent open-ended skills
  remain, and there's no 5th slot to fill. (By that point the user will be
  well advanced, so this is an acceptable eventual state, not a flaw.)
- Same skill can be selected twice in a row. Same specific bank **variant**
  cannot be repeated immediately — except when a skill only has one variant
  available, in which case repeating it is allowed by necessity.
- **Working-set backfill tiebreak**, when multiple skills become newly
  eligible at once and there isn't room for all of them:
  1. If there's room for all newly-eligible skills, add all of them (no
     tiebreak needed)
  2. A skill with two prerequisites (currently only Combining multiple
     objects) outranks a single-prerequisite skill becoming eligible at
     the same time
  3. Where two single-prerequisite skills become eligible from the same
     triggering skill passing, use fixed order: 2-point perspective before
     Boxes as volume (both triggered by 1-point perspective passing) — the
     only instance of this in the current 16-skill list
  4. Otherwise, fall back to listed order

---

## 7. Pass confirmation step

Replaces the earlier "manual override" idea entirely.

- The moment the selection engine determines a skill has met its pass
  criteria, it does **not** silently mark it passed. It presents a
  confirmation decision: "you've met the criteria for this skill — pass it
  now, or keep working on it?"
- **If confirmed:** status becomes passed, the skill leaves the working
  set, and the next eligible skill enters via the backfill tiebreak rules
  above
- **If declined:** the skill's primary rep count resets to 0 and it stays
  in the working set as an ongoing skill — a genuine fresh start, not a
  soft flag. (Deliberate choice: if not genuinely ready, a full reset is
  honest; if actually ready, only 5 more reps are needed to get back to
  this decision point.)
- This is the only point at which this decision is ever made — there's no
  separate mechanism to reactivate a skill that passed long ago.

---

## 8. Session warmup

- A short, unscored warmup runs before every session — no photo, no AI
  feedback, doesn't touch rep counts or pass criteria at all
- Draws from: Foundations skills that have passed or are in-progress, plus
  whatever's currently active in the working set
- Skills stay in the warmup rotation permanently once added, even after
  they later pass and leave the main working set — the warmup accumulates,
  it never shrinks
- Capped at 3 items per session, regardless of how many skills are
  eligible
- **Selection when more than 3 are eligible:** simple random choice of 3
  each session — no weighting, no fixed rotation

---

## 9. Skills view screen (user-facing)

- Purely informational and fully **read-only** — no interactive controls
  at all (the pass confirmation step happens during the session flow, not
  here)
- Three categories:
  - **Passed**
  - **In rotation** — the current working set (up to 5 skills, including
    any open-ended skills once they've entered it)
  - **Future skills** — everything not yet in the working set, shown as a
    plain list with **no reason or prerequisite shown** next to each
    (deliberate — avoids fixating on rushing toward a specific future
    skill)
- Open-ended skills simply show a status of "open-ended" here — no
  check-in history or last-check-in date displayed

---

## 10. Architecture

### Component responsibilities

- **Exercise bank** — passive, static reference data. Never decides
  anything.
- **Selection engine** — the only active decision-maker. Reads the bank and
  the data layer to decide what to serve next (including warmup), bundles
  the full exercise package (skill(s), criteria, task text, variant,
  reference-photo flag) as a single unit, and — critically — **also
  receives the AI's raw feedback result and processes it** into updated
  skill state (rep counts, evidence histories, pass checks, triggering the
  pass confirmation step, managing working-set backfill) before writing to
  the data layer.
- **Session screen** — mostly passive. Displays the bundle it's handed,
  collects the user's photo(s), passes the bundle + photos forward as-is.
  Never re-fetches anything from the bank independently.
- **AI feedback step** — active, but only within the shape it's handed
  (judges against criteria it received, doesn't decide what the criteria
  are). Hands its raw result to the selection engine — it does **not**
  write to the data layer directly.
- **Data layer** — fully passive. Only stores and returns data; never
  makes decisions.
- **Skills view screen** — fully passive. Reads and displays status only;
  no writes at all (the old "override toggle" is gone, since pass
  confirmation now happens in-session).

### Data flow

```
Exercise bank ──────▶ Selection engine ◀────── Data layer
                            │      ▲                ▲
                            ▼      │                │
                     Session screen│                │
                            │      │                │
                            ▼      │                │
                      AI feedback ─┘                │
                                                     │
                                        Skills view ─┘ (reads only)
```

In words: the bank feeds the selection engine only. The selection engine
bundles a decision, hands it to the session screen, which hands it plus
photos to the AI feedback step. The AI's raw result goes back to the
selection engine — never straight to the data layer — which processes it
and only then writes the finished result to the data layer. The skills
view screen reads from the data layer and writes nothing.

### Key discipline note (for coding, not a structural rule)

Within the selection engine's own logic, keep a clean boundary between:
- **Pulling** data (reading the bank + data layer to decide what to serve
  next)
- **Pushing** data (writing processed results back after feedback arrives)

This isn't a different component — it's an internal discipline to avoid
the engine reading stale data mid-decision.

### Guiding principle

One place (the selection engine) owns all "what happens next" thinking
**and** all "what just happened" processing. Every other component either
stores data, displays it, or performs the one narrow judgement task it's
built for.

---

## 11. Bench testing — summary

Two rounds of testing were run before locking this design, specifically
because self-assessment alone is unreliable for catching design gaps.

**Round 1 (Claude self-trace)** found and resolved 4 gaps: no defined
starting weighting behaviour, whether a passed skill could still be a
primary skill, confirming open-ended/checkable skills coexist correctly in
one submission, and the working-set backfill tiebreak.

**Round 2 (independent ChatGPT review)** found 11 further structural gaps,
all resolved and folded into the sections above:
1. Working set couldn't stay at exactly 5 forever → changed to "up to 5"
2. No component explicitly owned turning AI feedback into updated state →
   selection engine now explicitly does this
3. "Prerequisites never hard-block" contradicted "only eligible skills get
   added" → wording fixed (hard gate for entry, no effect once inside)
4. Passed-skill refresh had no actual selection mechanism → now a defined
   rule (≥2 active skills touched, ~4-in-20 frequency, random)
5. Mastery evidence and diagnostic evidence were conflated → split into
   two separate histories
6. No "can't assess this photo" state existed → added not-assessable
7. "Fresh vs repeat" was ambiguous → removed entirely
8. Override semantics were self-contradictory → replaced with the pass
   confirmation step
9. Warmup had no selection rule when oversubscribed → resolved (random 3)
10. No historical reproducibility if the bank changes later → resolved
    (per-submission snapshot)
11. Zero-candidate risk when a skill has only one variant → resolved
    (repeating the only variant is allowed)

ChatGPT confirmed the core "one active decision-maker" architecture
principle is sound — all fixes were state-machine/definition gaps, not
reasons to change the component boundaries.

---

## 12. Still to do

1. Agree a staged build order (not one big rewrite in one go)
2. Code the rewrite. Current app is plain HTML/JS using `window.storage`;
   per the tutors-repo conventions this will eventually move to
   `localStorage` + a user-supplied API key for self-hosting on GitHub
   Pages
