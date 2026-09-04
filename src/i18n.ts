export const LANG = (navigator.language || 'zh').toLowerCase().startsWith('zh') ? 'zh' : 'en';
const MSG = {
  zh: { search:'搜索国家或区号…', favs:'收藏', all:'全部', none:'无结果',
        ok:'已填入', copied:'已复制', needTarget:'请先点击目标字段',
        addFav:'添加收藏', rmFav:'取消收藏',
        summon:'检测到疑似区号字段（低置信）— 点此手动召唤',
        ruleNoneRemembered:'已记住：本页此字段不再提示',
        ruleExemptAdded:'已在本站禁用本脚本',
        ruleExemptRemoved:'已恢复本站检测' },
  en: { search:'Search country or code…', favs:'Favorites', all:'All', none:'No results',
        ok:'Filled', copied:'Copied', needTarget:'Click target field first',
        addFav:'Add to favorites', rmFav:'Remove from favorites',
        summon:'Low-confidence matches found — click to summon',
        ruleNoneRemembered:'Remembered: this field will not be flagged again on this site',
        ruleExemptAdded:'Script disabled on this site',
        ruleExemptRemoved:'Detection restored on this site' },
};
const t = k => (MSG[LANG] || MSG.en)[k] || k;

// ════════════════════════════════════════════════════════

export { t };
