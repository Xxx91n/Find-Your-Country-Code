# Find-Your-Country-Code

Browser userscript for quickly selecting and filling international phone country codes on almost any website.

## Features

- Auto-detects country/phone code fields (`select`, `input`, and `intl-tel-input`-related fields)
- One-click 🌐 trigger to open a fast country code picker
- Search by country name (CN/EN), ISO code, and dialing code
- Favorites support with persistent local storage
- Works with dynamically inserted form elements

## Screenshots

- Main panel (Search + Favorites + All)
- Trigger entry (🌐 icon at top-right of target field)
- Fill confirmation toast after selection

You can preview the UI locally with `test/cch-test-page.html`.

## Installation

### Prerequisites

Install one userscript manager extension:

- [Tampermonkey](https://www.tampermonkey.net/)
- [Greasemonkey](https://www.greasespot.net/)
- [Violentmonkey](https://violentmonkey.github.io/)

### Install Script

1. **Install from GreasyFork**
   - https://greasyfork.org/en/scripts/573755-find-your-country-code
2. **Direct install URL**
   - https://update.greasyfork.org/scripts/573755/Find-Your-Country-Code.user.js
3. **Manual install**
   - Copy `src/Find-Your-Country-Code.js`
   - Create a new userscript in your manager
   - Paste and save

## License

[MIT License](./LICENSE)
