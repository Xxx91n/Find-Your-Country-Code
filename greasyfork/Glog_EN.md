## v1.5.0 Changelog

- New: Weak-signal country/dial-code fields are now detected — fields with no visible text label that only carry attribute hints (name / id / placeholder / aria) move from "not detected" to the low-key tier (icon restored on hover); fixed-line area codes, honorific prefixes and pure numeric dropdowns still raise no false icons.
- New: Support for dial-code selects whose `option value` is an ISO country code with a parenthesized dial code (e.g. `CN (+86)`); pure ISO2 country selectors (no dial code) stay undetected, and shared-code disambiguation (+1 / +44) is unaffected.
- New: Hand-rolled custom dropdowns without ARIA semantics (focusable div / span containers) enter the scan candidate set — they can be registered and filled via manual summon from the panel.
- Fixed: The forced-tier site rule now applies only to rules explicitly marked page-level; element-level rules are no longer treated as a page-wide override, so one element rule no longer affects every field on the site.
- Fixed: Fill results are now observable — filled / copied / failed are distinguished, and a dial-code format divergence (+86 / 0086 / 86) is surfaced; a failed fill no longer silently reports "copied to clipboard".
- Security: Cross-frame and cross-tab messaging (postMessage / BroadcastChannel) now validates message origins instead of accepting messages from any source.
- Improved: Full TypeScript strict typing cleanup (zero build-time type errors), pinned dependency versions and a slimmer CI gate — the release artifact is unchanged.

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
