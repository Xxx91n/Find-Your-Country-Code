# Cycle-4 宏观调查：为什么「大多数网页不生效」+ 测试盲区

> 角色：大脑 Agent（只调查，未改任何代码）。日期 2026-09-11。证据全部来自磁盘真实行号 + 两轮 atomcode 高置信调研。

## 0. TL;DR

1. 功能盲区在「检测认不出」，不在填充：真实网页最普遍的两种区号字段形态都落到 none 档（不注入、仅手动召唤）。
2. 「出厂都是幻觉」的机制：CI 绿证据全来自合成 fixture（tests/fixtures/*.html + baseURL 127.0.0.1），是「照着启发式手写的正例」，不是「真实站点抽样」。
3. 锐评2 的三条结构性盲点成立，但属第二优先级（仓库卫生/送达），非本次功能痛点。

## 1. 功能根因（证据锚定）

### G1 纯关键字的独立 input 达不到低置信线（最大覆盖面缺口）
- 证据：src/config.ts:17 L1_STRONG_KW_SCORE=30；src/config.ts:44 SCORE_LOWKEY=35；src/detect/index.ts:326-334 单一 strong kw 只 +30。
- 真实形态：<input type=text name=countryCode> 或 <input type=text placeholder="Country code">。
- 结果：30 < 35 落 none，只进 rememberLow 手动召唤。用户眼里 = 没生效。

### G2 ISO2 作 value 的区号下拉丢证据（libphonenumber 推荐形态漏检）
- 证据：src/detect/index.ts:360-365 括号区号 parenDial 计分嵌套在 if (st.plusDial > 0) 内；optStats:186-188 只有 value 命中 DIAL_SET 才 plusDial++。
- 真实形态：<option value=us>United States (+1)</option>（第 2 轮调研确认「国家↔区号非单射，ISO2 作 value」是行业最佳实践）。
- 结果：value 是 ISO2 时 plusDial=0，整条 L3 区号分支跳过，parenDial 文本证据被丢弃；无 name/label 关键字时只剩 ISO 奖励 30 < 35，落 none。

### G3 搜索候选集结构性缺口
- 证据：src/detect/index.ts:208-215 SCAN_SELECTORS 仅 select / .iti input / .intl-tel-input input / input[tel|text|无type|number] / [role=combobox]。
- 结果：无 ARIA 的纯自定义下拉（div+ul）、contenteditable 完全不进候选集，脚本看不见。

### G4 规则分档覆盖语义泄漏（锐评2 点名，已核实）
- 证据：src/rules/index.ts:64-71 pageOverrides() 只按 host 过滤不看 selector；:87-92 pageTierOverride() 返回该 host 第一条 auto/lowkey；detect/index.ts:701 把它抬到全页元素。
- 结果：该站只要有一条强制选择器指向 auto，整页所有字段被抬到 auto，图标满天误报。

### G5 填充失败静默、无反馈闭环
- 证据：src/fill/index.ts:274-284 run 失败仅弹「已复制到剪贴板」，不报错不重试；:140-150 fillInput 按 placeholder 猜格式（+86/0086/86），写错格式真实站点会拒。
- 结果：真实站点注入成功率无数据，错填也静默。

## 2. 测试盲区（为什么 CI 绿不等于真实可用）

- playwright.config.ts:8 testMatch *.spec.ts、:15 baseURL 127.0.0.1、:18-23 webServer tests/server.mjs。
- tests/fixtures/*.html 全部为手工正例 + 少量负例，0 个真实站点。
- 后果：没有一条测试会暴露 G1/G2/G3；「59 passed / cross-origin 7/7」证明的是启发式能匹配我编的页，不是真实网站能用。

## 3. 行业参照（两轮 atomcode，均高置信）

### 测试侧（第 1 轮）
四层组合拳：①静态模式库（Bitwarden test-the-web / Mozilla form-fill-examples，把真实站点抽象成带标注表单模式）②真实驱动 E2E（Playwright 驱动真实扩展 + CDP Autofill.trigger，断言 fillingStrategy）③流量即语料（web.dev autofill 状态机 + Chrome 众包投票）④大规模爬取评测（Top 100K、FormFactory/FormGym）。
两条硬结论：「WPT 测不了 autofill 触发」官方双源确认，必须自建宿主级测试或走 CDP；「海量真实站点」靠模式抽象 + 低频抽样 + 弱断言 + 可跳过白名单收敛成本。

### 检测侧（第 2 轮）
libphonenumber 元数据是地基（country_calling_codes + leading_digits + national_prefix_for_parsing）；国家↔区号非单射，ISO2 作 value 是行业推荐；react-phone-number-input issue #273 教训：要么始终显示国码、要么始终不显示。

## 4. 优先级排序（供立票决策）

- P0 功能覆盖：修 G1（关键字阈值/补强信号）+ G2（parenDial 移出 plusDial 门）+ G3（扩展候选集覆盖无 ARIA 下拉）。
- P0 测试：建「真实站点抽样语料」（模式库 + 少量真实站点冒烟 + CDP 断言），让 CI 绿能代表真实世界。
- P1 规则正确性：G4（分档覆盖收敛到 selector 级）。
- P1 送达闭环（锐评2）：版本 bump 让安全修复达用户；填充失败反馈闭环 G5。
- P2 门禁减肥/历史卫生（锐评2）：engine-gates 三合一、e2e 补 push:main、main 历史归零整改。

