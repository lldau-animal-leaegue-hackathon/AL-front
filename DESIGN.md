---
name: Dermis Narrative
colors:
  surface: "#f8f9fa"
  surface-dim: "#d9dadb"
  surface-bright: "#f8f9fa"
  surface-container-lowest: "#ffffff"
  surface-container-low: "#f3f4f5"
  surface-container: "#edeeef"
  surface-container-high: "#e7e8e9"
  surface-container-highest: "#e1e3e4"
  on-surface: "#191c1d"
  on-surface-variant: "#424844"
  inverse-surface: "#2e3132"
  inverse-on-surface: "#f0f1f2"
  outline: "#727973"
  outline-variant: "#c2c8c2"
  surface-tint: "#496455"
  primary: "#466253"
  on-primary: "#ffffff"
  primary-container: "#5f7b6b"
  on-primary-container: "#f5fff6"
  inverse-primary: "#afcebb"
  secondary: "#705b43"
  on-secondary: "#ffffff"
  secondary-container: "#fbdec0"
  on-secondary-container: "#766149"
  tertiary: "#4c5d78"
  on-tertiary: "#ffffff"
  tertiary-container: "#657592"
  on-tertiary-container: "#fefcff"
  error: "#ba1a1a"
  on-error: "#ffffff"
  error-container: "#ffdad6"
  on-error-container: "#93000a"
  primary-fixed: "#cbead6"
  primary-fixed-dim: "#afcebb"
  on-primary-fixed: "#052014"
  on-primary-fixed-variant: "#314c3e"
  secondary-fixed: "#fbdec0"
  secondary-fixed-dim: "#ddc2a5"
  on-secondary-fixed: "#271907"
  on-secondary-fixed-variant: "#56432e"
  tertiary-fixed: "#d5e3ff"
  tertiary-fixed-dim: "#b6c7e7"
  on-tertiary-fixed: "#091c34"
  on-tertiary-fixed-variant: "#374762"
  background: "#f8f9fa"
  on-background: "#191c1d"
  surface-variant: "#e1e3e4"
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: "700"
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: "600"
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: "600"
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: "600"
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: "400"
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: "400"
    lineHeight: 24px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: "600"
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  gutter: 16px
  margin-mobile: 20px
  margin-desktop: 40px
  container-max: 1200px
---

## Brand & Style

The design system is rooted in the "Clinical-Soft" aesthetic—a hybrid of medical precision and spa-like tranquility. It targets individuals seeking professional-grade skincare guidance without the intimidating sterile coldness of traditional dermatology. The UI must feel hyper-organized yet breathable, evoking a sense of calm and routine reliability.

The style leans into **Minimalism** with a touch of **Glassmorphism**. It utilizes heavy whitespace to suggest purity and cleanliness. Visual elements are characterized by light-refracting surfaces, subtle gradients, and an "airy" composition that reduces the cognitive load of complex skincare regimens.

## Colors

The palette is designed to balance medical authority with human warmth.

- **Primary (Sage Green):** Used for primary actions, success states, and health-related progress indicators. It serves as the visual anchor for "soothing" and "natural."
- **Secondary (Warm Sand):** Represents skin-tone inclusivity and comfort. Used for secondary UI elements, background chips, and soft accents.
- **Accents (Deep Navy):** Reserved for high-level information, typography, and "Professional/Doctor" verified badges to establish trust.
- **Backgrounds:** A base of pure white (#FFFFFF) is used for primary content cards, while the Very Light Grey (#F8F9FA) is used for the page canvas to create a subtle separation of layers.

## Typography

This design system uses **Inter** exclusively to maintain a systematic and highly legible interface. The type scale is generous to ensure accessibility for users who may be checking their routine while in the bathroom or in low-light conditions.

Headlines use a tighter letter-spacing and heavier weights to provide clear structural anchors for routine steps. Body text maintains a standard line height of 1.5x the font size to ensure a "relaxed" reading experience.

## Layout & Spacing

The layout follows a **Fluid Grid** model with a soft 8px baseline.

- **Mobile:** 4-column grid with 20px side margins. Content is primarily stacked vertically to facilitate one-handed scrolling through morning/evening routines.
- **Desktop:** 12-column grid with a maximum container width of 1200px to prevent excessive line lengths.
- **Rhythm:** Use "Generous" spacing. Avoid packing elements tightly. Routine steps should be separated by at least 24px (3x base) to emphasize individual importance.

## Elevation & Depth

Depth is achieved through **Ambient Shadows** and **Tonal Layering**.

1. **Surface Level:** The main background is neutral light grey.
2. **Container Level:** Primary cards and routine blocks are white with a very soft, diffused shadow (Blur: 20px, Y: 4px, Color: #1A2B44 at 4% opacity).
3. **Interactive Level:** On hover or active state, cards slightly lift with a more pronounced shadow (Blur: 32px, Y: 8px, Color: #1A2B44 at 8% opacity).
4. **Glass Layers:** Overlays and bottom sheets use a backdrop blur (12px) with a semi-transparent white fill (85% opacity) to maintain context of the page behind them.

## Shapes

The shape language is "Approachable Geometric." Standard components use a **0.5rem (8px)** radius, while primary content containers and cards use **rounded-xl (1.5rem / 24px)** to evoke the organic softness of skin and skincare packaging.

Iconography should be "Line" style with rounded terminals—avoid sharp corners on icons to maintain the "soothing" brand promise.

## Components

- **Buttons:** Primary buttons are Sage Green with white text, utilizing the `rounded-lg` (16px) radius. Secondary buttons use the Warm Sand background with Deep Navy text.
- **Routine Cards:** White background, 24px corner radius. Feature a prominent 24x24px icon (Sun/Moon/Drop) in the top right. Progress is indicated by a Sage Green thin-line bar at the bottom of the card.
- **Input Fields:** Minimalist style. Use a light-grey fill (#F1F3F5) with no border. On focus, apply a 1px Sage Green border and a soft glow. Labels should be `label-sm` style positioned above the field.
- **Chips:** Small, pill-shaped (`rounded-xl`) markers for ingredients (e.g., "Retinol", "Vitamin C"). Use the Warm Sand background at 20% opacity with Deep Navy text.
- **Steppers:** A vertical progress line in Deep Navy (10% opacity) with active nodes highlighted in Sage Green.
- **Modals:** Use a center-aligned layout with 32px padding and the maximum `rounded-xl` corner radius.
