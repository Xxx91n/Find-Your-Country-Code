# atomcode 纪要 — 票 31 · 填充结果反馈设计对标（Cycle-4 调研，串行单次在途）

> 问题：密码管理器/自动填充库如何呈现「填充成功/失败/降级」三态？如何向测试面暴露可观测信号？
> 「期望 digits 得 plus」类格式分歧业界如何检测？Confidence: 中高（官方文档/源码一手为主）。

## 采用的四条心智结论（→ 票 31 设计映射）

1. **三态 = 能力降级阶梯**（KeePassXC 复制降级 + 10s 清除；Bitwarden quick-copy + Clear clipboard 5min
   默认；1Password 守门式不填）→ run() 状态 filled → copied → failed 阶梯，非并列三文案。
2. **状态即结构化结果**（Chromium ActorFormFillingError 枚举 kSuccess/kNoForm/kNoSuggestions → UMA 持久化）
   → FillResult 对象（status/kind/iso/code/fmtDiff），toast 只是用户面投影，__cchLastFill 单一测试钩子。
3. **格式分歧检测：声明式元数据 > placeholder 猜测**（libphonenumber isPossibleNumber 双级校验；
   MDN autocomplete tel-* token；Chromium ML 预测取代启发式字段猜测）
   → _inputFmtDiff 只吃 pattern/inputmode=numeric|digit/type=number，不引入号码库（A-005 禁依赖）。
4. **约束校验 API 对 JS 赋值盲区**（MDN：minlength/maxlength "not if you set the value ... using JavaScript"）
   → 分歧必须由填充方自行检测，浏览器 validation 不会替我们报警。

## 关键出处（检索级/全文级混合，供交叉核对）

- developer.chrome.com/blog/autofill-event-origin-trial（WICG autofill 事件，DOM 层信号）
- chromium.googlesource.com actor_form_filling_types.h（结果枚举持久化 UMA）
- bitwarden.com/help/auto-fill-browser（quick copy / Clear clipboard 5min）
- keepassxreboot/keepassxc-browser README + KeePassXC User Guide（notifications/clipboardWrite 权限、10s 清除）
- 1password.com/features/autofill（URL 不符 → 不提供 autofill 的守门式失败）
- google/libphonenumber README+FAQ（isPossibleNumber/isValidNumber；国码歧义 49/62）
- developer.mozilla.org Constraint Validation（patternMismatch/typeMismatch；JS 赋值盲区）
- MDN autocomplete（tel/tel-country-code/tel-national token）

## 未采用/边界

- WICG autofill 事件（origin trial）：面向页面开发者感知浏览器原生填充，与我们自管填充不同通道，不接。
- ML 字段预测/号码库校验：违反「不新增运行时依赖」与票 31 只增观测边界，弃。
- Bitwarden 通知栏淡出动画等产品级成功反馈重构：单脚本 toast 通道足够，档位语义对齐即可。
