# PM Training — Design System & UX Decisions

## Overview

This document describes the complete design system applied during the product-level overhaul of PM Training. Every decision is intentional and grounded in product thinking, accessibility, and premium SaaS conventions.

---

## 1. Design Philosophy

The redesign follows three core principles:

**Clarity over decoration.** Every element earns its place. No gradients, no decorative shapes, no visual noise. The content — the challenge, the feedback, the score — is the hero.

**Trust through consistency.** A user who sees the same button style, spacing rhythm, and typographic hierarchy on every screen builds subconscious trust. Inconsistency signals "prototype." Consistency signals "product."

**Delight through restraint.** Micro-animations (fade-up, pop-in, score bar fill) are used sparingly and purposefully. They communicate state changes, not decoration.

---

## 2. Color Palette

| Token | Value | Usage |
|---|---|---|
| `--color-bg` | `#F9FAFB` | Page background |
| `--color-surface` | `#FFFFFF` | Cards, inputs, modals |
| `--color-border` | `#E5E7EB` | Default borders |
| `--color-border-strong` | `#D1D5DB` | Hover/focus borders |
| `--color-text-primary` | `#111827` | Headlines, labels, key content |
| `--color-text-secondary` | `#4B5563` | Body copy, descriptions |
| `--color-text-tertiary` | `#9CA3AF` | Placeholders, metadata, captions |
| `--color-accent` | `#6366F1` | Primary interactive elements (Indigo) |
| `--color-accent-hover` | `#4F46E5` | Accent hover state |
| `--color-accent-light` | `#EEF2FF` | Accent backgrounds, selected states |
| `--color-success` | `#10B981` | Correct answers, completion |
| `--color-warning` | `#F59E0B` | Hints, caution states |
| `--color-error` | `#EF4444` | Wrong answers, validation errors |

**Why this palette?** The near-black primary (`#111827`) with light gray background (`#F9FAFB`) creates a clean, high-contrast canvas reminiscent of Stripe and Linear. The indigo accent (`#6366F1`) is modern, distinctive, and widely associated with intelligence/technology products without feeling corporate.

---

## 3. Typography Scale

| Token | Size | Usage |
|---|---|---|
| `--font-size-xs` | 11px | Labels, metadata, uppercase caps |
| `--font-size-sm` | 13px | Body copy, MCQ options, descriptions |
| `--font-size-base` | 15px | Default UI text, card titles |
| `--font-size-md` | 16px | Emphasized body |
| `--font-size-lg` | 18px | Section headings |
| `--font-size-xl` | 22px | Stats, scores |
| `--font-size-2xl` | 28px | Page headings |
| `--font-size-3xl` | 36px | Hero numbers |

**Font:** Inter (Google Fonts) with system font fallback. Inter is the de facto standard for premium SaaS products (Linear, Vercel, Notion, Stripe). Its optical sizing and variable weight support make it ideal for both UI and long-form content.

**Letter spacing:** `-0.011em` globally, `-0.03em` on headings. Negative tracking on large text is a hallmark of premium typography (Apple, Tesla).

---

## 4. Spacing System (8pt Grid)

All spacing tokens are multiples of 4px, following an 8pt grid system:

| Token | Value |
|---|---|
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-5` | 20px |
| `--space-6` | 24px |
| `--space-8` | 32px |
| `--space-10` | 40px |
| `--space-12` | 48px |
| `--space-16` | 64px |

---

## 5. Border Radius

| Token | Value | Usage |
|---|---|---|
| `--radius-sm` | 6px | Inputs, small elements |
| `--radius-md` | 10px | Buttons, MCQ options |
| `--radius-lg` | 14px | Cards, panels |
| `--radius-xl` | 20px | Large modals, hero elements |
| `--radius-full` | 9999px | Badges, pills, avatars |

---

## 6. Shadow Elevation

| Token | Usage |
|---|---|
| `--shadow-sm` | Default card elevation |
| `--shadow-md` | Hover states, dropdowns |
| `--shadow-lg` | Modals, toasts |
| `--shadow-xl` | Toast notifications |

---

## 7. Component Library

### Buttons

| Class | Usage |
|---|---|
| `.btn-primary` | Primary CTA (dark background) |
| `.btn-secondary` | Secondary action (white + border) |
| `.btn-ghost` | Tertiary/back navigation |
| `.btn-accent` | Accent CTA (indigo) |
| `.btn-success` | Completion/positive actions |
| `.btn-lg` | Large CTAs (full-width forms) |
| `.btn-sm` | Compact actions in topbar |

All buttons have: hover lift (`translateY(-1px)`), active reset, focus ring, disabled opacity.

### Cards

`.card` — white surface with border and shadow. Used for all content containers.
`.card-hover` — adds hover elevation for interactive cards.
`.card-accent` — indigo border/glow for highlighted states.

### Badges

`.badge-neutral` — gray, for track labels, metadata.
`.badge-accent` — indigo, for selected/active states.
`.badge-success` — green, for completed items.
`.badge-warning` — amber, for hint labels.
`.badge-error` — red, for error states.

### MCQ Options

Four states: default → selected (indigo) → revealed-correct (green) → revealed-wrong (red). The correct answer is always highlighted green after reveal, regardless of whether the user selected it.

---

## 8. Animation System

| Class | Behavior | Use case |
|---|---|---|
| `.anim-fade-up` | Fade + rise 16px, 0.45s | Primary screen entry |
| `.anim-fade-up-1/2/3/4` | Staggered 60ms delays | Sequential card reveals |
| `.anim-pop-in` | Scale 0.96→1 + fade | Score hero, modals |
| `.anim-slide-down` | Fade + drop 8px | Accordions, dropdowns |
| `.spinner` | Continuous rotation | Loading states |
| `.skeleton` | Shimmer gradient | Content placeholders |

---

## 9. UX Decisions

### Decision 1: Skeleton loading over spinner

**Problem:** The original app showed a blank screen while the AI generated the challenge.
**Solution:** A skeleton loader mimics the exact layout of the challenge card (lines of varying width, table placeholder). This reduces perceived wait time and prevents layout shift.

### Decision 2: MCQ reveal before full assessment

**Problem:** The original flow jumped straight to AI scoring, which was slow and felt abrupt.
**Solution:** Split into two steps: (1) Check answer — instant, shows correct/wrong state. (2) Get full assessment — triggers AI scoring. This gives immediate feedback and lets users decide if they want the full analysis.

### Decision 3: Topbar with breadcrumb context

**Problem:** Users lost track of where they were in the flow.
**Solution:** Every screen has a sticky topbar showing: current challenge name + track badge. The back button is always visible. This eliminates "where am I?" confusion.

### Decision 4: Guest upsell card (not a modal)

**Problem:** Aggressive upsell modals interrupt the experience and feel pushy.
**Solution:** A subtle inline card below the free challenge shows what's locked. No modal, no forced gate. The user completes the challenge first, then sees the upsell in context.

### Decision 5: Personalized welcome

**Problem:** The home screen felt generic.
**Solution:** "Welcome, [Name]" with a personalized subtitle. Small change, massive trust signal. The user feels the product knows them.

### Decision 6: XP system for full users

**Problem:** No sense of progress or reward.
**Solution:** XP earned per challenge (based on score), total XP in topbar, recent session history with scores. Creates a lightweight progression loop without gamification overload.

### Decision 7: Error states with helpful messages

**Problem:** API errors showed raw error text or nothing.
**Solution:** Friendly error messages with retry context. The error banner is styled (amber/red) and positioned inline, not as a disruptive overlay.

### Decision 8: Hint accordion (not always visible)

**Problem:** Showing the framework hint by default felt like hand-holding.
**Solution:** Collapsed by default with a clear "Framework hint" label. Users who want help can expand it; advanced users aren't distracted. The amber color signals "optional guidance."

### Decision 9: Model answer behind a reveal

**Problem:** Showing the model answer immediately reduces learning.
**Solution:** Collapsed behind a "tap to reveal" toggle. Forces the user to reflect on their own answer first, then compare. This is a deliberate pedagogical choice.

### Decision 10: Feedback form pre-filled from guest profile

**Problem:** Asking users to re-enter their name/age on the feedback form was friction.
**Solution:** The feedback form pre-populates from the guest profile state. Users only need to answer the qualitative questions.

---

## 10. Screen Inventory

| Screen | Route Condition | Purpose |
|---|---|---|
| Login | `screen === "login" && !showGuestForm` | Entry point, access code + guest CTA |
| Guest Profile | `showGuestForm === true` | Personalization before free challenge |
| Home (Guest) | `screen === "home" && isGuest` | Single challenge + upsell |
| Home (Full) | `screen === "home" && !isGuest` | Track selector + challenge path + history |
| Challenge | `screen === "challenge"` | Scenario + MCQ + hint + answer reveal |
| Result | `screen === "result"` | Score hero + breakdown + coach feedback + model answer |
| Feedback | `screen === "feedback"` | Guest exit survey |
| Thanks | `screen === "thanks"` | Confirmation + return to start |

---

## 11. Responsive Behavior

- **Mobile breakpoint:** 640px
- `.hide-mobile` — hides track badge in topbar on mobile
- `.stack-mobile` — stacks action buttons vertically on mobile
- `.full-mobile` — makes elements full-width on mobile
- Content containers have horizontal padding reduced on mobile
- Topbar padding reduced on mobile
- Grid layouts (2-column form fields) remain on mobile as they are compact enough

---

## 12. Accessibility

- All interactive elements have `:focus-visible` rings (2px indigo outline)
- Color is never the only signal — icons, text labels, and shapes reinforce state
- Contrast ratios: primary text on bg = 14.3:1 (AAA), secondary text = 5.9:1 (AA)
- All buttons have explicit `disabled` states with opacity and `cursor: not-allowed`
- Form fields have associated `<label>` elements
- Error messages are inline and associated with their fields

---

## 13. File Structure

```
src/
  App.jsx          — All screens, components, CSS-in-JS design system
  index.css        — Minimal reset (box-sizing, scroll behavior)
  main.jsx         — React entrypoint

api/
  chat.js          — Anthropic Claude API handler (Vercel serverless)
  feedback.js      — Resend email handler (Vercel serverless)

local-api.js       — Local dev proxy (OpenAI-compatible, dev only)
vite.config.js     — Vite config with /api proxy for local dev
```

---

*Design system version 2.0 — April 2026*
