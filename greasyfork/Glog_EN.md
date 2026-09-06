## v1.4.0 Changelog

- New: Multi-signal weighted scoring auto-detects country/phone-code fields (`select`, `input`, and intl-tel-input) with tiered actions by confidence — auto-inject 🌐 on high, low-key icon on medium (restored on hover), manual summon from the panel on low; honorific prefixes, local fixed-line area codes and pure numeric dropdowns no longer trigger false icons.
- New: Site rules and negative feedback — one-click suppression of false positives (instant, idempotent, revocable), exempt domains, forced selectors and tier overrides, managed in-panel.
- New: intl-tel-input v16–v29 adaptation; React/Vue controlled components sync via native event sequences.
- Improved: dynamic page compatibility — MutationObserver scanning + SPA route-change re-evaluation, traversing open Shadow DOM.
- Improved: configurable low-key styles for the 🌐 trigger (dim/hidden).
- Improved: engineering migrated to the vite-plugin-monkey modular build — same release artifact, better maintainability.
- New: iframe-split form support — detection and filling run in every frame, the panel appears on the top frame only, favorites and site rules stay consistent across frames.
- New: component-library pseudo-dropdowns (MUI/AntD/Element/react-select/Radix etc.) — registered first, manually summonable from the panel; both combobox flavors (editable / select-only) can be filled.
- New: React 19 controlled-component fill fallback — capability probing falls back to a forced-sync path so submitted values really apply.
- Improved: hidden/decorative fields (clip-path, content-visibility, occlusion, zero-size) no longer get icons; still summonable from the panel.
- Improved: content verification hardened — shared dial codes (+1/+44) disambiguated by country name, placeholder options excluded from scoring; fewer false positives.
- Improved: intl-tel-input recognition joins the unified scoring engine — unrelated fields inside iti containers no longer get icons unconditionally.

## v1.3.4 Changelog

- Fixed: Added support for country-code selects whose `option value` uses ISO codes (e.g. `CN`, `US`, `JP`) in detection logic (A2 scenario).
- Fixed: The 🌐 trigger now supports toggle-close behavior (click once to open, click again on the same trigger to close).
- Improved: Popup position now tracks the trigger during page scroll and viewport resize instead of staying at the original fixed spot.
- Improved: Repositioning is throttled with `requestAnimationFrame` to keep scrolling smooth and reduce layout jitter.
