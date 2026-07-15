---
name: Lumina Engineering
colors:
  surface: '#f9f9ff'
  surface-dim: '#cfdaf2'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eeff'
  surface-container-high: '#dee8ff'
  surface-container-highest: '#d8e3fb'
  on-surface: '#111c2d'
  on-surface-variant: '#3d4947'
  inverse-surface: '#263143'
  inverse-on-surface: '#ecf1ff'
  outline: '#6d7a77'
  outline-variant: '#bcc9c6'
  surface-tint: '#006a61'
  primary: '#00685f'
  on-primary: '#ffffff'
  primary-container: '#008378'
  on-primary-container: '#f4fffc'
  inverse-primary: '#6bd8cb'
  secondary: '#904d00'
  on-secondary: '#ffffff'
  secondary-container: '#fe932c'
  on-secondary-container: '#663500'
  tertiary: '#924628'
  on-tertiary: '#ffffff'
  tertiary-container: '#b05e3d'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#89f5e7'
  primary-fixed-dim: '#6bd8cb'
  on-primary-fixed: '#00201d'
  on-primary-fixed-variant: '#005049'
  secondary-fixed: '#ffdcc3'
  secondary-fixed-dim: '#ffb77d'
  on-secondary-fixed: '#2f1500'
  on-secondary-fixed-variant: '#6e3900'
  tertiary-fixed: '#ffdbce'
  tertiary-fixed-dim: '#ffb59a'
  on-tertiary-fixed: '#370e00'
  on-tertiary-fixed-variant: '#773215'
  background: '#f9f9ff'
  on-background: '#111c2d'
  surface-variant: '#d8e3fb'
typography:
  display:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 32px
---

## Brand & Style

The design system is engineered for professional-grade audio and signal processing. It targets engineers, researchers, and technical creators who require extreme clarity and precision. 

The aesthetic is **Modern Corporate** with a heavy emphasis on **High-Contrast Minimalism**. It prioritizes information density without sacrificing airiness. The emotional response is one of "Technical Zen"—a calm, distraction-free environment that empowers the user to focus on complex signal chains and data visualization. Surfaces are clean, borders are razor-sharp, and the interface feels like a high-end physical laboratory instrument translated into a digital workspace.

## Colors

The palette is anchored by a sophisticated grayscale foundation to ensure longevity and reduce cognitive load during long working sessions.

- **Background & Surfaces**: The primary canvas is `#F8FAFC`, providing a cool, sterile base. Active workspace modules and containers use pure `#FFFFFF` to lift them from the background.
- **Accents**: 
    - **Teal (#0D9488)**: Used for primary actions, successful signal locks, and high-priority data paths.
    - **Amber (#D97706)**: Reserved for secondary modulations, warnings, or "warm" signal states.
- **Typography & Borders**: Text uses **Slate (#1E293B)** for maximum legibility. Borders use `#E2E8F0` to define structural boundaries without creating visual noise.

## Typography

This design system utilizes a dual-font strategy to balance modern aesthetics with technical utility.

- **Hanken Grotesk**: Applied to all primary UI elements, headings, and body copy. Its sharp, contemporary geometry reflects the "high-end engineering" persona.
- **JetBrains Mono**: Used exclusively for data values, coordinates, node labels, and code-like parameters. The monospaced nature ensures that fluctuating numbers don't cause layout jitter.

**Weight Usage**: Use `600` for structural headers and `400` for general content. `500` is reserved for technical labels to ensure they remain legible at small sizes.

## Layout & Spacing

The layout follows a **Fluid Grid** model with strict 4px increments. 

- **Workspace**: The central canvas is fluid, allowing for expansive node-based editing. Sidebars (Inspector and Library) are fixed at 280px and 320px respectively to maintain a predictable control surface.
- **Responsive Behavior**: On desktop, a 12-column grid is used for the dashboard views. On mobile, the system collapses to a single-column flow with the sidebars moving into "Drawers."
- **Rhythm**: All internal padding for cards and modules should strictly use the `md` (16px) or `lg` (24px) tokens to maintain a professional, airy feel.

## Elevation & Depth

To maintain a "High-Contrast / Modern" look, this design system avoids heavy, muddy shadows. 

- **Surface Tiers**: Depth is primarily communicated through **Tonal Layering**. The background is `#F8FAFC`, while interactive "modules" (nodes) or "panels" use `#FFFFFF`. 
- **Outlines**: Every elevated element is defined by a 1px solid border (`#E2E8F0`). 
- **Shadows**: Only use shadows for "Floating" elements like dropdown menus or active dragging states. These shadows should be **Ambient**: low opacity (`0.05`), high blur (`12px`), and slightly tinted with the Primary Slate color to keep them crisp.
- **Active State**: Selected nodes or focused fields do not use shadows; instead, they receive a 2px Primary Teal stroke.

## Shapes

The shape language is **Soft (0.25rem)**. This provides just enough curvature to feel modern and accessible while maintaining the "precise" engineering aesthetic. 

- **Standard Buttons & Inputs**: 4px (0.25rem) radius.
- **Cards & Logic Nodes**: 8px (0.5rem) radius to differentiate structural containers from interactive components.
- **Connection Ports**: Circles (fully rounded) to indicate signal input/output points.

## Components

- **Buttons**:
  - **Primary**: Solid Teal (#0D9488) with White text. No gradients.
  - **Secondary**: White background with a 1px Slate (#E2E8F0) border and Slate text.
- **Logic Nodes (Cards)**: White background, 1px `#E2E8F0` border. Headers should have a subtle bottom border. Input/Output ports are 8px circles.
- **Input Fields**: Minimalist style. 1px `#E2E8F0` border, transitions to 1px `#0D9488` on focus. Use JetBrains Mono for the value text.
- **Signal Wires**: 
  - **Inactive**: 2px solid `#E2E8F0`. 
  - **Active/Live**: 2px solid `#0D9488` or `#D97706` depending on the signal type.
- **Chips/Status Tags**: Small, all-caps labels using `label-sm`. Backgrounds are very desaturated versions of the accent colors (e.g., 10% opacity Teal).
- **Tooltips**: High-contrast Slate (#1E293B) background with White text for instant readability over the light workspace.