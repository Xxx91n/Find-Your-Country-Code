# ADR-0007: 站点规则 scope 显式化（页面级 vs 元素级）

日期：2026-09-12 ｜ 状态：accepted（取代 ADR-0003 的「页面级分档覆盖」语义）｜ 来源：Cycle-4 票 30（A-004）

## 背景

ADR-0003 将分档覆盖建模为「页面级：该站任一 auto/lowkey 规则把整页注入档位下限抬升/压到声明档」。实证（锐评2 #6 + 票 30 复现红 run 34687387189）表明该语义泄漏：单条元素级规则会使整页无关字段被抬档（误报放大），且与 Bitwarden/KeePassXC 的「选择器级干预」行业心智不符。

## 决策

1. 规则文档 `overrides[]` 新增可选字段 `scope: 'element' | 'page'`；**缺省归一为 `element`**（v1 旧文档向后兼容，无需迁移——页面级规则此前从无 UI 写入口，无真实存量）。
2. `pageTierOverride()` 仅消费 `scope:'page'` 规则；`forcedTier()` 跳过页面规则（页面档不得走免评分强注路径，仍经评分后重映射并留痕 `rule:tier-override`）。
3. 负反馈冲突清理（`matchingOverrides`）只针对元素级规则。
4. 可访问性：页面级规则暂无面板写入口（GM/API 可达，票 30 D-30e 登记）。

## 后果

- 正：单条元素规则不再放大整页；语义与「用户显式干预以选择器为单位」对齐。
- 负：RULES_MAX_OVERRIDES=500 上限下多一类规则；页面级需手工/API 创建。

## 反证条件

- 出现「用户批量临时抬档」真实需求且面板提供显式页面级入口时，可扩 `scope` 的 UI 面（模型不变）。
- 元素级规则语义与行业再次分叉且有两源以上实证时重开。

## 参考

- 复现/收敛证据：run 34687387189（红）→ 34687594979（绿）；票 30 报告 + `verification/review-wave1-cycle4.md`。
- 行业对标：atomcode 票 30 调研纪要（Apple exact-domain / Bitwarden match-detection / Dashlane 三粒度；通配 selector 落选）。
