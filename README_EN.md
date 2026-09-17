<div align="center">
<h1 align="center">Find-Your-Country-Code</h1>

**English** | [**简体中文**](./README.md)

<p align="center">
  
**Browser userscript for quickly selecting and filling international phone country codes on almost any website.**
</p>
</div>

## Features

- Multi-signal weighted scoring auto-detects country/phone code fields (`select`, `input`, and `intl-tel-input` scenarios) with tiered actions by confidence — honorific prefixes, local fixed-line area codes, and pure numeric dropdowns no longer trigger false icons
- High-confidence fields get an automatic 🌐 icon; medium confidence injects low-key (semi-transparent, shrunk, restored on hover); low confidence stays hidden but can be summoned from the panel
- Honors standard `autocomplete` signals (e.g. `tel-country-code`) and validates dropdown options by content
- One-click 🌐 trigger to open a fast country code picker; search by country name (CN/EN), ISO code, and dialing code
- Favorites support with persistent local storage
- Works with dynamic pages: MutationObserver scanning + SPA route-change rescans, traversing open Shadow DOM
- intl-tel-input v16–v29 adaptation; React/Vue controlled components sync via native event sequences

## Screenshots

<table>
  <tr>
    <td style="vertical-align: top;">
      <img width="100%" src="./greasyfork/main1.png">
    </td>
    <td style="vertical-align: top;">
      <img width="100%" src="./greasyfork/main2.png">
    </td>
  </tr>
</table>

## Installation

### Prerequisites

Install one userscript manager extension:

- [Tampermonkey](https://www.tampermonkey.net/)
- [Greasemonkey](https://www.greasespot.net/)
- [Violentmonkey](https://violentmonkey.github.io/)

### Install Script

1. **Direct install URL**

- [GreasyFork](https://update.greasyfork.org/scripts/573755/Find-Your-Country-Code.user.js)
- [GitHub Release](https://github.com/Xxx91n/Find-Your-Country-Code/releases/latest/download/find-your-country-code.user.js)

2. **Manual install**
   1. Build from source: clone this repo, then run `npm install && npm run build` to produce `dist/find-your-country-code.user.js`.
   2. Create a new userscript in your manager
   3. Paste the build output and save

## Single Authoritative Channel

The **single authoritative channel** for this project is the source repository [GitHub: Xxx91n/Find-Your-Country-Code](https://github.com/Xxx91n/Find-Your-Country-Code): the source code, the version source of truth (`package.json`), and the release artifacts ([`releases/latest`](https://github.com/Xxx91n/Find-Your-Country-Code/releases/latest)) all live there.

The [GreasyFork listing](https://greasyfork.org/zh-CN/scripts/573755-find-your-country-code) is a **pull-based mirror**: GreasyFork pulls updates from that `releases/latest` artifact through its own "Sync from external URL" feature. This repository does not push to GreasyFork, and there is no such path (GreasyFork exposes no write API).

**Current state (observed 2026-09-17)**: the online GreasyFork `@version` reads `1.7.0`, equal to the source repository's `package.json` (`1.7.0`) and to the GitHub `releases/latest` artifact version. That alignment is an **observation from that date only**, and does not confirm the GreasyFork-side sync state — the sync switch cannot be verified from outside, and future mirror updates still depend on GreasyFork's own pull behaviour. For the latest version, use the source repository channel.

## Contributing

[issue](https://github.com/Xxx91n/Find-Your-Country-Code/issues) and [PR](https://github.com/Xxx91n/Find-Your-Country-Code/pulls) are welcome!

## License

[MIT License](./LICENSE)
