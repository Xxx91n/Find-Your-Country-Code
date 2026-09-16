# R-3 居中红：最小修复移交说明

**状态**：已在隔离环境验证通过（构建 / tsc / 两项脚本门 / entry-access / 全量 E2E ×2 全绿），**尚未落到任何分支**。
**基准**：`cch/02-settings-surface` 的 `src/ui/index.ts`
`sha256 = 864fda62bff01eeaeb3ecde2b291360b080114a6fed9cff9a84881f5275aaade`（`wc -l` = 861）

**红灯**：`tests/entry-access.spec.ts:53`
`expect(Math.abs(box.y + box.height/2 - vh.height/2)).toBeLessThan(30)` → Received 31.58929443359375
（同一断言的水平方向 `:52` 通过。CI 实测 36.5，数值随树/时序浮动。）

---

## 1. 根因：三项复合，不是单一 Δh/2

原假设只指向「`_pos` 用调用时高度做居中」。实测确认该项存在，但**只占 19px**，不足以单独越过 30px 门；真正的越门由第二项补齐。

| # | 分量 | 证据 | 贡献 |
|---|---|---|---|
| 1 | **时序**：`_pos` 在 `_render` 之前 | 探针栈 `_pos ← open`；调用时 `pop.offsetHeight` = **424**，内容渲染后 = **462** | **+19px**（= Δh/2） |
| 2 | **宿主页样式泄漏**：面板 `margin` 未清零 | fixture `entry-access.html` 有裸规则 `div{margin:12px 0}`，命中挂在 `document.body` 的 `#cch-pop`；`getComputedStyle(pop).marginTop` = **12px**；`rect.y`(162.19) − `style.top`(148) ≈ 14.19 = 12 + 动画 | **+12px** |
| 3 | **入场动画 `cchIn` 的合成 transform** | `transform: matrix(0.9874, …, 3.35)`，`getAnimations()` 显示 `state:"running"`；`getBoundingClientRect` 含 transform | 0 ~ 7.5px 浮动 |

**19 + 12 = 31 ≈ 实测 31.59** ✓

- `_pos` 位置：`src/ui/index.ts` 定义于 L727；调用点仅两处 —— `open()` 内 L402、`_bindViewportTracking()` 内 L681（后者只在 `anchor != null` 时触发）。
- 调用顺序（`open()`）：`appendChild(pop)` → **`_pos(pop, anchor)`** → `_bindViewportTracking()` → `_bindPopupEvents(pop)` → **`_render('')`**。
- `_render()` 全同步、内部**不**调用 `_pos`；列表行填充（223 行）与 `max-height: min(78vh,460px)` 的钳制都在这一步完成，故 `_render` 返回后高度即定型。
- 分量 3 解释了「本机 31.6 / CI 36.5」的差异：动画 `transform` 会进 `boundingBox()`，属时间敏感项。

### 稳定性实测（复刻 `:53` 取数路径 ×10）

| | Δ 分布 | 结果 |
|---|---|---|
| 修复前 | `[31.59, 31.59, 31.59, 32.18, 32.18, 32.18, 32.18, 32.18, 31.59, 32.18]` | **10/10 必红** |
| 修复后 | `[0.25, 0.25, 1.18, 0.25, 0.59, 0.25, 0.25, 0.59, 0.59, 0.59]` | max **1.18**，10/10 绿 |

修复后几何：`styleTop` **148 → 129**（= (720−462)/2）、`marginTop` **12 → 0**、Δ **31.59 → ≤1.18**。

---

## 2. 两处改动（确切前后代码）

补丁：`r3-centering.patch`（`-p1`）。共 2 个 hunk、新增 10 行（861 → 871 行）。

### 改动 1 —— `#cch-pop` 清零宿主页 margin（CSS，L48-52 区）

**前**
```css
width:320px;max-height:min(78vh,460px);display:flex;flex-direction:column;overflow:hidden;
animation:cchIn .12s ease;z-index:2147483647}
```

**后**
```css
width:320px;max-height:min(78vh,460px);display:flex;flex-direction:column;overflow:hidden;
/* 面板挂 document.body，宿主页的裸 div 规则（如 entry-access fixture 的 div{margin:12px 0}）
   会按其盒模型污染面板：margin 把定位后的面板整体推离 _pos 算出的 top，居中/锚定都偏。
   面板自带 fixed 定位与显式坐标，margin 必须清零以与宿主页样式解耦。 */
margin:0;
animation:cchIn .12s ease;z-index:2147483647}
```

### 改动 2 —— 内容定型后按最终高度重算居中（`open()` 内）

**前**
```ts
    document.body.appendChild(pop);
    this._pos(pop, anchor);
    this._bindViewportTracking();
    this._bindPopupEvents(pop);
    this._render('');

    const close = (e: MouseEvent) => {
```

**后**
```ts
    document.body.appendChild(pop);
    this._pos(pop, anchor);
    this._bindViewportTracking();
    this._bindPopupEvents(pop);
    this._render('');

    // 居中路径（anchor===null）的垂直居中基于 offsetHeight，而上面这次 _pos 发生在
    // _render 之前——此时列表还是空的，offsetHeight 明显偏小；_render 同步填充行数据后
    // 面板继续长高，中心随 Δh/2 下移，判定因此对时序/内容敏感（R-3 红灯）。
    // 在内容定型后按最终高度重算一次；仅作用于居中路径，锚定路径语义不变。
    if (!anchor) this._pos(pop, anchor);

    const close = (e: MouseEvent) => {
```

> 注：保留 L402 的首次 `_pos` 不改。它在 `appendChild` 后立即给出 `position:fixed`，避免面板以静态流形态参与布局；第二次调用同属一个同步任务，中间不产生绘制，无闪烁。

---

## 3. 锚定路径（`anchor != null`）无回归论证

1. **代码层**：`_pos` 的锚定分支（含票 37 R1 的「盒内图标按字段右缘锚定」逻辑，原 L748-752）**逐字节未改**；新增调用被 `if (!anchor)` 守卫，锚定路径**永不执行**该行。
2. **`margin:0` 在 R1 相关夹具上是空操作**：`lowkey-clip.html` / `lowkey-occlusion.html` 的 `<style>` 中**没有** `div{margin…}` 规则；全仓库仅 `entry-access.html` 与 `weak-signal.html` 带该规则。故 R1 遮挡用例的锚定几何不受本改动影响。
3. **对有该规则的宿主页**：锚定面板此前被下推 12px，现回到既定的 `anchor.bottom + 8` 语义；仍留 8px 间隙，不压锚点，反而使 `_pos` 内的上翻判定 `tp + ph > innerHeight - m` 首次拿到真实高度。
4. **实跑佐证**：`entry-access.spec.ts` 7/7（含 R1「盒内 lowkey 锚开面板不遮挡下一字段图标」）、`weak-signal.spec.ts` 3/3、全量 104/104 ×2 全绿。

---

## 4. 实跑结果（隔离目录，修复后）

| 门 | 命令 | 结果 |
|---|---|---|
| 构建 | `vite build` | **exit 0** |
| 类型 | `tsc --noEmit` | **exit 0，0 行输出** |
| 票 02 脚本门 | `node tests/scripts/verify-ticket-02-settings.mjs` | **33 PASS / 0 FAIL** |
| 票 42 脚本门 | `node tests/scripts/verify-ticket-42.mjs` | **42 PASS / 0 FAIL** |
| 目标用例 | `playwright test tests/entry-access.spec.ts` | **7 passed / 0 failed** |
| 全量 E2E #1 | `playwright test` | **104 passed / 0 failed**（59.1s） |
| 全量 E2E #2 | `playwright test` | **104 passed / 0 failed**（55.0s） |

修复前基线：全量 103 passed / 1 failed。

---

## 5. 补丁校验（可复现）

```bash
# 基准
git archive cch/02-settings-surface | tar -x -C <临时目录>
sha256sum <临时目录>/src/ui/index.ts
# 期望 864fda62bff01eeaeb3ecde2b291360b080114a6fed9cff9a84881f5275aaade

cd <临时目录>
patch -p1 --dry-run < r3-centering.patch   # 期望：Hunk #1 succeeded at 48. / Hunk #2 succeeded at 408.
patch -p1 < r3-centering.patch
sha256sum src/ui/index.ts
# 期望 c44f7cf531e0a9d41a33d63be7ccdd43140e0b9a8a3df380d6479d76bb388f17（871 行）
```

**实测结果**：`--dry-run` **CLEAN** —— 两个 hunk 均落在精确行号（48 / 408），**无 fuzz、无 offset、无 reject**，exit 0；应用后 `sha256 = c44f7cf531e0a9d41a33d63be7ccdd43140e0b9a8a3df380d6479d76bb388f17`，与已通过全部门禁的验证产物**逐字节一致**；目录内无 `.rej` / `.orig` 残留。

---

## 6. 已知残留与风险

1. **入场动画 `cchIn` 的 transform 项未消除**（分量 3）。该动画 `from{opacity:0;transform:translateY(4px) scale(.985)}`，合成 transform 会进 `boundingBox()`，按 462px 高推算理论最坏约 **7.5px** 瞬时偏差。**本次有意不动**：去掉 `transform` 会改变既定入场视觉。修复后实测 Δ ≤ 1.18，对 30px 门仍有 ≥25× 余量，判定稳过。
2. **`margin:0` 只堵住 margin 这一类泄漏**。宿主页若用裸 `div{padding:…}`、`div{box-sizing:border-box}`、`div{width:…}` 等仍可污染面板盒模型。彻底解耦需在面板上做更完整的 UA/宿主样式隔离（如 `all: initial` 或显式重置一组盒模型属性），代价与回归面都更大，本次未做。
3. **动画重启现象未完全解释**：探针观察到面板插入后约 160ms，`cchIn` 仍 `state:"running"`（`currentTime` 仅 16.7ms），疑似 headless 下合成动画节流/重启。修复不依赖动画状态，故不影响结论，但该现象本身未定位。
4. **未复现 CI 的 36.5 / 交接描述的 33.12**，本机只复现到同量级的 31.59–32.18。根因分解（19 + 12 + 动画浮动）与该差异自洽，但精确数值未对齐。
5. **落地范围待用户裁定**：本补丁只针对 `cch/02-settings-surface` 一支。若同一 `_pos`/`#cch-pop` 代码在其余三支（或其他分支）各自存在，需分别确认是否同源、是否逐支施加同一补丁，还是先在某一支落地后向上游合并。**本补丁不假设可跨支直接套用**——每支都应先按 §5 校验基准 `sha256` 与 dry-run CLEAN。

---

## 7. 工件信息

| 文件 | 字节数 | 行数 | sha256（前 16 位） | 编码 |
|---|---|---|---|---|
| `r3-centering.patch` | 1670 | 26 | `d1606e4a44bc0f8f` | 无 BOM / LF |
| `r3-centering-README.md` | 自指不内联 | 自指不内联 | 自指不内联 | 无 BOM / LF |

> 本 README 的尺寸/哈希**不在此内联**：内联会改变文件内容从而使哈希失效（自指）。其权威数值由交付报告给出。

补丁目标产物（应用后 `src/ui/index.ts`）：871 行，
`sha256 = c44f7cf531e0a9d41a33d63be7ccdd43140e0b9a8a3df380d6479d76bb388f17`
