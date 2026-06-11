Use the screen-builder agent.

  Goal:
  Conduct a detailed UX/UI audit of every user-facing screen and reusable component that is NOT part of
  the admin section. Do not modify production app code unless needed only to generate review artifacts.
  Store the audit output under:

  docs/ux-oracle-review/2026-06-11/

  Create this structure:

  docs/ux-oracle-review/2026-06-11/
    index.md
    screens/
      <screen-route-or-name>.md
    components/
      <component-name>.md
    assets/
      <screen-name>-before-desktop.png
      <screen-name>-before-mobile.png
      <screen-name>-after-wireframe.png
      <screen-name>-annotations.png

  Instructions:

  1. Discovery
  - Search the full codebase to identify all routes, pages, layouts, and reusable UI components.
  - Exclude anything in the admin section, including `/admin` routes, admin layouts, admin-only
  components, and admin configuration screens.
  - Build a screen inventory with route/path, file location, purpose, and related components.
  - Build a component inventory for shared non-admin components.

  2. Visual review
  - Run the app locally if needed.
  - Visit each non-admin screen.
  - Capture before screenshots for desktop and mobile.
  - If possible, also inspect tablet layout.
  - Review real rendered behavior, not just code.
  - Include screenshots or visual references in the audit files.

  3. Audit criteria
  For each screen, evaluate:
  - visual hierarchy
  - layout and spacing
  - responsiveness
  - navigation clarity
  - content clarity
  - calls to action
  - form usability
  - loading, empty, error, and success states
  - accessibility
  - color contrast
  - typography
  - component consistency
  - interaction states
  - trust signals
  - performance or perceived-performance concerns
  - mobile ergonomics
  - opportunities to simplify or improve conversion

  For each reusable component, evaluate:
  - where it is used
  - whether it behaves consistently
  - responsive behavior
  - accessibility
  - API/props clarity
  - styling consistency
  - duplicate or overlapping components
  - recommended improvements

  4. Recommendations
  The recommendations must be detailed and practical.

  For every screen, include:
  - Current state summary
  - Key issues
  - Severity: Critical, High, Medium, Low
  - Evidence: screenshot reference and code reference where relevant
  - Recommended redesign or improvement
  - Before/after comparison
  - Implementation notes
  - Acceptance criteria

  For “after” visuals:
  - Create annotated wireframes, mockups, or visual diagrams when possible.
  - If full mockups are not practical, include clear layout sketches using Markdown, Mermaid, or image
  annotations.
  - The review should clearly show what changes visually between before and after.

  5. Index file
  Create:

  docs/ux-oracle-review/2026-06-11/index.md

  The index must include:
  - Executive summary
  - Screens audited
  - Components audited
  - Top UX risks
  - Top 10 recommendations
  - Quick wins
  - Larger redesign opportunities
  - Priority roadmap
  - Links to every per-screen and per-component review file
  - Summary table with:
    - screen/component name
    - route/file
    - severity
    - main issue
    - recommendation
    - estimated effort

  6. Quality bar
  Be thorough. Do not give generic design advice.
  Every recommendation should be tied to the actual app, actual screen, actual component, or actual code.
  Include enough detail that an engineer or designer could implement the improvements from the audit.

  After finishing, summarize:
  - files created
  - screens reviewed
  - components reviewed
  - most important recommendations
  - any screens/components that could not be reviewed and why