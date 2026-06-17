## Goal
Replace the current warm peachy palette with the selected Ocean & Blaze scheme to achieve a gender-neutral, dynamic, and friendship-forward aesthetic.

## Selected Palette
- **Deep Ocean**: `#0c2340` — HSL(212, 69%, 15%) — used for deep backgrounds, hero base
- **Medium Ocean**: `#1a4a6e` — HSL(207, 61%, 27%) — used for secondary elements, depth
- **Bright Amber**: `#f7931e` — HSL(33, 93%, 54%) — primary action, energy highlights
- **Blaze Orange**: `#ff6b35` — HSL(16, 100%, 60%) — accent, CTAs, warm energy

## Files to Update

### 1. `src/index.css`
- **Light mode (`:root`)**: Replace all warm HSL tokens with Ocean & Blaze equivalents
  - `--primary`: amber at HSL(33, 93%, 54%)
  - `--accent`: blaze orange at HSL(16, 100%, 60%)
  - `--gradient-primary`: deep ocean → medium ocean
  - `--gradient-accent`: amber → blaze orange
  - `--gradient-hero`: deep ocean base with amber/blaze highlights
  - `--ring`, `--activity-*`, `--intensity-*`: map to ocean/amber range
- **Dark mode (`.dark`)**: Update primary, accent, muted, and gradient tokens to match
- **Utility classes** (`@layer utilities`): Update `.gradient-hero`, `.sun-orb`, and animation keyframes to use the new palette
- **Remove the Google Fonts @import** for Space Grotesk / Inter (only if switching fonts; otherwise keep)

### 2. `src/components/Hero.tsx`
- Replace hardcoded warm HSL values in decorative orbs and background elements:
  - `hsl(35_95%_70%)` → amber/blaze
  - `hsl(345_70%_55%)` → blaze orange
  - `hsl(275_50%_30%)` → deep ocean
- Ensure the hero still feels energetic and warm while using the new palette

### 3. `tailwind.config.ts`
- Verify all semantic tokens map correctly to the updated CSS variables (no hardcoded values to change here, but confirm the variable bindings remain intact)

## What Stays the Same
- Font families (Space Grotesk / Inter)
- Border radius system
- Animation keyframes and durations
- Layout and spacing tokens
- Dark mode toggle behavior

## Verification
- Build should pass without errors
- Hero section should display the new ocean-to-blaze gradient
- Buttons, badges, and interactive elements should use amber/blaze accents
- No residual warm peach tones in any visible element
