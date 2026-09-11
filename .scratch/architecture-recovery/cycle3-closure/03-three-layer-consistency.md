# Three-Layer Document Consistency Check

> CONTEXT.md ↔ docs/adr ↔ Code reality

## 3.1 Code ↔ ADR consistency

| ADR claim | Code evidence | Match |
|-----------|----------------|-------|
| tsconfig strict | true | ✅ |
| typecheck script | true | ✅ |
| typecheck.yml | true | ✅ |
| tests/scripts/ | true | ✅ |
| Find-Your-Country-Code.js deleted | true | ✅ |
| CONTEXT.md 145 lines | true | ✅ |

## 3.2 CONTEXT.md ↔ ADR consistency

| ADR # | Topic | CONTEXT.md term | Match |
|-------|-------|-----------------|-------|
| ADR-0006 (0001) | CI 门禁 | present at line 103 | ✅ |
| ADR-0006 (0002) | PR 门控 | present at line 107 | ✅ |
| ADR-0006 (0003) | 密封 E2E | present at line 111 | ✅ |
| ADR-0006 (0004) | 类型门禁 | present at line 104 | ✅ |
| ADR-0006 (0005) | 依赖钉死 | present at line 119 | ✅ |

## 3.3 ADR inventory

- 0001-scoring-engine-replaces-boolean-detection.md (18 lines)
- 0002-vite-plugin-monkey-modularization.md (18 lines)
- 0003-site-rules-engine.md (18 lines)
- 0004-pseudo-select-recognition-deferred.md (16 lines)
- 0005-pseudo-select-recognition-implement.md (32 lines)
- 0006-ci-hygiene-policy.md (43 lines)
