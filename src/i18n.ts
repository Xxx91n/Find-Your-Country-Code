export const LANG = (navigator.language || 'zh').toLowerCase().startsWith('zh') ? 'zh' : 'en';
const MSG = {
  zh: { search:'搜索国家或区号…', favs:'收藏', all:'全部', none:'无结果',
        ok:'已填入', copied:'已复制', needTarget:'请先点击目标字段',
        addFav:'添加收藏', rmFav:'取消收藏',
        summon:'检测到疑似区号字段（低置信）— 点此手动召唤' },
  en: { search:'Search country or code…', favs:'Favorites', all:'All', none:'No results',
        ok:'Filled', copied:'Copied', needTarget:'Click target field first',
        addFav:'Add to favorites', rmFav:'Remove from favorites',
        summon:'Low-confidence matches found — click to summon' },
};
const t = k => (MSG[LANG] || MSG.en)[k] || k;

// ════════════════════════════════════════════════════════

export { t };
