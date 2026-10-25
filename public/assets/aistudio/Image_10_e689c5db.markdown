---
name: PulseFeedback System
colors:
  surface: '#f8f9ff'
  surface-dim: '#ccdbf3'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e6eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d5e3fc'
  on-surface: '#0d1c2e'
  on-surface-variant: '#444653'
  inverse-surface: '#233144'
  inverse-on-surface: '#eaf1ff'
  outline: '#757684'
  outline-variant: '#c4c5d5'
  surface-tint: '#3755c3'
  primary: '#00288e'
  on-primary: '#ffffff'
  primary-container: '#1e40af'
  on-primary-container: '#a8b8ff'
  inverse-primary: '#b8c4ff'
  secondary: '#006398'
  on-secondary: '#ffffff'
  secondary-container: '#5bb8fe'
  on-secondary-container: '#00476e'
  tertiary: '#003c36'
  on-tertiary: '#ffffff'
  tertiary-container: '#00554e'
  on-tertiary-container: '#5fcdbf'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dde1ff'
  primary-fixed-dim: '#b8c4ff'
  on-primary-fixed: '#001453'
  on-primary-fixed-variant: '#173bab'
  secondary-fixed: '#cce5ff'
  secondary-fixed-dim: '#93ccff'
  on-secondary-fixed: '#001d31'
  on-secondary-fixed-variant: '#004b73'
  tertiary-fixed: '#89f5e7'
  tertiary-fixed-dim: '#6bd8cb'
  on-tertiary-fixed: '#00201d'
  on-tertiary-fixed-variant: '#005049'
  background: '#f8f9ff'
  on-background: '#0d1c2e'
  surface-variant: '#d5e3fc'
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.015em
  headline-xl:
    fontFamily: Hanken Grotesk
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.015em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 30px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.005em
  body-lg:
    fontFamily: Inter
    fontSize: 17px
    fontWeight: '400'
    lineHeight: 26px
  body-md:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.04em
  code-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1.5rem
  margin: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system embodies high-trust, institutional clarity tailored for enterprise-grade voice-of-the-customer, employee sentiment, and academic research platforms. The UI must project methodological rigor, uncompromised neutrality, and effortless efficiency. Respondents need to feel that their data is handled securely and respectfully, while administrators and analysts require dense, fatigue-reducing interfaces for configuring surveys and extracting insights.

The aesthetic blends **Modern Corporate** precision with **Minimalist** clarity:
- Pure white and crisp cool-gray surfaces prevent respondent fatigue and keep focus strictly on survey questions and analytical metrics.
- Crisp structural lines and intentional whitespace replace heavy drop shadows, establishing an analytical, scientific atmosphere.
- Tactile affordances are unambiguous: buttons, multi-select rows, Likert scales, and text fields present clear interactive states to maximize response completion rates and minimize cognitive load.

## Colors

The palette leverages a calibrated hierarchy of slate blues and technical neutrals designed for WCAG AAA legibility, systematic feedback states, and accurate data visualization.

- **Primary (`#1E40AF` - Deep Slate Cobalt):** Anchors primary calls to action, survey advancement buttons, active selections, and core brand identifiers. It carries an authoritative, academic weight.
- **Secondary (`#0284C7` - Cerulean Blue):** Drives secondary interactions, completion tracking, interactive chips, and interactive data visualization highlights.
- **Tertiary (`#0D9488` - Deep Teal):** Signals positive sentiment, valid responses, statistical significance indicators, and verified data benchmarks.
- **Neutral (`#475569` - Slate):** Forms the backbone for structural borders, secondary labels, and neutral visualization bars. Neutral dark (`#0F172A`) is used for dominant body copy and headlines, while neutral light (`#F8FAFC`) forms the canvas foundation.
- **Semantic Accents:** Error/friction states use `#DC2626` (Red 600) for missed required items, `#D97706` (Amber 600) for response warnings or drop-off thresholds, and `#16A34A` (Green 600) for completed modules.

## Typography

The type system blends the structured geometry of **Hanken Grotesk** for headings and analytical titles with the unmatched neutral legibility of **Inter** for questions, metadata, and responses.

- Question titles rely on `headline-lg` and `headline-sm` with tight negative tracking, giving prompts a composed, authoritative stance.
- Survey response options and questionnaire prompts default to `body-lg` to accommodate prolonged reading comfort and quick scan times across demographic segments.
- Form inputs, helper notes, and matrix labels utilize `body-md` and `body-sm`.
- Micro-labels, metadata tags, completion badges, and rating chips use `label-sm` set in uppercase with slightly expanded letter tracking (`0.04em`) to ensure instant categorization.

## Layout & Spacing

The layout is built around a structured 12-column grid for administrative analytics dashboards, paired with an isolated single-column container (`max-width: 720px`) for survey respondent flows to eliminate peripheral distractions.

- **Breakpoints:**
  - **Mobile (< 640px):** Single column, 1rem (`16px`) outer canvas margin, gutters collapse to `space-md`. Complex rating grids collapse into vertical stack cards.
  - **Tablet (640px - 1024px):** 8-column layout, 1.5rem (`24px`) margins, 1.25rem gutters. Sidebar navigations collapse into contextual drawer menus.
  - **Desktop (> 1024px):** 12-column layout, 2rem (`32px`) margins, 1.5rem (`24px`) gutters. Survey builder view splits cleanly into fixed left taxonomy/question tree, central workspace, and right property inspector.
- **Rhythm Rules:** Form questions adhere strictly to an 8px progressive spacing grid. Sub-labels and input controls are separated by `space-xs`, consecutive question items within a section use `space-lg`, and major thematic survey blocks use `space-xl`.

## Elevation & Depth

This design system avoids theatrical drop shadows in favor of a crisp, low-contrast border architecture, layered surface tiers, and featherweight directional ambient occlusion.

- **Level 0 (Base Canvas):** `#F8FAFC`. Background for admin back-offices and survey respondent views.
- **Level 1 (Card & Content Surface):** `#FFFFFF` paired with a 1px solid `#E2E8F0` border. Applied to survey question cards, metrics widgets, and tables. No shadow in static rest state.
- **Level 2 (Hover / Active Cards):** 1px solid `#CBD5E1` border with ambient shadow: `0 4px 12px -2px rgba(15, 23, 42, 0.05), 0 2px 4px -2px rgba(15, 23, 42, 0.03)`. Indicates actionable interactive cards, dragged survey blocks, or active metric widgets.
- **Level 3 (Overlays & Menus):** Pure white container, 1px solid `#E2E8F0` border, with deep soft shadow: `0 12px 28px -6px rgba(15, 23, 42, 0.08), 0 4px 8px -2px rgba(15, 23, 42, 0.04)`. Applied to dropdown select menus, popovers, date range pickers, and filter panels.
- **Level 4 (Modal Dialogs):** Centered floating surfaces over a `rgba(15, 23, 42, 0.4)` backdrop blur overlay, with elevation shadow: `0 24px 48px -12px rgba(15, 23, 42, 0.18)`.

## Shapes

The system implements a refined **Soft** corner treatment (`roundedness: 1`), providing an institutional, disciplined aesthetic that avoids the austerity of sharp 90-degree corners while steering clear of overly casual pill shapes.

- Standard inputs, buttons, select fields, and question choice rows feature `0.25rem` (`4px`) corner radii.
- Analytical cards, survey question grouping containers, and metrics modules use `0.5rem` (`8px`) (`rounded-lg`).
- Modal windows and slide-over drawer panels use `0.75rem` (`12px`) (`rounded-xl`).
- Badges, status pills, and standalone circular rating bubbles (e.g., NPS 0-10 selectors) are exceptions that utilize complete circular geometry (`rounded-full`) for instant tactile differentiation.

## Components

### Buttons
- **Primary:** Background `#1E40AF`, text `#FFFFFF`, border none, 4px border radius. Hover state transitions to `#1D4ED8`. Focus state applies a 2px offset ring in `#93C5FD`.
- **Secondary / Outline:** Background `#FFFFFF`, 1px border `#CBD5E1`, text `#1E293B`. Hover shifts background to `#F1F5F9` and border to `#94A3B8`.
- **Destructive:** Background `#FEF2F2`, 1px border `#FECACA`, text `#DC2626`. Hover changes to background `#DC2626` and text `#FFFFFF`.

### Form Controls (Inputs, Checkboxes, Radios)
- **Text Inputs & Textareas:** `#FFFFFF` background, 1px border `#CBD5E1`, padding `10px 14px`. Focus shifts border to `#1E40AF` with a subtle 3px glow (`rgba(30, 64, 175, 0.1)`). Error state introduces border `#DC2626`.
- **Checkboxes & Radios:** 18px standard size. Rest state is `#FFFFFF` with 1.5px border `#94A3B8`. Checked state fills `#1E40AF` with white glyphs. Radio uses a centered 8px solid inner dot.

### Question Choice Rows & Selectors
- **Selectable Option Tiles:** Multi-line or single-select options are packaged as distinct horizontal row tiles: white background, 1px border `#E2E8F0`, padding `14px 18px`. Hovering displays a subtle tint (`#F8FAFC`) and `#94A3B8` border. When selected, the tile border switches to 1.5px `#1E40AF` with background `#EFF6FF`.

### Net Promoter Score (NPS) & Likert Scale
- **NPS Grid (0–10):** Horizontal chain of 11 discrete 44x44px blocks. Default state is white with 1px `#E2E8F0` borders. Hover turns to `#F1F5F9`. Selected item transitions to `#1E40AF` with high-contrast `#FFFFFF` text. Extremes feature pinned anchor labels below ("Not at all likely", "Extremely likely") using `label-sm` in `#64748B`.
- **Likert Matrix:** Alternating subtle row banding (`#FFFFFF` and `#F8FAFC`). Radio buttons centered precisely inside uniform column widths. Column headings sticky-dock on mobile/tablet viewports.

### Cards & Analytical Widgets
- **Survey Question Card:** Pure white surface, 1px `#E2E8F0` border, `space-lg` padding, with an optional left accent bar (3px solid `#1E40AF`) signaling the currently active or editing question.
- **Metric KPI Widget:** Background `#FFFFFF`, 1px `#E2E8F0` border, displaying a top label (`label-sm` uppercase), a large numerical readout (`headline-xl`), and an inline sentiment trend badge (teal `#0D9488` for positive shift, amber `#D97706` for drop-off warnings).

### Progress Indicator
- Slim 4px horizontal bar docked at the header of the survey container. Track uses `#E2E8F0`, while active progress fills with a linear transition in `#1E40AF`. Percentage readout is cleanly anchored in `label-sm` alongside an estimated completion time tag.