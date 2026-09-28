---
name: onboarding-tone
description: House style for user-facing German microcopy in Household App byStonies — especially the money onboarding (app/expenses/onboarding/) and any other onboarding, financial, or first-run screen. Use this whenever writing or reviewing text a user reads in this app: screen titles, labels, placeholders, buttons, empty states, error/feedback messages. Trigger even if the request doesn't say "copy" or "tone" explicitly — e.g. "add a new step to the onboarding", "what should this button say", "the empty state feels off", "write the label for this field". Also use it when reviewing someone else's copy for consistency with the rest of the app.
---

# Onboarding Tone

This app's onboarding flows (money onboarding, Verteilertopf setup, feature intros)
talk to someone managing their household finances, not filling out a form. The
existing copy in `app/expenses/onboarding/copy.ts` is the reference implementation
of this tone — read it for real examples before writing new text.

## The four rules

1. **Du-Form.** Always informal "du", never "Sie". Address the person directly,
   from their point of view — ask what they see and do, not what the system needs.
2. **Warm.** Sound like a person who's on their side, not a system logging data.
3. **Kurz.** One idea per sentence. Cut qualifiers and hedging. If a sentence
   needs a comma to explain itself, look for two sentences instead.
4. **Kein Urteil.** Never grade, warn, or moralize about someone's numbers. A
   tight budget is a starting point, not a problem to feel bad about.

## Why this matters here specifically

People opening the finance onboarding are often anxious about money already.
Copy that sounds like an interrogation or a bank form adds friction exactly
where the app is trying to build trust. Every rule below exists to remove a
specific way that friction shows up — not as an arbitrary style preference.

## Examples (system voice → person voice)

| Instead of | Write |
|---|---|
| "Nettoeinkommen eingeben" | "Was landet jeden Monat ungefähr auf deinem Konto?" |
| "Pflichtfeld: Betrag" | *(don't force it — leave it optional and move on)* |
| "Fehler: ungültige Eingabe" | "Da stimmt was mit der Zahl nicht, magst du nochmal schauen?" |
| "Budget überschritten" | "Da ist es gerade eng." |
| "Ziel auswählen (1 erforderlich)" | "Was ist dir wichtig?" |
| "Einkommen variabel: ja/nein" | "Mein Einkommen schwankt" |

## Do

- Address the person directly ("du", "dein Konto", "dir bleiben").
- Keep sentences short — read them out loud; if you run out of breath, split them.
- Give every sensitive question a real out: "Weiß ich gerade nicht", "Später",
  or simply let the field stay empty without blocking progress.
- Describe a negative or tight result neutrally and supportively — name what's
  true, then point forward ("Das ist ein guter Startpunkt, um gemeinsam
  hinzuschauen."), never "you're overspending" or "you're behind".
- Explain any term a first-time user might not know, inline, in the question
  itself, instead of assuming financial vocabulary.

## Don't

- Don't use financial or banking jargon without explaining it in plain words
  (no "Nettoeinkommen", "Liquidität", "Budgetüberschreitung" on user-facing
  screens — save precise terms for internal code/variable names only).
- Don't use red, warning icons, or alarm-toned language for money that's tight
  or a goal that isn't met yet. Neutral surfaces and calm copy only — no
  `--danger` styling on onboarding results, even when the number is negative.
- Don't force precision. "Ungefähr" and ranges (von/bis) are first-class, not
  a fallback — don't phrase a question as if an exact number is expected.
- Don't over-explain or hedge ("Falls du möchtest, könntest du eventuell...").
  Say the thing plainly and briefly.
- Don't go for exclamation points, emoji, or forced enthusiasm ("Super
  gemacht!!! 🎉"). Warm doesn't mean loud — a plain "Gut, das reicht schon."
  does more than an exclamation mark.

## When reviewing existing copy

Check each string against the four rules above in order. If a string fails
"kein Urteil", fix that first — it's the rule most likely to make someone feel
bad about opening the app. Then check for jargon, then length, then tone.
