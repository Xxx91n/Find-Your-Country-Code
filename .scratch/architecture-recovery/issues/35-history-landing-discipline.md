# 35 — 历史可查落地纪律

**What to build:** 本周期落地全程保留票级提交历史——main 父链可逐级追溯到每张票的提交，不再出现「无父 root commit + 单条散文提交」的历史归零形态；验证结论与纪律条目固化进 WORKFLOW §5 教训登记簿，防止下一周期重演。

**覆盖 A-xxx:** A-010

**Blocked by:** 33 — 版本 bump 与全部合入完成后，才能以最终 main 历史做验证。

**Status:** ready-for-agent

- [x] 落地不 squash、不改写已有历史：本周期每票保留独立提交并进入 main 父链（执行主体与操作面遵循 WORKFLOW §4.2）
- [x] 只读验证 1：main 上 `git log --format="%h parents:%p"`——本周期票级提交在父链中逐级可追，无新增无父 root commit
- [x] 只读验证 2：票 33 的目标版本 tag 为 main 祖先（`git merge-base --is-ancestor <tag> main`；当轮未真实发版则报告记录「待发版」，不判红）
- [x] 纪律落档：「周期合入禁 squash / 禁历史归零」教训条目（含本票验证证据）追加至 WORKFLOW §5，与既有行格式一致
- [x] 证据锚 commit sha + CI run ID（本票无 CI 面时，报告注明「无 CI 证据面，commit sha + 只读命令输出即证据」）；验证命令一律只读类，不产生本机构建产物