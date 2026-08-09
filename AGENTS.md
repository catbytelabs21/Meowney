## UI and design system

Before implementing or modifying any UI, read `/DESIGN.md`.

`DESIGN.md` is the visual source of truth for Meowney.

All screens must support light and dark themes derived from that design language.

Shared visual values must be implemented as reusable tokens under `/src/theme` rather than hardcoded in individual screens.

Use React Native Paper where appropriate, but customize it when necessary to preserve the Meowney design system.

All new screens must remain visually consistent with existing Meowney screens and support Android/mobile UX conventions.
