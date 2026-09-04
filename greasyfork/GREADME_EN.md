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
      <img width="100%" src="https://cdn.jsdelivr.net/gh/Xxx91n/Find-Your-Country-Code@refs/heads/main/greasyfork/main1.png">
    </td>
    <td style="vertical-align: top;">
      <img width="100%" src="https://cdn.jsdelivr.net/gh/Xxx91n/Find-Your-Country-Code@refs/heads/main/greasyfork/main2.png">
    </td>
  </tr>
</table>