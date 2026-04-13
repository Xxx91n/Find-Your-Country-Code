// ==UserScript==
// @name         Find-Your-Country-Code
// @namespace    https://github.com/Xxx91n/Find-Your-Country-Code
// @version      1.1.0
// @description  智能识别区号字段，提供快捷搜索和选择
// @author       Xxx91n
// @match        *://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-idle
// ==/UserScript==

(function () {
'use strict';

// ════════════════════════════════════════════════════════
// CONFIG
// ════════════════════════════════════════════════════════
const OWN_ROOT_ID   = 'cch-root';
const WRAPPER_CLASS = 'cch-wrapper';

const SELECT_KW = [
  'country','countrycode','country_code','country-code',
  'dialcode','dial_code','dial-code','dialingcode','dialing_code',
  'callingcode','calling_code','calling-code',
  'phonecode','phone_code','phone-code',
  'areacode','area_code','area-code',
  'intlcode','intl_code','intl-code',
  'prefix','phoneprefix','phone_prefix',
  'mobile_code','mobilecode','countryphone','idd','npa',
];

const INPUT_KW = [
  'mobile_code','mobilecode','phone_code','phonecode',
  'dialcode','dial_code','callingcode','calling_code',
  'countrycode','country_code','intlcode','intl_code',
  'tel_code','telcode',
];

const LABEL_PHRASES = [
  'country code','dial code','calling code','phone code',
  '国家区号','区号','国际区号','电话区号','呼叫代码',
];

// ════════════════════════════════════════════════════════
// COUNTRY DATA
// ════════════════════════════════════════════════════════
const COUNTRIES = [
['+93','AF','🇦🇫','阿富汗','Afghanistan'],
['+355','AL','🇦🇱','阿尔巴尼亚','Albania'],
['+213','DZ','🇩🇿','阿尔及利亚','Algeria'],
['+1684','AS','🇦🇸','美属萨摩亚','American Samoa'],
['+376','AD','🇦🇩','安道尔','Andorra'],
['+244','AO','🇦🇴','安哥拉','Angola'],
['+1264','AI','🇦🇮','安圭拉','Anguilla'],
['+1268','AG','🇦🇬','安提瓜和巴布达','Antigua and Barbuda'],
['+54','AR','🇦🇷','阿根廷','Argentina'],
['+374','AM','🇦🇲','亚美尼亚','Armenia'],
['+297','AW','🇦🇼','阿鲁巴','Aruba'],
['+61','AU','🇦🇺','澳大利亚','Australia'],
['+43','AT','🇦🇹','奥地利','Austria'],
['+994','AZ','🇦🇿','阿塞拜疆','Azerbaijan'],
['+1242','BS','🇧🇸','巴哈马','Bahamas'],
['+973','BH','🇧🇭','巴林','Bahrain'],
['+880','BD','🇧🇩','孟加拉国','Bangladesh'],
['+1246','BB','🇧🇧','巴巴多斯','Barbados'],
['+375','BY','🇧🇾','白俄罗斯','Belarus'],
['+32','BE','🇧🇪','比利时','Belgium'],
['+501','BZ','🇧🇿','伯利兹','Belize'],
['+229','BJ','🇧🇯','贝宁','Benin'],
['+1441','BM','🇧🇲','百慕大','Bermuda'],
['+975','BT','🇧🇹','不丹','Bhutan'],
['+591','BO','🇧🇴','玻利维亚','Bolivia'],
['+387','BA','🇧🇦','波斯尼亚和黑塞哥维那','Bosnia and Herzegovina'],
['+267','BW','🇧🇼','博茨瓦纳','Botswana'],
['+55','BR','🇧🇷','巴西','Brazil'],
['+673','BN','🇧🇳','文莱','Brunei'],
['+359','BG','🇧🇬','保加利亚','Bulgaria'],
['+226','BF','🇧🇫','布基纳法索','Burkina Faso'],
['+257','BI','🇧🇮','布隆迪','Burundi'],
['+855','KH','🇰🇭','柬埔寨','Cambodia'],
['+237','CM','🇨🇲','喀麦隆','Cameroon'],
['+1','CA','🇨🇦','加拿大','Canada'],
['+238','CV','🇨🇻','佛得角','Cape Verde'],
['+1345','KY','🇰🇾','开曼群岛','Cayman Islands'],
['+236','CF','🇨🇫','中非共和国','Central African Republic'],
['+235','TD','🇹🇩','乍得','Chad'],
['+56','CL','🇨🇱','智利','Chile'],
['+86','CN','🇨🇳','中国','China'],
['+57','CO','🇨🇴','哥伦比亚','Colombia'],
['+269','KM','🇰🇲','科摩罗','Comoros'],
['+242','CG','🇨🇬','刚果共和国','Republic of the Congo'],
['+243','CD','🇨🇩','刚果民主共和国','DR Congo'],
['+682','CK','🇨🇰','库克群岛','Cook Islands'],
['+506','CR','🇨🇷','哥斯达黎加','Costa Rica'],
['+225','CI','🇨🇮','科特迪瓦',"Cote d'Ivoire"],
['+385','HR','🇭🇷','克罗地亚','Croatia'],
['+53','CU','🇨🇺','古巴','Cuba'],
['+357','CY','🇨🇾','塞浦路斯','Cyprus'],
['+420','CZ','🇨🇿','捷克','Czech Republic'],
['+45','DK','🇩🇰','丹麦','Denmark'],
['+253','DJ','🇩🇯','吉布提','Djibouti'],
['+1767','DM','🇩🇲','多米尼克','Dominica'],
['+1849','DO','🇩🇴','多米尼加共和国','Dominican Republic'],
['+593','EC','🇪🇨','厄瓜多尔','Ecuador'],
['+20','EG','🇪🇬','埃及','Egypt'],
['+503','SV','🇸🇻','萨尔瓦多','El Salvador'],
['+240','GQ','🇬🇶','赤道几内亚','Equatorial Guinea'],
['+291','ER','🇪🇷','厄立特里亚','Eritrea'],
['+372','EE','🇪🇪','爱沙尼亚','Estonia'],
['+268','SZ','🇸🇿','斯威士兰','Eswatini'],
['+251','ET','🇪🇹','埃塞俄比亚','Ethiopia'],
['+500','FK','🇫🇰','福克兰群岛','Falkland Islands'],
['+298','FO','🇫🇴','法罗群岛','Faroe Islands'],
['+679','FJ','🇫🇯','斐济','Fiji'],
['+358','FI','🇫🇮','芬兰','Finland'],
['+33','FR','🇫🇷','法国','France'],
['+594','GF','🇬🇫','法属圭亚那','French Guiana'],
['+689','PF','🇵🇫','法属波利尼西亚','French Polynesia'],
['+241','GA','🇬🇦','加蓬','Gabon'],
['+220','GM','🇬🇲','冈比亚','Gambia'],
['+995','GE','🇬🇪','格鲁吉亚','Georgia'],
['+49','DE','🇩🇪','德国','Germany'],
['+233','GH','🇬🇭','加纳','Ghana'],
['+350','GI','🇬🇮','直布罗陀','Gibraltar'],
['+30','GR','🇬🇷','希腊','Greece'],
['+299','GL','🇬🇱','格陵兰','Greenland'],
['+1473','GD','🇬🇩','格林纳达','Grenada'],
['+590','GP','🇬🇵','瓜德罗普','Guadeloupe'],
['+1671','GU','🇬🇺','关岛','Guam'],
['+502','GT','🇬🇹','危地马拉','Guatemala'],
['+224','GN','🇬🇳','几内亚','Guinea'],
['+245','GW','🇬🇼','几内亚比绍','Guinea-Bissau'],
['+592','GY','🇬🇾','圭亚那','Guyana'],
['+509','HT','🇭🇹','海地','Haiti'],
['+504','HN','🇭🇳','洪都拉斯','Honduras'],
['+852','HK','🇭🇰','香港','Hong Kong'],
['+36','HU','🇭🇺','匈牙利','Hungary'],
['+354','IS','🇮🇸','冰岛','Iceland'],
['+91','IN','🇮🇳','印度','India'],
['+62','ID','🇮🇩','印度尼西亚','Indonesia'],
['+98','IR','🇮🇷','伊朗','Iran'],
['+964','IQ','🇮🇶','伊拉克','Iraq'],
['+353','IE','🇮🇪','爱尔兰','Ireland'],
['+972','IL','🇮🇱','以色列','Israel'],
['+39','IT','🇮🇹','意大利','Italy'],
['+1876','JM','🇯🇲','牙买加','Jamaica'],
['+81','JP','🇯🇵','日本','Japan'],
['+962','JO','🇯🇴','约旦','Jordan'],
['+7','KZ','🇰🇿','哈萨克斯坦','Kazakhstan'],
['+254','KE','🇰🇪','肯尼亚','Kenya'],
['+686','KI','🇰🇮','基里巴斯','Kiribati'],
['+850','KP','🇰🇵','朝鲜','North Korea'],
['+82','KR','🇰🇷','韩国','South Korea'],
['+965','KW','🇰🇼','科威特','Kuwait'],
['+996','KG','🇰🇬','吉尔吉斯斯坦','Kyrgyzstan'],
['+856','LA','🇱🇦','老挝','Laos'],
['+371','LV','🇱🇻','拉脱维亚','Latvia'],
['+961','LB','🇱🇧','黎巴嫩','Lebanon'],
['+266','LS','🇱🇸','莱索托','Lesotho'],
['+231','LR','🇱🇷','利比里亚','Liberia'],
['+218','LY','🇱🇾','利比亚','Libya'],
['+423','LI','🇱🇮','列支敦士登','Liechtenstein'],
['+370','LT','🇱🇹','立陶宛','Lithuania'],
['+352','LU','🇱🇺','卢森堡','Luxembourg'],
['+853','MO','🇲🇴','澳门','Macau'],
['+261','MG','🇲🇬','马达加斯加','Madagascar'],
['+265','MW','🇲🇼','马拉维','Malawi'],
['+60','MY','🇲🇾','马来西亚','Malaysia'],
['+960','MV','🇲🇻','马尔代夫','Maldives'],
['+223','ML','🇲🇱','马里','Mali'],
['+356','MT','🇲🇹','马耳他','Malta'],
['+692','MH','🇲🇭','马绍尔群岛','Marshall Islands'],
['+596','MQ','🇲🇶','马提尼克','Martinique'],
['+222','MR','🇲🇷','毛里塔尼亚','Mauritania'],
['+230','MU','🇲🇺','毛里求斯','Mauritius'],
['+52','MX','🇲🇽','墨西哥','Mexico'],
['+691','FM','🇫🇲','密克罗尼西亚','Micronesia'],
['+373','MD','🇲🇩','摩尔多瓦','Moldova'],
['+377','MC','🇲🇨','摩纳哥','Monaco'],
['+976','MN','🇲🇳','蒙古','Mongolia'],
['+382','ME','🇲🇪','黑山','Montenegro'],
['+1664','MS','🇲🇸','蒙特塞拉特','Montserrat'],
['+212','MA','🇲🇦','摩洛哥','Morocco'],
['+258','MZ','🇲🇿','莫桑比克','Mozambique'],
['+95','MM','🇲🇲','缅甸','Myanmar'],
['+264','NA','🇳🇦','纳米比亚','Namibia'],
['+674','NR','🇳🇷','瑙鲁','Nauru'],
['+977','NP','🇳🇵','尼泊尔','Nepal'],
['+31','NL','🇳🇱','荷兰','Netherlands'],
['+687','NC','🇳🇨','新喀里多尼亚','New Caledonia'],
['+64','NZ','🇳🇿','新西兰','New Zealand'],
['+505','NI','🇳🇮','尼加拉瓜','Nicaragua'],
['+227','NE','🇳🇪','尼日尔','Niger'],
['+234','NG','🇳🇬','尼日利亚','Nigeria'],
['+683','NU','🇳🇺','纽埃','Niue'],
['+1670','MP','🇲🇵','北马里亚纳群岛','Northern Mariana Islands'],
['+47','NO','🇳🇴','挪威','Norway'],
['+968','OM','🇴🇲','阿曼','Oman'],
['+92','PK','🇵🇰','巴基斯坦','Pakistan'],
['+680','PW','🇵🇼','帕劳','Palau'],
['+970','PS','🇵🇸','巴勒斯坦','Palestine'],
['+507','PA','🇵🇦','巴拿马','Panama'],
['+675','PG','🇵🇬','巴布亚新几内亚','Papua New Guinea'],
['+595','PY','🇵🇾','巴拉圭','Paraguay'],
['+51','PE','🇵🇪','秘鲁','Peru'],
['+63','PH','🇵🇭','菲律宾','Philippines'],
['+48','PL','🇵🇱','波兰','Poland'],
['+351','PT','🇵🇹','葡萄牙','Portugal'],
['+1787','PR','🇵🇷','波多黎各','Puerto Rico'],
['+974','QA','🇶🇦','卡塔尔','Qatar'],
['+262','RE','🇷🇪','留尼汪','Reunion'],
['+40','RO','🇷🇴','罗马尼亚','Romania'],
['+7','RU','🇷🇺','俄罗斯','Russia'],
['+250','RW','🇷🇼','卢旺达','Rwanda'],
['+1869','KN','🇰🇳','圣基茨和尼维斯','Saint Kitts and Nevis'],
['+1758','LC','🇱🇨','圣卢西亚','Saint Lucia'],
['+1784','VC','🇻🇨','圣文森特和格林纳丁斯','Saint Vincent and the Grenadines'],
['+685','WS','🇼🇸','萨摩亚','Samoa'],
['+378','SM','🇸🇲','圣马力诺','San Marino'],
['+239','ST','🇸🇹','圣多美和普林西比','Sao Tome and Principe'],
['+966','SA','🇸🇦','沙特阿拉伯','Saudi Arabia'],
['+221','SN','🇸🇳','塞内加尔','Senegal'],
['+381','RS','🇷🇸','塞尔维亚','Serbia'],
['+248','SC','🇸🇨','塞舌尔','Seychelles'],
['+232','SL','🇸🇱','塞拉利昂','Sierra Leone'],
['+65','SG','🇸🇬','新加坡','Singapore'],
['+1721','SX','🇸🇽','圣马丁岛','Sint Maarten'],
['+421','SK','🇸🇰','斯洛伐克','Slovakia'],
['+386','SI','🇸🇮','斯洛文尼亚','Slovenia'],
['+677','SB','🇸🇧','所罗门群岛','Solomon Islands'],
['+252','SO','🇸🇴','索马里','Somalia'],
['+27','ZA','🇿🇦','南非','South Africa'],
['+211','SS','🇸🇸','南苏丹','South Sudan'],
['+34','ES','🇪🇸','西班牙','Spain'],
['+94','LK','🇱🇰','斯里兰卡','Sri Lanka'],
['+249','SD','🇸🇩','苏丹','Sudan'],
['+597','SR','🇸🇷','苏里南','Suriname'],
['+46','SE','🇸🇪','瑞典','Sweden'],
['+41','CH','🇨🇭','瑞士','Switzerland'],
['+963','SY','🇸🇾','叙利亚','Syria'],
['+886','TW','🇹🇼','台湾','Taiwan'],
['+992','TJ','🇹🇯','塔吉克斯坦','Tajikistan'],
['+255','TZ','🇹🇿','坦桑尼亚','Tanzania'],
['+66','TH','🇹🇭','泰国','Thailand'],
['+670','TL','🇹🇱','东帝汶','Timor-Leste'],
['+228','TG','🇹🇬','多哥','Togo'],
['+676','TO','🇹🇴','汤加','Tonga'],
['+1868','TT','🇹🇹','特立尼达和多巴哥','Trinidad and Tobago'],
['+216','TN','🇹🇳','突尼斯','Tunisia'],
['+90','TR','🇹🇷','土耳其','Turkey'],
['+993','TM','🇹🇲','土库曼斯坦','Turkmenistan'],
['+1649','TC','🇹🇨','特克斯和凯科斯群岛','Turks and Caicos Islands'],
['+688','TV','🇹🇻','图瓦卢','Tuvalu'],
['+256','UG','🇺🇬','乌干达','Uganda'],
['+380','UA','🇺🇦','乌克兰','Ukraine'],
['+971','AE','🇦🇪','阿联酋','United Arab Emirates'],
['+44','GB','🇬🇧','英国','United Kingdom'],
['+1','US','🇺🇸','美国','United States'],
['+598','UY','🇺🇾','乌拉圭','Uruguay'],
['+998','UZ','🇺🇿','乌兹别克斯坦','Uzbekistan'],
['+678','VU','🇻🇺','瓦努阿图','Vanuatu'],
['+58','VE','🇻🇪','委内瑞拉','Venezuela'],
['+84','VN','🇻🇳','越南','Vietnam'],
['+967','YE','🇾🇪','也门','Yemen'],
['+260','ZM','🇿🇲','赞比亚','Zambia'],
['+263','ZW','🇿🇼','津巴布韦','Zimbabwe'],
['+389','MK','🇲🇰','北马其顿','North Macedonia'],
['+1340','VI','🇻🇮','美属维尔京群岛','U.S. Virgin Islands'],
['+1284','VG','🇻🇬','英属维尔京群岛','British Virgin Islands'],
['+246','IO','🇮🇴','英属印度洋领地','British Indian Ocean Territory'],
].map(([code, iso, flag, zh, en]) => ({ code, iso, flag, country: zh, countryEn: en }));

const ISO2_MAP = Object.fromEntries(COUNTRIES.map(c => [c.iso.toLowerCase(), c]));

// ════════════════════════════════════════════════════════
// I18N
// ════════════════════════════════════════════════════════
const LANG = (navigator.language || 'zh').toLowerCase().startsWith('zh') ? 'zh' : 'en';
const MSG = {
  zh: { search:'搜索国家或区号…', favs:'收藏', all:'全部', none:'无结果',
        ok:'已填入', copied:'已复制', needTarget:'请先点击目标字段',
        addFav:'添加收藏', rmFav:'取消收藏' },
  en: { search:'Search country or code…', favs:'Favorites', all:'All', none:'No results',
        ok:'Filled', copied:'Copied', needTarget:'Click target field first',
        addFav:'Add to favorites', rmFav:'Remove from favorites' },
};
const t = k => (MSG[LANG] || MSG.en)[k] || k;

// ════════════════════════════════════════════════════════
// STORAGE
// ════════════════════════════════════════════════════════
const Store = {
  _k: 'cch_v33',
  _c: null,
  _load() {
    if (this._c) return this._c;
    try { this._c = JSON.parse(GM_getValue(this._k, '{}')); } catch { this._c = {}; }
    if (!Array.isArray(this._c.favs)) this._c.favs = [];
    return this._c;
  },
  _save(d) { this._c = d; GM_setValue(this._k, JSON.stringify(d)); },
  isFav(code, iso) { return this._load().favs.some(f => f.code === code && f.iso === iso); },
  addFav(c) {
    const d = this._load();
    if (!this.isFav(c.code, c.iso)) { d.favs.push(c); this._save(d); }
  },
  rmFav(code, iso) {
    const d = this._load();
    d.favs = d.favs.filter(f => !(f.code === code && f.iso === iso));
    this._save(d);
  },
  getFavs() { return this._load().favs; },
};

// ════════════════════════════════════════════════════════
// DETECTION
// ════════════════════════════════════════════════════════
const Detect = {
  _done: new WeakSet(),

  _own(el) {
    return !!el.closest('#' + OWN_ROOT_ID) ||
           !!el.closest('.' + WRAPPER_CLASS) ||
           el.id === 'cch-search';
  },

  _kw(str, list) {
    if (!str) return false;
    const s = str.toLowerCase().replace(/[-_\s]/g, '');
    return list.some(k => s.includes(k.replace(/[-_\s]/g, '')));
  },

  _label(el) {
    if (el.id) {
      const l = document.querySelector('label[for="' + el.id + '"]');
      if (l) return l.textContent;
    }
    const lp = el.closest('label');
    if (lp) return lp.textContent;
    const lid = el.getAttribute('aria-labelledby');
    if (lid) { const l = document.getElementById(lid); if (l) return l.textContent; }
    return '';
  },

  _isIti(el) {
    if (el.tagName !== 'INPUT') return false;
    if (el.closest('.iti') || el.closest('.intl-tel-input')) return true;
    if (el.dataset && el.dataset.intlTelInputId) return true;
    if (typeof window.jQuery !== 'undefined') {
      try {
        const pluginData = window.jQuery(el).data('plugin_intlTelInput') ||
                           window.jQuery(el).data('intlTelInput');
        if (pluginData) return true;
      } catch {}
    }
    return false;
  },

  _isSelect(el) {
    if (el.tagName !== 'SELECT') return false;
    const opts = Array.from(el.options).filter(o => (o.value || '').trim());
    if (opts.length < 2) return false;

    const attrStr = [el.name, el.id, el.className,
      el.getAttribute('data-name'), el.getAttribute('aria-label'), el.title]
      .filter(Boolean).join(' ');

    const lbl = this._label(el).toLowerCase();
    const hasLabelPhrase = LABEL_PHRASES.some(p => lbl.includes(p));

    const hasAttrKw = this._kw(attrStr, SELECT_KW) ||
      this._kw(this._label(el), SELECT_KW) ||
      (el.parentElement && this._kw(
        el.parentElement.className + ' ' + (el.parentElement.getAttribute('aria-label') || ''),
        SELECT_KW
      ));

    if (hasAttrKw || hasLabelPhrase) return true;

    const hitPlus = opts.filter(o => {
      const v = o.value.trim();
      const txt = o.text || '';
      return /^\+\d{1,4}$/.test(v) || /\(\+\d{1,4}\)/.test(txt);
    });
    if (hitPlus.length >= 2 && hitPlus.length / opts.length >= 0.4) return true;

    const allText = opts.map(o => (o.text || '').toLowerCase()).join(' ');
    if (/(china|japan|united states|usa|america|germany|france|india|canada|australia|united kingdom|uk)/.test(allText)) {
      return true;
    }

    return false;
  },

  _isInput(el) {
    if (el.tagName !== 'INPUT') return false;
    if (this._isIti(el)) return false;
    const type = (el.type || 'text').toLowerCase();
    if (!['text','tel',''].includes(type)) return false;

    const attrStr = [el.name, el.id, el.className,
      el.getAttribute('placeholder'), el.getAttribute('aria-label'),
      el.getAttribute('data-name'), el.title].filter(Boolean).join(' ');
    if (this._kw(attrStr, INPUT_KW)) return true;

    // FIX v3.3.3: label 含"呼叫代码"等短语即命中
    const lbl = this._label(el).toLowerCase();
    if (LABEL_PHRASES.some(p => lbl.includes(p))) return true;

    return false;
  },

  scan(root) {
    root = root || document.body;
    root.querySelectorAll('select').forEach(el => this._process(el));
    ['.iti input', '.intl-tel-input input'].forEach(sel => {
      root.querySelectorAll(sel).forEach(el => this._process(el));
    });
    root.querySelectorAll('input[type="tel"],input[type="text"],input:not([type])').forEach(el => this._process(el));
  },

  _process(el) {
    if (this._done.has(el)) return;
    if (this._own(el)) return;
    if (el.disabled || el.readOnly) return;

    let kind = null;
    if (this._isIti(el))         kind = 'iti';
    else if (this._isSelect(el)) kind = 'select';
    else if (this._isInput(el))  kind = 'input';

    if (kind) {
      this._done.add(el);
      UI.attach(el, kind);
    }
  },
};

// ════════════════════════════════════════════════════════
// FILL
// ════════════════════════════════════════════════════════
const Fill = {
  _dispatch(el) {
    try {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
      if (setter && el.tagName === 'INPUT') setter.set.call(el, el.value);
    } catch {}
    ['input','change','blur'].forEach(t => el.dispatchEvent(new Event(t, { bubbles: true })));
  },

  fillIti(el, country) {
    const iso = country.iso.toLowerCase();

    try {
      const globalIti = window.intlTelInput || window.intlTelInputGlobals;
      if (globalIti && typeof globalIti.getInstance === 'function') {
        const inst = globalIti.getInstance(el);
        if (inst && typeof inst.setCountry === 'function') { inst.setCountry(iso); return true; }
      }
    } catch {}

    try {
      if (el.iti && typeof el.iti.setCountry === 'function') { el.iti.setCountry(iso); return true; }
    } catch {}

    try {
      const id = el.dataset.intlTelInputId;
      if (id) {
        const globalIti = window.intlTelInput || window.intlTelInputGlobals;
        const inst = globalIti && globalIti.instances && globalIti.instances[id];
        if (inst && typeof inst.setCountry === 'function') { inst.setCountry(iso); return true; }
      }
    } catch {}

    try {
      const $ = window.jQuery || window.$;
      if ($) {
        if (typeof $(el).intlTelInput === 'function') {
          try { $(el).intlTelInput('setCountry', iso); return true; } catch {}
          try { $(el).intlTelInput('setCountry', iso.toUpperCase()); return true; } catch {}
        }
        const inst = $(el).data('plugin_intlTelInput') || $(el).data('intlTelInput');
        if (inst && typeof inst.setCountry === 'function') { inst.setCountry(iso); return true; }
      }
    } catch {}

    try {
      const wrapper = el.closest('.iti') || el.closest('.intl-tel-input');
      if (wrapper) {
        const btn = wrapper.querySelector('.iti__selected-country, .iti__flag-container, .selected-flag');
        if (btn) btn.click();
        const clickItem = () => {
          const item = wrapper.querySelector(
            `[data-country-code="${iso}"], [data-dial-code="${country.code.replace('+','')}"]`
          ) || document.querySelector(
            `.iti__country[data-country-code="${iso}"], .country[data-country-code="${iso}"]`
          );
          if (item) { item.click(); return true; }
          return false;
        };
        if (clickItem()) return true;
        setTimeout(() => { if (!clickItem()) { el.value = country.code; this._dispatch(el); } }, 120);
        return true;
      }
    } catch {}

    el.value = country.code;
    this._dispatch(el);
    return true;
  },

  fillSelect(el, country) {
    const opts   = Array.from(el.options);
    const digits = country.code.replace(/\D/g, '');
    const iso    = country.iso.toLowerCase();

    let m = opts.find(o => {
      const v = o.value.trim();
      return v === country.code || v === digits || v === '00' + digits || v.toLowerCase() === iso;
    });
    if (!m) m = opts.find(o =>
      (o.getAttribute('data-country-code') || '').toLowerCase() === iso ||
      (o.getAttribute('data-iso') || '').toLowerCase() === iso
    );
    if (!m) m = opts.find(o =>
      o.text.includes(country.code) ||
      o.text.toLowerCase().includes(country.countryEn.toLowerCase()) ||
      o.text.includes(country.country)
    );
    if (m) { el.value = m.value; this._dispatch(el); return true; }
    return false;
  },

  fillInput(el, country) {
    const ph  = (el.placeholder || '').trim();
    let fmt = 'plus';
    if (/^00\d/.test(ph))  fmt = 'double0';
    else if (/^\d/.test(ph)) fmt = 'digits';
    const digits    = country.code.replace(/\D/g, '');
    const formatted = fmt === 'double0' ? '00' + digits : fmt === 'digits' ? digits : country.code;
    const rest = (el.value || '').replace(/^(\+|00)?\d{1,4}\s*/, '').trim();
    el.value = formatted + (rest ? ' ' + rest : '');
    this._dispatch(el);
    return true;
  },

  run(el, kind, country) {
    let ok = false;
    if (kind === 'iti')         ok = this.fillIti(el, country);
    else if (kind === 'select') ok = this.fillSelect(el, country);
    else                        ok = this.fillInput(el, country);
    if (ok) UI.toast(t('ok') + ': ' + country.flag + ' ' + country.code);
    else {
      try { navigator.clipboard.writeText(country.code); } catch {}
      UI.toast(t('copied') + ': ' + country.code);
    }
  },
};

// ════════════════════════════════════════════════════════
// UI
// ════════════════════════════════════════════════════════
const UI = {
  _root: null, _popup: null, _target: null, _kind: null,
  _toastTimer: null,

  css() {
    if (document.getElementById('cch-style')) return;
    const s = document.createElement('style');
    s.id = 'cch-style';
    s.textContent = `
.${WRAPPER_CLASS}{position:relative;display:inline-block;width:100%}
.cch-btn{position:absolute;top:-12px;right:-12px;transform:none;
width:24px;height:24px;border-radius:50%;background:rgba(255,255,255,.96);
border:1px solid rgba(15,23,42,.16);cursor:pointer;display:flex;
align-items:center;justify-content:center;font-size:13px;z-index:10000;
box-shadow:0 8px 18px rgba(2,8,23,.18);transition:transform .12s ease,box-shadow .12s ease;
user-select:none;line-height:1;padding:0}
.cch-btn:hover{transform:scale(1.06);box-shadow:0 10px 20px rgba(2,8,23,.22)}
#${OWN_ROOT_ID}{z-index:2147483647;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
#cch-pop{--cch-surface:rgba(255,255,255,.78);--cch-surface-strong:rgba(255,255,255,.92);
--cch-border:rgba(15,23,42,.12);--cch-text:#0f172a;--cch-subtext:#475569;--cch-accent:#0f766e;
background:var(--cch-surface);border:1px solid var(--cch-border);border-radius:16px;
box-shadow:0 18px 48px rgba(2,8,23,.16);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);
width:320px;max-height:min(78vh,460px);display:flex;flex-direction:column;overflow:hidden;
animation:cchIn .12s ease}
@keyframes cchIn{from{opacity:0;transform:translateY(4px) scale(.985)}to{opacity:1;transform:translateY(0) scale(1)}}
#cch-sw{padding:12px 12px 10px;border-bottom:1px solid rgba(15,23,42,.08);background:var(--cch-surface-strong)}
#cch-si{width:100%;box-sizing:border-box;padding:9px 12px;border:1px solid rgba(15,23,42,.12);
background:rgba(255,255,255,.88);color:var(--cch-text);border-radius:10px;font-size:13px;outline:none}
#cch-si:focus{border-color:rgba(15,118,110,.45);box-shadow:0 0 0 3px rgba(15,118,110,.12)}
.cch-body{display:flex;flex-direction:column;gap:8px;padding:8px 8px 10px;overflow-y:auto;flex:1}
.cch-sec{border:1px solid rgba(15,23,42,.08);background:rgba(255,255,255,.66);border-radius:12px;overflow:hidden}
.cch-sec-hd{padding:7px 10px;font-size:11px;font-weight:700;letter-spacing:.02em;color:var(--cch-subtext);
text-transform:uppercase;background:rgba(255,255,255,.52);border-bottom:1px solid rgba(15,23,42,.06)}
.cch-list{overflow-y:auto;max-height:180px}
.cch-row{display:flex;align-items:center;padding:8px 10px;cursor:pointer;
gap:8px;border-bottom:1px solid rgba(15,23,42,.06);transition:background .12s ease,transform .08s ease}
.cch-row:last-child{border-bottom:none}
.cch-row:hover{background:rgba(15,118,110,.08)}
.cch-fl{font-size:17px;flex-shrink:0;width:24px;text-align:center}
.cch-cd{font-weight:600;font-size:13px;color:var(--cch-accent);min-width:44px}
.cch-nm{font-size:12px;color:var(--cch-subtext);flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cch-fav{background:none;border:none;cursor:pointer;font-size:15px;color:#b8c1cc;
padding:2px 4px;border-radius:4px;flex-shrink:0;transition:color .1s}
.cch-fav.on,.cch-fav:hover{color:#f59e0b}
.cch-empty{padding:14px 10px;text-align:center;color:#8a95a3;font-size:12px}
#cch-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
background:#01696f;color:#fff;padding:8px 20px;border-radius:20px;
font-size:13px;z-index:2147483647;pointer-events:none;opacity:0;
transition:opacity .2s;white-space:nowrap}
#cch-toast.on{opacity:1}`;
    document.head.appendChild(s);
  },

  toast(msg) {
    let el = document.getElementById('cch-toast');
    if (!el) { el = document.createElement('div'); el.id = 'cch-toast'; document.body.appendChild(el); }
    el.textContent = msg;
    el.classList.add('on');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => el.classList.remove('on'), 2000);
  },

  attach(el, kind) {
    if (el.closest('.' + WRAPPER_CLASS)) return;

    const wrap = document.createElement('div');
    wrap.className = WRAPPER_CLASS;
    const cs = getComputedStyle(el);
    wrap.style.display = cs.display === 'inline' ? 'inline-block' : cs.display;

    // 仅宽度可测时设显式宽，否则继承父容器
    if (el.offsetWidth > 0) {
      wrap.style.width = el.offsetWidth + 'px';
    }

    // 不论宽度是否为 0，都立即插入
    el.parentNode.insertBefore(wrap, el);
    wrap.appendChild(el);

    const btn = document.createElement('button');
    btn.className = 'cch-btn';
    btn.type = 'button';
    btn.title = 'Country Code Helper';
    btn.setAttribute('aria-label', 'Country Code Helper');
    btn.textContent = '🌐';
    btn.addEventListener('click', e => {
      e.stopPropagation();
      e.preventDefault();
      this.open(el, kind, btn);
    });
    wrap.appendChild(btn);
  },

  open(target, kind, anchor) {
    this._target = target;
    this._kind   = kind;
    if (!this._root) {
      this._root = document.createElement('div');
      this._root.id = OWN_ROOT_ID;
      document.body.appendChild(this._root);
    }
    if (this._popup) this._popup.remove();

    const pop = document.createElement('div');
    pop.id = 'cch-pop';
    this._popup = pop;

    const sw = document.createElement('div'); sw.id = 'cch-sw';
    const si = document.createElement('input');
    si.type = 'text'; si.id = 'cch-si';
    si.placeholder = t('search');
    si.setAttribute('autocomplete', 'off');
    sw.appendChild(si); pop.appendChild(sw);

    const body = document.createElement('div');
    body.className = 'cch-body';

    const favSec = document.createElement('section');
    favSec.className = 'cch-sec cch-sec-favs';
    const favHd = document.createElement('div');
    favHd.className = 'cch-sec-hd';
    favHd.textContent = t('favs');
    const favList = document.createElement('div');
    favList.className = 'cch-list';
    favList.setAttribute('data-sec', 'favs');
    favSec.appendChild(favHd);
    favSec.appendChild(favList);

    const allSec = document.createElement('section');
    allSec.className = 'cch-sec cch-sec-all';
    const allHd = document.createElement('div');
    allHd.className = 'cch-sec-hd';
    allHd.textContent = t('all');
    const allList = document.createElement('div');
    allList.className = 'cch-list';
    allList.setAttribute('data-sec', 'all');
    allSec.appendChild(allHd);
    allSec.appendChild(allList);

    body.appendChild(favSec);
    body.appendChild(allSec);
    pop.appendChild(body);

    si.addEventListener('input', () => this._render(si.value));
    this._render('');
    document.body.appendChild(pop);
    this._pos(pop, anchor);

    const close = e => {
      if (!pop.contains(e.target) && e.target !== anchor) {
        pop.remove(); this._popup = null;
        document.removeEventListener('mousedown', close);
      }
    };
    setTimeout(() => document.addEventListener('mousedown', close), 0);
    si.focus();
  },

  _pos(pop, anchor) {
    const r = anchor.getBoundingClientRect();
    const pw = pop.offsetWidth || 320;
    const ph = pop.offsetHeight || 440;
    const m = 8;
    let l = r.left;
    let tp = r.bottom + 8;
    if (l + pw > innerWidth - m) l = Math.max(m, innerWidth - pw - m);
    if (tp + ph > innerHeight - m) tp = Math.max(m, r.top - ph - 8);
    pop.style.cssText += `;left:${l}px;top:${tp}px;position:fixed`;
  },

  _match(c, query) {
    return c.country.includes(query) ||
      c.countryEn.toLowerCase().includes(query) ||
      c.code.includes(query) ||
      c.iso.toLowerCase().includes(query);
  },

  _renderRows(list, data) {
    list.innerHTML = '';
    if (!data.length) {
      list.innerHTML = `<div class="cch-empty">${t('none')}</div>`;
      return;
    }
    const frag = document.createDocumentFragment();
    data.forEach(c => {
      const row = document.createElement('div'); row.className = 'cch-row';
      const fav = Store.isFav(c.code, c.iso);
      row.innerHTML = `
<span class="cch-fl">${c.flag}</span>
<span class="cch-cd">${c.code}</span>
<span class="cch-nm">${c.country} ${c.countryEn}</span>
<button type="button" class="cch-fav${fav ? ' on' : ''}" data-code="${c.code}" data-iso="${c.iso}" title="${fav ? t('rmFav') : t('addFav')}">${fav ? '★' : '☆'}</button>`;
      row.addEventListener('click', e => {
        if (e.target.closest('.cch-fav')) return;
        Fill.run(this._target, this._kind, c);
        this._popup && this._popup.remove(); this._popup = null;
      });
      row.querySelector('.cch-fav').addEventListener('click', e => {
        e.stopPropagation();
        const btn = e.currentTarget;
        const entry = ISO2_MAP[btn.dataset.iso.toLowerCase()] || c;
        if (Store.isFav(btn.dataset.code, btn.dataset.iso)) {
          Store.rmFav(btn.dataset.code, btn.dataset.iso);
        } else {
          Store.addFav(entry);
        }
        const q = this._popup ? this._popup.querySelector('#cch-si').value : '';
        this._render(q);
      });
      frag.appendChild(row);
    });
    list.appendChild(frag);
  },

  _render(q) {
    if (!this._popup) return;
    const favList = this._popup.querySelector('.cch-list[data-sec="favs"]');
    const allList = this._popup.querySelector('.cch-list[data-sec="all"]');
    if (!favList || !allList) return;
    const query = q.toLowerCase().trim();
    let favData = Store.getFavs();
    let allData = COUNTRIES;
    if (query) {
      favData = favData.filter(c => this._match(c, query));
      allData = allData.filter(c => this._match(c, query));
    }
    this._renderRows(favList, favData);
    this._renderRows(allList, allData);
  },
};

// ════════════════════════════════════════════════════════
// OBSERVER & INIT
// ════════════════════════════════════════════════════════
function observe() {
  let tid = null;
  new MutationObserver(() => {
    clearTimeout(tid);
    tid = setTimeout(() => Detect.scan(document.body), 350);
  }).observe(document.body, { childList: true, subtree: true });
}

function init() {
  UI.css();
  Detect.scan(document.body);
  let n = 0;
  const poll = setInterval(() => {
    Detect.scan(document.body);
    if (++n >= 8) clearInterval(poll);
  }, 500);
  observe();
}

document.readyState === 'loading'
  ? document.addEventListener('DOMContentLoaded', init)
  : init();

})();
