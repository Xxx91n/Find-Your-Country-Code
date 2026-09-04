// 票10 — 发布链路适配验收门（静态结构检查 + --links 在线链接验证）
// 用法: node .scratch/architecture-recovery/research/scripts/verify-ticket-10.mjs [--links]
// 退出码: 0 = 全部通过; 1 = 有失败项
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import https from 'node:https';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
let pass = 0, fail = 0;
const check = (name, cond) => { if (cond) { pass++; console.log('PASS ' + name); } else { fail++; console.log('FAIL ' + name); } };

const rel = fs.readFileSync(path.join(root, '.github/workflows/release.yml'), 'utf8').replace(/\r\n/g, '\n');
const dry = fs.readFileSync(path.join(root, '.github/workflows/release-dry-run.yml'), 'utf8').replace(/\r\n/g, '\n');
const zh = fs.readFileSync(path.join(root, 'CONTRIBUTING.md'), 'utf8').replace(/\r\n/g, '\n');
const en = fs.readFileSync(path.join(root, 'CONTRIBUTING_EN.md'), 'utf8').replace(/\r\n/g, '\n');

// --- A. release.yml 适配（issue 验收1：构建产物路径 + 版本提取） ---
check('A1 触发路径含 src/**', rel.includes("- 'src/**'"));
check('A2 触发路径含 vite.config.ts/package.json/package-lock.json', ["'vite.config.ts'", "'package.json'", "'package-lock.json'"].every(s => rel.includes(s)));
check('A3 不再引用旧单文件 src/Find-Your-Country-Code.js', !rel.includes('src/Find-Your-Country-Code.js'));
check('A4 npm ci + npm run build 进入发布链路', rel.includes('run: npm ci') && rel.includes('run: npm run build'));
check('A5 版本提取自构建产物 dist/find-your-country-code.user.js', /grep -m1 '\/\/ @version' dist\/find-your-country-code\.user\.js/.test(rel));
check('A6 空版本防护存在', rel.includes('[ -z "$VERSION" ]'));
check('A7 tag 判重逻辑保留（ls-remote）', rel.includes('git ls-remote --tags origin'));
check('A8 Release 附件为 dist 产物', rel.includes('files: dist/find-your-country-code.user.js'));
check('A9 Glog 双语 changelog 读取保留', rel.includes('cat greasyfork/Glog.md') && rel.includes('cat greasyfork/Glog_EN.md'));
check('A10 仅 main 触发发布（分支推送不发布）', /branches:\n\s+- main/.test(rel));

// --- B. release-dry-run.yml（验收1 的 dry-run 验证载体） ---
check('B1 workflow_dispatch 触发存在', /workflow_dispatch:/.test(dry));
check('B2 cch/10 分支推送触发（dry-run 验证通道）', dry.includes("'cch/10-release-pipeline'"));
check('B3 dry-run 走相同构建+提取逻辑', dry.includes('run: npm ci') && /grep -m1 '\/\/ @version' dist\/find-your-country-code\.user\.js/.test(dry));
check('B4 版本三源一致性校验（产物/vite/package.json）', dry.includes('vite.config.ts') && dry.includes("require('./package.json').version"));
check('B5 dry-run 不创建 Release（无 gh-release step）', !dry.includes('action-gh-release'));
check('B6 产物上传留证（upload-artifact）', dry.includes('actions/upload-artifact@v4'));

// --- C. 贡献说明（issue 验收2：Glog/GREADME 流程；验收3：链接验证方法文档化） ---
check('C1 Glog.md 更新流程写入贡献说明', zh.includes('Glog.md') && zh.includes('更新日志'));
check('C2 Glog_EN.md 同步流程写入', zh.includes('Glog_EN.md'));
check('C3 EN 版同步存在', en.includes('Glog.md') && en.includes('Glog_EN.md'));
check('C4 版本号双处同步说明（vite+package.json）', zh.includes('userscript.version') && zh.includes('package.json'));
check('C5 GreasyFork 安装链验证方法文档化', zh.includes('update.greasyfork.org/scripts/573755') && zh.includes('验证方法'));
check('C6 GitHub Release 附件验证方法文档化', zh.includes('releases/download'));
check('C7 JsDelivr 验证方法与边界（dist 不入 git）文档化', zh.includes('cdn.jsdelivr.net/gh') && zh.includes('不入 git'));
check('C8 beta/外发动作须人工确认边界写入', zh.includes('需人工确认') && zh.includes('必须经用户确认'));
check('C9 EN 镜像覆盖链接验证方法', en.includes('update.greasyfork.org') && en.includes('cdn.jsdelivr.net'));

console.log('STATIC-GATE RESULT: ' + pass + ' pass, ' + fail + ' fail');

// --- D. 下载链接在线验证（--links 时执行；只读 GET，不发版不写库） ---
if (process.argv.includes('--links')) {
  const LINKS = [
    { name: 'greasyfork-install(user.js)', url: 'https://update.greasyfork.org/scripts/573755/Find-Your-Country-Code.user.js', checkVersion: true },
    { name: 'greasyfork-meta(meta.js)', url: 'https://update.greasyfork.org/scripts/573755/Find-Your-Country-Code.meta.js', checkVersion: true },
    { name: 'greasyfork-page', url: 'https://greasyfork.org/zh-CN/scripts/573755-find-your-country-code' },
    { name: 'jsdelivr-main1.png', url: 'https://cdn.jsdelivr.net/gh/Xxx91n/Find-Your-Country-Code@refs/heads/main/greasyfork/main1.png' },
    { name: 'jsdelivr-main2.png', url: 'https://cdn.jsdelivr.net/gh/Xxx91n/Find-Your-Country-Code@refs/heads/main/greasyfork/main2.png' },
  ];
  const probe = (link) => new Promise((resolve) => {
    const req = https.get(link.url, { headers: { 'User-Agent': 'cch-verify-ticket-10' }, timeout: 20000 }, (res) => {
      const chunks = [];
      res.on('data', (c) => { if (link.checkVersion && chunks.length < 64) chunks.push(c); });
      res.on('end', () => {
        let version = null;
        if (link.checkVersion) {
          const m = Buffer.concat(chunks).toString('utf8').match(/@version\s+([0-9][0-9.]*)/);
          version = m ? m[1] : null;
        }
        resolve({ name: link.name, status: res.statusCode, version, cv: !!link.checkVersion });
      });
      res.resume();
    });
    req.on('timeout', () => { req.destroy(); resolve({ name: link.name, status: 'TIMEOUT', version: null, cv: !!link.checkVersion }); });
    req.on('error', (e) => resolve({ name: link.name, status: 'ERR:' + (e.code || e.message), version: null, cv: !!link.checkVersion }));
  });
  for (const l of LINKS) {
    const r = await probe(l);
    const ok = r.status === 200 && (!r.cv || r.version);
    check('LINK ' + r.name + ': HTTP ' + r.status + (r.version ? ' @version=' + r.version : ''), ok);
  }
  console.log('FULL RESULT: ' + pass + ' pass, ' + fail + ' fail');
}
process.exit(fail ? 1 : 0);
