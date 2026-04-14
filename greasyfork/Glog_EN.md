## v1.3.4 Changelog

- Fixed: Added support for country-code selects whose `option value` uses ISO codes (e.g. `CN`, `US`, `JP`) in detection logic (A2 scenario).
- Fixed: The 🌐 trigger now supports toggle-close behavior (click once to open, click again on the same trigger to close).
- Improved: Popup position now tracks the trigger during page scroll and viewport resize instead of staying at the original fixed spot.
- Improved: Repositioning is throttled with `requestAnimationFrame` to keep scrolling smooth and reduce layout jitter.
