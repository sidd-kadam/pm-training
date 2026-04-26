# PM Training App Design System

## 1. UX Strategy & Structure
The current app has a monolithic, confusing structure with a high cognitive load and poor onboarding. The new strategy focuses on clarity, trust, and progression.

### Core User Journey
1. **Entry**: Clean, high-trust landing page explaining value.
2. **Onboarding**: Progressive profiling instead of a blunt form.
3. **Dashboard (Home)**: Clear visual hierarchy showing progress, tracks (B2B, B2C, PO), and recent history.
4. **Challenge Flow**: Focused, distraction-free reading experience for scenarios.
5. **Assessment**: Celebratory, constructive feedback loop with clear next steps.

### Key Improvements
- **Empty States**: Meaningful placeholders when no history exists.
- **Progress Indicators**: Clear visual cues of where the user is in a track.
- **Feedback**: Immediate, subtle toast notifications for actions.

## 2. Visual Design System

### Typography
- **Font Family**: Inter (System fallback: San Francisco, Helvetica Neue, sans-serif)
- **Scale**:
  - H1: 32px / 40px line-height (Bold 700)
  - H2: 24px / 32px line-height (Semibold 600)
  - H3: 18px / 28px line-height (Medium 500)
  - Body (Large): 16px / 24px line-height (Regular 400)
  - Body (Base): 14px / 20px line-height (Regular 400)
  - Small: 12px / 16px line-height (Medium 500)

### Color Palette
A refined, modern palette inspired by premium SaaS products (Stripe, Vercel).

- **Primary**: `#000000` (Black) - For high-contrast primary actions.
- **Secondary**: `#6366F1` (Indigo 500) - For accents, links, and active states.
- **Background**: `#FAFAFA` (Neutral 50) - App background.
- **Surface**: `#FFFFFF` (White) - Cards, modals, dropdowns.
- **Text**:
  - Primary: `#111827` (Gray 900)
  - Secondary: `#4B5563` (Gray 600)
  - Tertiary: `#9CA3AF` (Gray 400)
- **Semantic**:
  - Success: `#10B981` (Emerald 500)
  - Warning: `#F59E0B` (Amber 500)
  - Error: `#EF4444` (Red 500)
  - Info: `#3B82F6` (Blue 500)

### Spacing & Grid
- Base unit: 8px
- Spacing scale: 4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px.
- Max-width container: 800px (optimized for reading).

### Elevation & Borders
- **Borders**: 1px solid `#E5E7EB` (Gray 200) for cards and inputs.
- **Border Radius**:
  - Small (Inputs, Buttons): 6px
  - Medium (Cards): 12px
  - Large (Modals): 16px
- **Shadows**:
  - Subtle (Cards): `0 1px 3px rgba(0,0,0,0.05)`
  - Hover: `0 4px 6px rgba(0,0,0,0.05)`
  - Floating (Modals/Dropdowns): `0 10px 15px rgba(0,0,0,0.1)`

## 3. Component Guidelines

### Buttons
- **Primary**: Black background, white text. Hover: `#1F2937`.
- **Secondary**: White background, gray border, black text. Hover: `#F9FAFB`.
- **Ghost**: Transparent background, gray text. Hover: `#F3F4F6`.
- **Disabled**: `#E5E7EB` background, `#9CA3AF` text. Not clickable.

### Inputs
- Clean borders, focus ring (2px solid `#6366F1` with offset).
- Clear error states (Red border, red helper text below).

### Cards
- White surface, subtle border, subtle shadow.
- Consistent padding (24px).

## 4. Interaction & Micro-UX
- **Hover States**: All interactive elements must have clear hover states (slight background change or transform).
- **Transitions**: 150ms ease-in-out for color and shadow changes.
- **Loading States**: Use skeleton screens for content loading, spinners for button actions.
- **Feedback**: Toast notifications for success/error messages.

## 5. Copy & UX Writing
- **Tone**: Professional, encouraging, clear.
- **Action-Oriented**: "Start Challenge" instead of "Go", "View Results" instead of "Next".
- **Concise**: Remove unnecessary words. Let the UI speak for itself.
