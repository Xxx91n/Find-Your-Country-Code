## v1.8.0 Changelog

- New: editable dial-code fields (`contenteditable` — custom editable regions with no `input` element) are now detected at the low-confidence tier (low-key hint only); they are never filled automatically and can be summoned from the panel when needed.
- Improved: the editable dial-code candidate set is tightened — containers explicitly marked `contenteditable="false"` are excluded, cutting false positives.
- New: site opt-out markers are respected — fields carrying `data-1p-ignore` or `data-form-type="other"` no longer get an icon. This is the password-manager ecosystem's common opt-out convention (the official 1Password / Bitwarden protocols), used to declare "this field should not be touched by autofill tooling".
- New: country data completed — Kosovo (+383) and Vatican (+379) added, raising recognizable country/dial-code entries from 223 to 225.
- Improved: diagnostic output is now gated (silent by default, printed only when tracing is enabled) and uniformly prefixed with `[cch][diag]`, keeping the console clean and easy to filter.

## v1.7.0 Changelog

- New: the panel's Settings entry is now in the userscript menu — even on pages where no field is recognized, you can open the panel from the menu and jump straight to Settings. Language and other settings are no longer buried deep inside the panel.
- Improved: the panel language switcher is now an explicit three-way control (Auto / Chinese / English) with the current choice clearly highlighted; switching refreshes all panel text, icon tooltips, favorite-row tooltips and empty-state copy at once, with no stale-language leftovers.
- New: a diagnostics view — see *why* a field was or was not recognized, which tier it was injected at, and what value was written, laid out across four layers (tool / inject / logic / write), exportable as text. Errors and warnings are always recorded; full-chain tracing can be enabled when you need detail.
- Fixed: “selecting a country does nothing” inside nested forms (iframes / embedded srcdoc pages) — the origin check on embedded frames used to misjudge and silently drop the fill command. Nested-form filling now genuinely works end to end.
- Improved: intl-tel-input fields are now judged by the *selected country state* rather than the host input's value, which ITI's own semantics never guarantee to set — a much more faithful result check.
- Improved: the site-rule count cap is now enforced on the write path (over-cap writes are rejected outright), so no over-cap rule document can exist in memory.
- Testing: the real-site layer was upgraded from “is the icon injected?” to a five-level ladder (presence → injection → interaction → write-and-read-back → user feedback), backed by owned mirror pages and structural skeletons that gate releases automatically.
- New: a release gate — a release is blocked when the real-site layer's latest run is not green, unless explicitly acknowledged with a tracking ticket, so known issues cannot ship silently.

## v1.6.0 Changelog

- New: A global panel entry — open the country-code panel straight from the userscript menu, without depending on a 🌐 icon appearing on the page. The old dead end (no field confident enough → no icon → panel unreachable) is gone, and low-confidence fields can be summoned from the panel.
- Improved: The low-key icon now sits inside the field's right edge, so form-container overflow can no longer clip it; its “ad-like” cues are reduced (no heavy shadow, no oversaturation) so it is easier to notice.
- New: The panel language is switchable (follow browser / Chinese / English) and persisted via userscript storage, instead of always following the browser language.
- Fixed: Clicking the icon no longer silently does nothing in nested iframes (Shadow-DOM-wrapped or multiply embedded) — the top frame can open the panel on behalf; when origin validation rejects a message, a visible notice is shown instead of a silent no-op.
- Security: Cross-frame origin validation now covers more cases while staying strict (same-origin compares origin, cross-origin falls back to a source reference comparison) — the security boundary is not relaxed.
- Improved: The dependency install conflict is fixed at the root (React 18/19 in separate install roots), making the build and test pipeline more stable.

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
