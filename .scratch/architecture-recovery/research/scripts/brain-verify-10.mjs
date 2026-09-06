// 门B/C/D 批量实物核验（大脑）
import fs from 'node:fs';
const R = 'D:/Aworker/mozilla/choose-your-country/';
const vite = fs.readFileSync(R + 'vite.config.ts', 'utf8');
const pkg = JSON.parse(fs.readFileSync(R + 'package.json', 'utf8'));
const glog = fs.readFileSync(R + 'greasyfork/Glog.md', 'utf8');
const glogEn = fs.readFileSync(R + 'greasyfork/Glog_EN.md', 'utf8');
console.log('B1 vite userscript.version=1.4.0: ' + /version:\s*['"]1\.4\.0['"]/.test(vite));
console.log('B2 package.json version=1.4.0: ' + (pkg.version === '1.4.0'));
console.log('B3 Glog 含 1.4.0: ' + glog.includes('1.4.0') + ' | Glog_EN: ' + glogEn.includes('1.4.0'));
for (const f of ['CONTRIBUTING.md', 'CONTRIBUTING_EN.md']) {
  try { const s = fs.statSync(R + f); console.log('C ' + f + ' ' + s.size + 'B'); } catch { console.log('C ' + f + ' MISSING'); }
}
const dry = fs.readFileSync(R + '.github/workflows/release-dry-run.yml', 'utf8');
console.log('D1 dry-run 含 workflow_dispatch: ' + dry.includes('workflow_dispatch'));
console.log('D2 dry-run 无 softprops/gh-release（不创建 Release）: ' + !(dry.includes('softprops') || dry.includes('gh-release')));
console.log('D3 dry-run 含 tag 判重输出: ' + dry.includes('already exists'));
const rel = fs.readFileSync(R + '.github/workflows/release.yml', 'utf8');
console.log('E1 release.yml 从 dist 提取版本: ' + rel.includes("dist/find-your-country-code.user.js | awk"));
console.log('E2 release.yml 附件为 dist 产物: ' + rel.includes('files: dist/find-your-country-code.user.js'));
console.log('E3 release.yml 空版本防护: ' + rel.includes('not found in dist'));
console.log('E4 release.yml 保留 tag 判重+双语 changelog: ' + rel.includes('check_tag') && rel.includes('changelog_cn') && rel.includes('changelog_en'));
