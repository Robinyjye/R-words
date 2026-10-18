import { WordState } from './word';

// Built-in high frequency antonym pairs
const BUILTIN_ANTONYM_PAIRS: [string, string][] = [
  ['good', 'bad'],
  ['accept', 'reject'],
  ['agree', 'disagree'],
  ['increase', 'decrease'],
  ['ascend', 'descend'],
  ['advance', 'retreat'],
  ['optimistic', 'pessimistic'],
  ['active', 'passive'],
  ['public', 'private'],
  ['include', 'exclude'],
  ['ancient', 'modern'],
  ['simple', 'complex'],
  ['admit', 'deny'],
  ['permanent', 'temporary'],
  ['foreign', 'domestic'],
  ['success', 'failure'],
  ['major', 'minor'],
  ['normal', 'abnormal'],
  ['legal', 'illegal'],
  ['moral', 'immoral'],
  ['rational', 'irrational'],
  ['visible', 'invisible'],
  ['equal', 'unequal'],
  ['equality', 'inequality'],
  ['egalitarian', 'elitist'],
  ['egalitarian', 'hierarchical'],
  ['superior', 'inferior'],
  ['abstract', 'concrete'],
  ['abundant', 'scarce'],
  ['rigid', 'flexible'],
  ['transparent', 'opaque'],
  ['mandatory', 'optional'],
  ['explicit', 'implicit'],
  ['voluntary', 'involuntary'],
  ['permanent', 'transient'],
  ['synthetic', 'natural'],
  ['vertical', 'horizontal'],
  ['urban', 'rural'],
  ['literal', 'figurative'],
  ['dynamic', 'static'],
  ['convergent', 'divergent'],
  ['homogenous', 'heterogeneous'],
  ['objective', 'subjective'],
  ['defend', 'attack'],
  ['praise', 'criticize'],
  ['calm', 'anxious'],
  ['cautious', 'reckless'],
  ['polite', 'rude'],
  ['brave', 'cowardly'],
  ['generous', 'selfish'],
  ['proud', 'humble'],
  ['broad', 'narrow'],
  ['deep', 'shallow'],
  ['bright', 'dim'],
  ['smooth', 'rough'],
  ['sharp', 'dull'],
  ['empty', 'full'],
  ['loose', 'tight'],
  ['true', 'false'],
  ['strong', 'weak'],
  ['heavy', 'light'],
  ['early', 'late'],
  ['fast', 'slow'],
  ['hard', 'soft'],
  ['hot', 'cold'],
  ['clean', 'dirty'],
  ['cheap', 'expensive'],
  ['rich', 'poor'],
  ['happy', 'sad'],
  ['beautiful', 'ugly'],
  ['healthy', 'sick'],
  ['clever', 'foolish'],
  ['innocent', 'guilty'],
  ['victory', 'defeat'],
  ['peace', 'war'],
  ['love', 'hate'],
  ['friend', 'enemy'],
  ['question', 'answer'],
  ['problem', 'solution'],
  ['cause', 'effect'],
  ['theory', 'practice'],
  ['input', 'output'],
  ['import', 'export'],
  ['expand', 'contract'],
  ['construct', 'destruct'],
  ['encourage', 'discourage'],
  ['allow', 'forbid'],
  ['permit', 'prohibit'],
  ['create', 'destroy'],
  ['strengthen', 'weaken'],
  ['combine', 'separate'],
  ['attach', 'detach'],
  ['connect', 'disconnect'],
  ['confirm', 'refute'],
  ['confirm', 'deny'],
  ['validate', 'invalidate'],
  ['approve', 'disapprove'],
  ['reward', 'punish'],
  ['protect', 'harm'],
  ['benefit', 'detriment'],
  ['advantage', 'disadvantage'],
  ['rebuttal', 'concession'],
  ['rebuttal', 'confirmation'],
  ['rebuttal', 'endorsement'],
  ['refutation', 'confirmation'],
  ['refutation', 'proof'],
  ['similar', 'dissimilar'],
  ['similarity', 'difference'],
  ['similarity', 'disparity'],
  ['disparities', 'similarities'],
  ['disparity', 'equality'],
  ['disparity', 'similarity'],
  ['parity', 'disparity'],
  ['order', 'disorder'],
  ['patient', 'impatient'],
  ['honest', 'dishonest'],
  ['responsible', 'irresponsible'],
  ['stable', 'unstable'],
  ['symmetry', 'asymmetry'],
  ['lock', 'unlock'],
  ['safe', 'dangerous'],
  ['generous', 'stingy'],
  ['innocent', 'culpable'],
  ['guilty', 'innocent'],
  ['frequent', 'rare'],
  ['positive', 'negative'],
  ['maximum', 'minimum'],
  ['optimum', 'worst'],
  ['unity', 'division'],
  ['harmony', 'discord'],
  ['freedom', 'slavery'],
  ['liberty', 'tyranny'],
  ['peaceful', 'hostile'],
  ['friendly', 'hostile']
];

// Built-in high frequency synonym groups
const BUILTIN_SYNONYM_GROUPS: string[][] = [
  ['fair', 'equal', 'equitable', 'impartial', 'unbiased', 'just', 'objective', 'egalitarian'],
  ['rebuttal', 'refutation', 'counterargument', 'disproof', 'rebut', 'counter', 'denial'],
  ['refute', 'rebut', 'disprove', 'contradict', 'contest', 'dispute', 'debunk', 'confute'],
  ['disparity', 'difference', 'discrepancy', 'inequality', 'imbalance', 'variance', 'divergence'],
  ['disparities', 'differences', 'discrepancies', 'inequalities', 'imbalances'],
  ['huge', 'enormous', 'gigantic', 'immense', 'vast', 'colossal', 'massive', 'tremendous'],
  ['small', 'tiny', 'minute', 'miniature', 'petty', 'compact', 'little', 'diminutive'],
  ['happy', 'glad', 'cheerful', 'joyful', 'delighted', 'content', 'pleased', 'ecstatic', 'elated'],
  ['sad', 'sorrowful', 'dejected', 'depressed', 'miserable', 'gloomy', 'mournful', 'melancholy'],
  ['smart', 'intelligent', 'clever', 'bright', 'brilliant', 'wise', 'sharp', 'astute', 'shrewd'],
  ['brave', 'courageous', 'bold', 'fearless', 'daring', 'valiant', 'heroic', 'dauntless'],
  ['strange', 'weird', 'odd', 'bizarre', 'peculiar', 'unusual', 'abnormal', 'eccentric'],
  ['calm', 'peaceful', 'serene', 'tranquil', 'quiet', 'placid', 'composed'],
  ['fast', 'quick', 'rapid', 'swift', 'speedy', 'brisk', 'prompt', 'fleet'],
  ['hard', 'difficult', 'tough', 'arduous', 'strenuous', 'challenging', 'laborious'],
  ['simple', 'easy', 'effortless', 'plain', 'straightforward', 'uncomplicated'],
  ['begin', 'start', 'commence', 'initiate', 'launch', 'embark', 'originate'],
  ['end', 'finish', 'conclude', 'terminate', 'cease', 'halt', 'finalize'],
  ['help', 'assist', 'aid', 'support', 'facilitate', 'succor', 'serve'],
  ['hurt', 'harm', 'injure', 'damage', 'impair', 'wound', 'spoil'],
  ['show', 'display', 'exhibit', 'reveal', 'demonstrate', 'indicate', 'manifest', 'disclose'],
  ['hide', 'conceal', 'mask', 'obscure', 'cover', 'veil', 'disguise', 'cloak'],
  ['improve', 'enhance', 'boost', 'elevate', 'upgrade', 'refine', 'ameliorate'],
  ['worsen', 'deteriorate', 'decline', 'degrade', 'degenerate', 'decay'],
  ['rich', 'wealthy', 'affluent', 'prosperous', 'opulent', 'well-off'],
  ['poor', 'impoverished', 'destitute', 'needy', 'penniless', 'indigent'],
  ['praise', 'laud', 'commend', 'acclaim', 'extol', 'applaud', 'eulogize'],
  ['blame', 'criticize', 'condemn', 'censure', 'reproach', 'rebuke', 'denounce'],
  ['destroy', 'demolish', 'ruin', 'wreck', 'devastate', 'eradicate', 'obliterate'],
  ['build', 'construct', 'erect', 'assemble', 'fabricate', 'establish', 'create'],
  ['stop', 'prevent', 'hinder', 'hamper', 'impede', 'inhibit', 'thwart'],
  ['clear', 'lucid', 'transparent', 'distinct', 'apparent', 'evident', 'obvious'],
  ['vague', 'ambiguous', 'obscure', 'unclear', 'indistinct', 'nebulous', 'hazy'],
  ['important', 'significant', 'crucial', 'vital', 'essential', 'critical', 'pivotal'],
  ['trivial', 'insignificant', 'minor', 'negligible', 'petty', 'frivolous'],
  ['rich', 'wealthy', 'affluent', 'prosperous'],
  ['stubborn', 'obstinate', 'tenacious', 'persistent', 'unyielding', 'intractable'],
  ['hesitant', 'reluctant', 'indecisive', 'doubtful', 'vacillating', 'tentative'],
  ['abundant', 'plentiful', 'ample', 'copious', 'profuse', 'lavish'],
  ['scarce', 'rare', 'sparse', 'meager', 'scant', 'deficient'],
  ['accurate', 'precise', 'exact', 'correct', 'faultless', 'flawless'],
  ['doubt', 'suspect', 'question', 'distrust', 'mistrust', 'discredit'],
  ['believe', 'trust', 'credit', 'accept', 'rely', 'confide']
];

// Negative prefixes for antonym derivation
const NEGATIVE_PREFIXES = ['un', 'in', 'im', 'il', 'ir', 'dis', 'non', 'anti', 'a', 'mis', 'mal', 'counter'];

// In-memory cache for API results
const datamuseCache = new Map<string, { syn: Set<string>; ant: Set<string> }>();

// Load / persist API cache
function getStoredCache(word: string): { syn: Set<string>; ant: Set<string> } | null {
  const key = word.toLowerCase();
  if (datamuseCache.has(key)) {
    return datamuseCache.get(key)!;
  }
  try {
    const raw = localStorage.getItem(`synant_cache_${key}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      const data = {
        syn: new Set<string>(parsed.syn || []),
        ant: new Set<string>(parsed.ant || [])
      };
      datamuseCache.set(key, data);
      return data;
    }
  } catch (e) {
    // ignore
  }
  return null;
}

function storeCache(word: string, data: { syn: Set<string>; ant: Set<string> }) {
  const key = word.toLowerCase();
  datamuseCache.set(key, data);
  try {
    localStorage.setItem(
      `synant_cache_${key}`,
      JSON.stringify({
        syn: Array.from(data.syn),
        ant: Array.from(data.ant)
      })
    );
  } catch (e) {
    // ignore
  }
}

/**
 * Fetch synonyms and antonyms from Datamuse API asynchronously
 */
export async function fetchDatamuseSynAnt(word: string): Promise<{ syn: Set<string>; ant: Set<string> }> {
  const cleanWord = word.trim().toLowerCase();
  if (!cleanWord) return { syn: new Set(), ant: new Set() };

  const cached = getStoredCache(cleanWord);
  if (cached) return cached;

  const synSet = new Set<string>();
  const antSet = new Set<string>();

  try {
    const [synRes, antRes] = await Promise.all([
      fetch(`https://api.datamuse.com/words?rel_syn=${encodeURIComponent(cleanWord)}&max=25`).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch(`https://api.datamuse.com/words?rel_ant=${encodeURIComponent(cleanWord)}&max=25`).then(r => r.ok ? r.json() : []).catch(() => [])
    ]);

    if (Array.isArray(synRes)) {
      for (const item of synRes) {
        if (item.word) synSet.add(item.word.toLowerCase());
      }
    }
    if (Array.isArray(antRes)) {
      for (const item of antRes) {
        if (item.word) antSet.add(item.word.toLowerCase());
      }
    }
  } catch (err) {
    console.warn('Failed to fetch from Datamuse', err);
  }

  const result = { syn: synSet, ant: antSet };
  storeCache(cleanWord, result);
  return result;
}

/**
 * Clean and normalize words for comparison (remove punctuation, lowercased, lemmatized approximation)
 */
export function normalizeWord(w: string): string {
  return w.trim().toLowerCase().replace(/[^a-z]/g, '');
}

/**
 * Check if wordA and wordB have prefix opposition (e.g., equal vs unequal)
 */
function checkPrefixOpposition(wordA: string, wordB: string): boolean {
  const a = normalizeWord(wordA);
  const b = normalizeWord(wordB);
  if (a === b || !a || !b) return false;

  for (const prefix of NEGATIVE_PREFIXES) {
    if (a.startsWith(prefix) && a.slice(prefix.length) === b) {
      return true;
    }
    if (b.startsWith(prefix) && b.slice(prefix.length) === a) {
      return true;
    }
  }
  return false;
}

/**
 * Common Chinese noise particles, linking verbs, and generic descriptors that shouldn't match as standalone keywords
 */
const CHINESE_STOP_WORDS = new Set([
  '的', '地', '得', '了', '着', '过', '之', '与', '和', '或', '及',
  '在', '于', '中', '上', '下', '为', '以', '使', '被', '把', '向',
  '从', '由', '到', '等', '某', '人', '物', '事', '性', '度', '感',
  '化', '者', '员', '时', '后', '前', '内', '外', '所', '进行', '成为',
  '变得', '产生', '具有', '表示', '关于', '对于', '用来', '属于', '极其', '非常',
  '引起', '造成', '导致', '发生', '从事', '作为', '带有', '充满', '出现', '存在',
  '包含', '一种', '事物', '状态', '情况', '方式', '方法', '部分', '某物', '某人',
  '长期', '短期', '大量', '许多', '十分', '特别', '通常', '一般', '有', '无'
]);

/**
 * Clean a Chinese keyword segment: strips trailing particles (的/地), removes POS prefixes, trims
 */
export function cleanChineseKeyword(raw: string): string {
  let s = raw.trim();
  // Strip POS like "adj.", "n.", "v.", "vt.", "vi.", "adv.", "[名]", "[动]", "[形]", etc.
  s = s.replace(/^(\[[^\]]+\]|[a-zA-Z]{1,4}\.\s*)+/i, '').trim();
  // Strip parentheses content like (尤指...), (正式)
  s = s.replace(/\([^)]*\)|（[^）]*）|\[[^\]]*\]/g, '').trim();
  // Strip trailing 的 / 地 / 得
  s = s.replace(/[的地得]+$/, '').trim();
  return s;
}

/**
 * Fast LRU/Map cache for extracted Chinese keywords to avoid re-parsing meanings
 */
const KEYWORD_CACHE = new Map<string, string[]>();

/**
 * Extract clean, normalized Chinese keywords from a definition
 */
export function extractChineseKeywords(meaning?: string): string[] {
  if (!meaning) return [];
  const cached = KEYWORD_CACHE.get(meaning);
  if (cached) return cached;

  // Split on delimiters
  const rawSegments = meaning.split(/[,，;；/、\s\n[\]()（）·+~]+/);
  const keywordsSet = new Set<string>();

  for (const seg of rawSegments) {
    const clean = cleanChineseKeyword(seg);
    if (clean.length >= 2 && clean.length <= 6 && !CHINESE_STOP_WORDS.has(clean)) {
      keywordsSet.add(clean);
    }
  }

  const result = Array.from(keywordsSet);
  if (KEYWORD_CACHE.size > 2000) {
    KEYWORD_CACHE.clear();
  }
  KEYWORD_CACHE.set(meaning, result);
  return result;
}

/**
 * High-precision, strictly vetted Chinese Synonym Clusters (高精度同义语义组)
 * Only genuinely interchangeable concepts are grouped together.
 */
export const CHINESE_SYNONYM_CLUSTERS: string[][] = [
  // 0: 差异 / 差别 / 不同 / 分歧
  ['差异', '差别', '不同', '区别', '分歧', '相异', '不一致', '差距', '悬殊', '落差', '鸿沟'],
  // 1: 平等 / 公平 / 相同 / 一致
  ['平等', '公平', '公正', '均等', '对等', '相同', '同样', '一致', '雷同', '相符', '同等'],
  // 2: 反驳 / 驳斥 / 否定 / 辩驳
  ['反驳', '驳斥', '辩驳', '否认', '推翻', '批驳', '否决', '驳回', '反证'],
  // 3: 证实 / 证明 / 支持 / 确证
  ['证实', '证明', '确证', '验证', '确认', '核实', '印证', '佐证', '查实'],
  // 4: 拘谨 / 端庄 / 庄重 / 严肃
  ['拘谨', '端庄', '庄重', '娴静', '规矩', '端正', '严肃', '谨小慎微', '正经', '拘束', '严谨', '矜持'],
  // 5: 轻浮 / 随意 / 放肆 / 放荡
  ['轻浮', '轻率', '放肆', '放荡', '轻佻', '不羁', '散漫', '轻慢'],
  // 6: 傲慢 / 自大 / 狂妄 / 自负
  ['傲慢', '自大', '狂妄', '自负', '高傲', '骄傲', '目中无人', '狂傲'],
  // 7: 谦逊 / 谦虚 / 低调
  ['谦逊', '谦虚', '虚心', '低调', '谦恭', '谦和'],
  // 8: 增加 / 扩大 / 提升 / 增长
  ['增加', '扩大', '增长', '增大', '上升', '提升', '提高', '扩展', '扩张', '增强', '增多', '扩充', '扩增', '激增', '上涨', '放大'],
  // 9: 减少 / 缩减 / 降低 / 缩小
  ['减少', '缩小', '缩减', '降低', '下降', '削减', '减小', '减轻', '减弱', '减低', '萎缩', '下滑', '衰退', '跌落', '减退', '紧缩'],
  // 10: 破坏 / 毁坏 / 摧毁 / 毁灭
  ['破坏', '毁坏', '摧毁', '毁灭', '损坏', '损伤', '瓦解', '拆毁', '粉碎', '倾覆'],
  // 11: 建造 / 创造 / 建立 / 设立
  ['建造', '创造', '建立', '建设', '构建', '创立', '设立', '创建', '组装', '打造', '构筑'],
  // 12: 保护 / 维护 / 保卫 / 防御
  ['保护', '维护', '保卫', '守护', '庇护', '防御', '防护', '捍卫', '保障'],
  // 13: 伤害 / 损害 / 危害 / 侵害
  ['伤害', '损害', '危害', '侵害', '侵犯', '攻击', '创伤', '侵袭', '毁损'],
  // 14: 允许 / 批准 / 许可 / 同意
  ['允许', '批准', '许可', '准许', '赞成', '同意', '认可', '准予', '接纳', '授权'],
  // 15: 禁止 / 阻止 / 取缔 / 阻碍
  ['禁止', '阻止', '取缔', '妨碍', '阻挠', '阻碍', '制止', '遏制', '阻挡', '查禁', '压制', '禁绝'],
  // 16: 调查 / 研究 / 探究 / 审查
  ['调查', '研究', '考察', '探究', '探讨', '勘查', '审查', '检测', '探查', '侦查', '剖析'],
  // 17: 显示 / 表明 / 揭示 / 展示
  ['显示', '表明', '展示', '表现', '揭示', '显露', '呈现', '显现', '透露', '展现', '昭示'],
  // 18: 隐藏 / 隐瞒 / 遮掩 / 隐蔽
  ['隐藏', '隐瞒', '遮掩', '掩盖', '遮蔽', '隐蔽', '潜藏', '掩饰', '藏匿'],
  // 19: 清晰 / 清楚 / 明确 / 显著
  ['清晰', '清楚', '明确', '显然', '明白', '明晰', '一目了然', '显著', '透彻', '鲜明', '直白', '显而易见'],
  // 20: 模糊 / 含糊 / 晦涩 / 朦胧
  ['模糊', '含糊', '晦涩', '隐约', '朦胧', '暧昧', '不明', '混淆', '抽象'],
  // 21: 丰富 / 充裕 / 充足 / 富足
  ['丰富', '充裕', '充足', '富足', '富裕', '充盈', '丰盛'],
  // 22: 缺乏 / 匮乏 / 短缺 / 贫乏
  ['缺乏', '匮乏', '短缺', '贫乏', '不足', '缺少', '稀缺', '紧缺', '枯竭'],
  // 23: 困难 / 艰难 / 艰辛 / 困境
  ['困难', '艰巨', '艰难', '艰辛', '艰苦', '吃力', '不易', '困境', '棘手'],
  // 24: 容易 / 简单 / 轻松 / 便捷
  ['容易', '简单', '轻易', '轻松', '简易', '便捷', '轻而易举', '浅显'],
  // 25: 勇敢 / 果敢 / 英勇 / 无畏
  ['勇敢', '果敢', '英勇', '无畏', '大胆', '坚毅', '勇猛'],
  // 26: 怯懦 / 胆小 / 害怕 / 恐惧
  ['怯懦', '胆小', '胆怯', '畏缩', '退缩', '害怕', '恐惧', '恐慌', '畏惧', '懦弱'],
  // 27: 聪明 / 机智 / 敏锐 / 智慧
  ['聪明', '机智', '敏锐', '聪颖', '智慧', '睿智', '机敏', '灵敏', '精明'],
  // 28: 愚蠢 / 笨拙 / 呆笨 / 迟钝
  ['愚蠢', '笨拙', '愚昧', '愚钝', '呆笨', '迟钝', '糊涂'],
  // 29: 坚固 / 牢固 / 稳固 / 结实
  ['坚固', '牢固', '稳固', '结实', '坚定', '强韧', '稳定', '牢靠'],
  // 30: 脆弱 / 虚弱 / 软弱 / 易碎
  ['脆弱', '虚弱', '软弱', '单薄', '娇弱', '易碎', '动摇', '不稳'],
  // 31: 迅速 / 快速 / 敏捷 / 飞快
  ['迅速', '快速', '敏捷', '飞快', '迅捷', '急促', '即刻', '火速', '疾速', '神速'],
  // 32: 缓慢 / 迟缓 / 拖延 / 拖沓
  ['缓慢', '迟缓', '迟钝', '拖延', '拖沓', '慢速', '滞后'],
  // 33: 开始 / 发起 / 启动 / 开端
  ['开始', '发起', '启动', '开端', '着手', '创设', '起步', '开创'],
  // 34: 结束 / 终止 / 停止 / 中止
  ['结束', '终止', '停止', '中止', '完结', '终结', '告终', '截止'],
  // 35: 坚持 / 维持 / 恪守 / 保持
  ['坚持', '维持', '坚守', '恪守', '保持', '执着', '固守', '延续', '继续'],
  // 36: 放弃 / 抛弃 / 遗弃 / 舍弃
  ['放弃', '抛弃', '舍弃', '遗弃', '丢弃', '退缩'],
  // 37: 真实 / 真正 / 确实 / 确切
  ['真实', '真正', '确实', '确切', '真诚', '实在', '确凿', '属实', '客观'],
  // 38: 虚假 / 伪造 / 欺骗 / 虚伪
  ['虚假', '伪造', '假冒', '欺骗', '虚伪', '捏造', '编造', '造假'],
  // 39: 快乐 / 愉悦 / 兴奋 / 高兴
  ['快乐', '愉悦', '高兴', '欢喜', '欣喜', '开心', '兴奋', '雀跃'],
  // 40: 悲伤 / 痛苦 / 沮丧 / 哀伤
  ['悲伤', '痛苦', '沮丧', '忧伤', '哀伤', '悲痛', '难过', '郁闷', '悲观'],
  // 41: 平静 / 镇静 / 安宁 / 沉着
  ['平静', '镇静', '镇定', '沉着', '安宁', '宁静', '平和', '泰然', '冷静'],
  // 42: 慌乱 / 激动 / 焦虑 / 暴躁
  ['慌乱', '慌张', '激动', '焦虑', '惊慌', '焦躁', '暴躁', '亢奋', '不安'],
  // 43: 赞扬 / 称赞 / 赞美 / 歌颂
  ['赞扬', '称赞', '赞美', '歌颂', '夸奖', '褒奖', '表彰', '钦佩'],
  // 44: 批评 / 指责 / 谴责 / 责备
  ['批评', '指责', '谴责', '责备', '斥责', '批驳', '苛责', '训斥'],
  // 45: 重要 / 关键 / 核心 / 重大
  ['重要', '关键', '核心', '重大', '主要', '要害', '首要', '根本', '至关重要'],
  // 46: 次要 / 微小 / 琐碎 / 轻微
  ['次要', '微小', '琐碎', '轻微', '细微', '微不足道', '边缘'],
  // 47: 独特 / 特殊 / 罕见 / 奇特
  ['独特', '特殊', '独有', '罕见', '奇特', '稀有', '非凡'],
  // 48: 普遍 / 常见 / 普通 / 寻常
  ['普遍', '常见', '普通', '寻常', '平凡', '常规', '通用'],
  // 49: 节俭 / 节约 / 勤俭 / 吝啬
  ['节俭', '节约', '勤俭', '节省', '俭朴', '吝啬'],
  // 50: 奢侈 / 奢华 / 挥霍 / 浪费
  ['奢侈', '奢华', '挥霍', '铺张', '浪费'],
  // 51: 友好 / 和睦 / 友善 / 亲切
  ['友好', '和睦', '友善', '亲切', '亲善', '融洽'],
  // 52: 敌意 / 敌对 / 仇视 / 排斥
  ['敌意', '敌对', '仇视', '排斥', '反感', '敌视', '对抗'],
  // 53: 稳定 / 恒定 / 固定 / 不变
  ['稳定', '恒定', '固定', '不变', '持久', '平稳'],
  // 54: 动荡 / 波动 / 变动 / 变化
  ['动荡', '波动', '变动', '变化', '动摇', '反复', '摇摆'],
  // 55: 信任 / 依赖 / 坚信 / 确信
  ['信任', '依赖', '坚信', '确信', '信赖'],
  // 56: 怀疑 / 质疑 / 猜疑 / 疑惑
  ['怀疑', '质疑', '猜疑', '疑惑', '不信'],
  // 57: 严谨 / 严格 / 严厉 / 苛刻
  ['严谨', '严格', '严厉', '苛刻', '精密', '缜密', '一丝不苟'],
  // 58: 马虎 / 粗心 / 粗糙 / 草率
  ['马虎', '粗心', '粗糙', '草率', '敷衍', '轻率', '粗疏'],
  // 59: 美丽 / 漂亮 / 优美 / 迷人
  ['美丽', '漂亮', '优美', '迷人', '绚丽', '秀丽', '华美'],
  // 60: 丑陋 / 难看 / 粗鄙 / 粗陋
  ['丑陋', '难看', '粗鄙', '粗陋', '怪诞', '鄙陋'],
  // 61: 暂时 / 短暂 / 临时 / 瞬时 (精准：剔除“短浅”等歧义词)
  ['暂时', '短暂', '临时', '瞬时', '转瞬即逝', '短促'],
  // 62: 永久 / 永恒 / 长久 / 永远 (精准：剔除“长期”等高频泛词)
  ['永久', '永恒', '长久', '永远', '长存', '永存']
];

// Build inverted index for fast lookup: keyword -> cluster index
const CHINESE_KEYWORD_TO_CLUSTER = new Map<string, number>();
CHINESE_SYNONYM_CLUSTERS.forEach((cluster, idx) => {
  for (const term of cluster) {
    CHINESE_KEYWORD_TO_CLUSTER.set(term, idx);
  }
});

// Opposite pairs between cluster IDs
const CHINESE_CLUSTER_OPPOSITION_PAIRS: [number, number][] = [
  [0, 1],   // 差异 ↔ 平等/一致
  [2, 3],   // 反驳 ↔ 证实/支持
  [4, 5],   // 拘谨/端庄 ↔ 轻浮/放肆
  [6, 7],   // 傲慢 ↔ 谦逊
  [8, 9],   // 增加/扩大 ↔ 减少/缩小
  [10, 11], // 破坏 ↔ 建造
  [12, 13], // 保护 ↔ 伤害
  [14, 15], // 允许 ↔ 禁止
  [17, 18], // 显示 ↔ 隐藏
  [19, 20], // 清晰 ↔ 模糊
  [21, 22], // 丰富 ↔ 缺乏
  [23, 24], // 困难 ↔ 容易
  [25, 26], // 勇敢 ↔ 怯懦
  [27, 28], // 聪明 ↔ 愚蠢
  [29, 30], // 坚固 ↔ 脆弱
  [31, 32], // 迅速 ↔ 缓慢
  [33, 34], // 开始 ↔ 结束
  [35, 36], // 坚持 ↔ 放弃
  [37, 38], // 真实 ↔ 虚假
  [39, 40], // 快乐 ↔ 悲伤
  [41, 42], // 平静 ↔ 慌乱
  [43, 44], // 赞扬 ↔ 批评
  [45, 46], // 重要 ↔ 次要/琐碎
  [47, 48], // 独特 ↔ 普遍
  [49, 50], // 节俭 ↔ 奢侈
  [51, 52], // 友好 ↔ 敌意
  [53, 54], // 稳定 ↔ 动荡
  [55, 56], // 信任 ↔ 怀疑
  [57, 58], // 严谨 ↔ 马虎
  [59, 60], // 美丽 ↔ 丑陋
  [61, 62]  // 短暂/临时 ↔ 永恒/永久
];

// Inverted cluster antonym lookup: clusterId -> Set<oppositeClusterId>
const CHINESE_CLUSTER_OPPOSITES = new Map<number, Set<number>>();
for (const [c1, c2] of CHINESE_CLUSTER_OPPOSITION_PAIRS) {
  if (!CHINESE_CLUSTER_OPPOSITES.has(c1)) CHINESE_CLUSTER_OPPOSITES.set(c1, new Set());
  if (!CHINESE_CLUSTER_OPPOSITES.has(c2)) CHINESE_CLUSTER_OPPOSITES.set(c2, new Set());
  CHINESE_CLUSTER_OPPOSITES.get(c1)!.add(c2);
  CHINESE_CLUSTER_OPPOSITES.get(c2)!.add(c1);
}

/**
 * Check if two Chinese definitions are synonyms:
 * 1. Exact cleaned keyword match (e.g. both have "端庄", "差异", "反驳")
 * 2. Shared high-precision Semantic Cluster (e.g. "差异" and "不同", "临时" and "短暂")
 */
export function checkChineseMeaningSynonym(
  meaningA?: string,
  meaningB?: string,
  kwA?: string[],
  kwB?: string[]
): { isSyn: boolean; reason?: string } {
  const kA = kwA || extractChineseKeywords(meaningA);
  const kB = kwB || extractChineseKeywords(meaningB);
  if (kA.length === 0 || kB.length === 0) return { isSyn: false };

  // 1. Exact cleaned keyword match
  for (const a of kA) {
    if (a.length >= 2 && !CHINESE_STOP_WORDS.has(a)) {
      for (const b of kB) {
        if (a === b) {
          return { isSyn: true, reason: `释义相同: ${a}` };
        }
      }
    }
  }

  // 2. Semantic Cluster match (both belong to same curated synonym concept)
  for (const a of kA) {
    const clusterA = CHINESE_KEYWORD_TO_CLUSTER.get(a);
    if (clusterA !== undefined) {
      for (const b of kB) {
        const clusterB = CHINESE_KEYWORD_TO_CLUSTER.get(b);
        if (clusterB === clusterA) {
          return { isSyn: true, reason: `释义相近: ${a} / ${b}` };
        }
      }
    }
  }

  return { isSyn: false };
}

/**
 * Check suffix opposition (e.g. -ful vs -less)
 */
function checkSuffixOpposition(wordA: string, wordB: string): boolean {
  const a = normalizeWord(wordA);
  const b = normalizeWord(wordB);
  if (a.endsWith('ful') && b.endsWith('less') && a.slice(0, -3) === b.slice(0, -4)) return true;
  if (a.endsWith('less') && b.endsWith('ful') && a.slice(0, -4) === b.slice(0, -3)) return true;
  return false;
}

const CHINESE_ANTONYM_PAIRS: [string, string][] = [
  ['平静', '激动'], ['镇静', '慌乱'], ['严肃', '轻浮'], ['谨慎', '鲁莽'],
  ['精美', '粗糙'], ['规矩', '随意'], ['整洁', '凌乱'], ['庄重', '放肆'],
  ['庄重', '轻佻'], ['保守', '激进'], ['刻板', '灵活'], ['平等', '差异'],
  ['平等', '不公'], ['平等', '歧视'], ['证实', '反驳'], ['证实', '驳斥'],
  ['承认', '否认'], ['支持', '反对'], ['丰富', '匮乏'], ['繁华', '荒凉'],
  ['坚固', '脆弱'], ['优秀', '拙劣'], ['宽容', '苛刻'], ['诚实', '虚伪'],
  ['积极', '消极'], ['乐观', '悲观'], ['顺从', '反抗'], ['谦逊', '傲慢'],
  ['节俭', '奢侈'], ['勇敢', '怯懦'], ['善良', '邪恶'], ['聪明', '愚蠢'],
  ['增加', '减少'], ['扩大', '缩小'], ['强化', '削弱'], ['公开', '隐蔽'],
  ['清晰', '模糊'], ['稳定', '动荡'], ['持久', '短暂'], ['自由', '束缚'],
  ['抽象', '具体'], ['自然', '人工'], ['合法', '违法'], ['安全', '危险'],
  ['端庄', '放荡'], ['拘谨', '大方'], ['拘谨', '随和'], ['守旧', '前卫'],
  ['允许', '禁止'], ['真实', '虚假'], ['迅速', '缓慢'], ['建造', '破坏'],
  ['保护', '伤害'], ['信任', '怀疑'], ['节约', '浪费'], ['开始', '结束'],
  ['坚持', '放弃'], ['友好', '敌意'], ['服从', '违抗'], ['普遍', '独特']
];

// Inverted lookup map for O(1) antonym pair checks
const CHINESE_ANTONYM_MAP = new Map<string, string>();
for (const [p1, p2] of CHINESE_ANTONYM_PAIRS) {
  CHINESE_ANTONYM_MAP.set(`${p1}###${p2}`, `释义反义: ${p1} ↔ ${p2}`);
  CHINESE_ANTONYM_MAP.set(`${p2}###${p1}`, `释义反义: ${p1} ↔ ${p2}`);
}

/**
 * Check Chinese meaning for antonym markers:
 * 1. Direct high-confidence Chinese Antonym Pairs (O(1) Map lookup)
 * 2. Opposing Semantic Clusters
 * 3. Strict morphological negation (e.g. 平等 vs 不平等, 合法 vs 非法)
 */
export function checkChineseAntonymOpposition(
  meaningA?: string,
  meaningB?: string,
  kwA?: string[],
  kwB?: string[]
): { isAnt: boolean; reason?: string } {
  const kA = kwA || extractChineseKeywords(meaningA);
  const kB = kwB || extractChineseKeywords(meaningB);
  if (kA.length === 0 || kB.length === 0) return { isAnt: false };

  // 1. Direct high-confidence semantic contrast pairs via O(1) map
  for (const a of kA) {
    for (const b of kB) {
      const match = CHINESE_ANTONYM_MAP.get(`${a}###${b}`);
      if (match) {
        return { isAnt: true, reason: match };
      }
    }
  }

  // 2. Opposing Semantic Clusters
  for (const a of kA) {
    const clusterA = CHINESE_KEYWORD_TO_CLUSTER.get(a);
    if (clusterA !== undefined) {
      const opposites = CHINESE_CLUSTER_OPPOSITES.get(clusterA);
      if (opposites) {
        for (const b of kB) {
          const clusterB = CHINESE_KEYWORD_TO_CLUSTER.get(b);
          if (clusterB !== undefined && opposites.has(clusterB)) {
            return { isAnt: true, reason: `释义对立: ${a} ↔ ${b}` };
          }
        }
      }
    }
  }

  // 3. Morphological negation on exact root words
  const NEG_PREFIXES = ['不', '非', '无', '未'];
  for (const a of kA) {
    if (a.length < 2 || CHINESE_STOP_WORDS.has(a)) continue;
    for (const b of kB) {
      if (b.length < 2 || CHINESE_STOP_WORDS.has(b)) continue;
      for (const neg of NEG_PREFIXES) {
        if (a === `${neg}${b}` || b === `${neg}${a}`) {
          return { isAnt: true, reason: `否定反义: ${a} ↔ ${b}` };
        }
      }
    }
  }

  return { isAnt: false };
}

export interface ThesaurusMatchedWord extends WordState {
  matchReason?: string;
}

export interface SearchSynAntResult {
  synonyms: ThesaurusMatchedWord[];
  antonyms: ThesaurusMatchedWord[];
  totalSearched: number;
}

/**
 * Normalize Part of Speech for fair comparison
 */
function normalizePartOfSpeech(pos?: string): string {
  if (!pos) return '';
  const p = pos.trim().toLowerCase();
  if (p.startsWith('adj') || p.startsWith('a.') || p === 'a' || p.includes('形')) return 'adj';
  if (p.startsWith('adv') || p.startsWith('ad.') || p === 'ad' || p.includes('副')) return 'adv';
  if (p.startsWith('vt') || p.startsWith('vi') || p.startsWith('v.') || p === 'v' || p.includes('动')) return 'v';
  if (p.startsWith('n.') || p === 'n' || p.includes('名')) return 'n';
  return p;
}

/**
 * Main search function:
 * Searches across ALL words in the user's library (`allWords`) for synonyms and antonyms of `targetWord`.
 * Supports:
 * 1. Explicit properties on targetWord or items in allWords (synonyms / antonyms field)
 * 2. Datamuse API (cached / fetched, strict rel_syn & rel_ant)
 * 3. Built-in thesaurus pairs & groups
 * 4. Prefix opposition (un-, in-, dis- etc.)
 * 5. High-precision Chinese meaning semantic cluster matching & negation opposition with POS validation
 */
export function findSynonymsAndAntonymsInLibrary(
  targetWord: WordState,
  allWords: WordState[],
  apiData?: { syn: Set<string>; ant: Set<string> } | null
): SearchSynAntResult {
  const targetClean = normalizeWord(targetWord.word);
  if (!targetClean || allWords.length === 0) {
    return { synonyms: [], antonyms: [], totalSearched: allWords.length };
  }

  const synSet = new Set<string>();
  const antSet = new Set<string>();

  // 1. Incorporate API data if available
  if (apiData) {
    apiData.syn.forEach(w => synSet.add(normalizeWord(w)));
    apiData.ant.forEach(w => antSet.add(normalizeWord(w)));
  }

  // Also check stored cache synchronously
  const cached = getStoredCache(targetClean);
  if (cached) {
    cached.syn.forEach(w => synSet.add(normalizeWord(w)));
    cached.ant.forEach(w => antSet.add(normalizeWord(w)));
  }

  // 2. Built-in antonym pairs
  for (const [w1, w2] of BUILTIN_ANTONYM_PAIRS) {
    const n1 = normalizeWord(w1);
    const n2 = normalizeWord(w2);
    if (n1 === targetClean) antSet.add(n2);
    if (n2 === targetClean) antSet.add(n1);
  }

  // 3. Built-in synonym groups
  for (const group of BUILTIN_SYNONYM_GROUPS) {
    const normalizedGroup = group.map(w => normalizeWord(w));
    if (normalizedGroup.includes(targetClean)) {
      for (const w of normalizedGroup) {
        if (w !== targetClean) {
          synSet.add(w);
        }
      }
    }
  }

  // 4. Target word explicit fields
  const targetExplicitSyns = typeof (targetWord as any).synonyms === 'string' 
    ? ((targetWord as any).synonyms as string).split(/[,，/、\s]+/).map(normalizeWord).filter(Boolean)
    : Array.isArray((targetWord as any).synonyms) ? (targetWord as any).synonyms.map(normalizeWord) : [];
  targetExplicitSyns.forEach((w: string) => synSet.add(w));

  const targetExplicitAnts = typeof (targetWord as any).antonyms === 'string'
    ? ((targetWord as any).antonyms as string).split(/[,，/、\s]+/).map(normalizeWord).filter(Boolean)
    : Array.isArray((targetWord as any).antonyms) ? (targetWord as any).antonyms.map(normalizeWord) : [];
  targetExplicitAnts.forEach((w: string) => antSet.add(w));

  // Pre-extract target keywords once outside loop to avoid millions of regex parses
  const targetKw = extractChineseKeywords(targetWord.meaning);

  // Result collections (deduped by normalized word)
  const matchedSynonyms: ThesaurusMatchedWord[] = [];
  const matchedAntonyms: ThesaurusMatchedWord[] = [];
  const seenSyn = new Set<string>();
  const seenAnt = new Set<string>();

  const targetPosNorm = normalizePartOfSpeech(targetWord.part_of_speech);

  for (const candidate of allWords) {
    if (!candidate.word) continue;
    const candClean = normalizeWord(candidate.word);
    // Do not match the word itself
    if (candClean === targetClean) continue;

    const candPosNorm = normalizePartOfSpeech(candidate.part_of_speech);
    // Strictly require POS compatibility if both words have specified POS
    // (e.g. an adj cannot be a synonym or antonym of a verb)
    const posMatches = !targetPosNorm || !candPosNorm || targetPosNorm === candPosNorm;

    // Check candidate explicit fields
    const candExplicitSyns = typeof (candidate as any).synonyms === 'string'
      ? ((candidate as any).synonyms as string).split(/[,，/、\s]+/).map(normalizeWord).filter(Boolean)
      : Array.isArray((candidate as any).synonyms) ? (candidate as any).synonyms.map(normalizeWord) : [];
    
    const candExplicitAnts = typeof (candidate as any).antonyms === 'string'
      ? ((candidate as any).antonyms as string).split(/[,，/、\s]+/).map(normalizeWord).filter(Boolean)
      : Array.isArray((candidate as any).antonyms) ? (candidate as any).antonyms.map(normalizeWord) : [];

    // Lazy candidate Chinese keyword extraction (at most once per candidate)
    let candKw: string[] | null = null;
    const getCandKw = () => {
      if (candKw === null) {
        candKw = extractChineseKeywords(candidate.meaning);
      }
      return candKw;
    };

    // Is it an Antonym?
    let isAnt = false;
    let antReason: string | undefined;

    if (antSet.has(candClean)) {
      isAnt = true;
      antReason = '词典反义词';
    } else if (candExplicitAnts.includes(targetClean)) {
      isAnt = true;
      antReason = '用户标注反义';
    } else if (checkPrefixOpposition(targetWord.word, candidate.word)) {
      isAnt = true;
      antReason = '前缀对立反义';
    } else if (checkSuffixOpposition(targetWord.word, candidate.word)) {
      isAnt = true;
      antReason = '后缀对立反义';
    } else if (posMatches && targetKw.length > 0 && candidate.meaning) {
      // Only evaluate Chinese antonym opposition if parts of speech are compatible!
      const cKw = getCandKw();
      if (cKw.length > 0) {
        const chAntCheck = checkChineseAntonymOpposition(undefined, undefined, targetKw, cKw);
        if (chAntCheck.isAnt) {
          isAnt = true;
          antReason = chAntCheck.reason;
        }
      }
    }

    if (isAnt) {
      if (!seenAnt.has(candClean)) {
        seenAnt.add(candClean);
        matchedAntonyms.push({
          ...candidate,
          matchReason: antReason
        });
      }
      continue; // If it's an antonym, don't classify as synonym
    }

    // Is it a Synonym?
    let isSyn = false;
    let synReason: string | undefined;

    if (synSet.has(candClean)) {
      isSyn = true;
      synReason = '词典近义词';
    } else if (candExplicitSyns.includes(targetClean)) {
      isSyn = true;
      synReason = '用户标注近义';
    } else if (posMatches && targetKw.length > 0 && candidate.meaning) {
      // Check Chinese meaning similarity with strict POS compatibility
      const cKw = getCandKw();
      if (cKw.length > 0) {
        const chSynCheck = checkChineseMeaningSynonym(undefined, undefined, targetKw, cKw);
        if (chSynCheck.isSyn) {
          isSyn = true;
          synReason = chSynCheck.reason;
        }
      }
    }

    if (isSyn) {
      if (!seenSyn.has(candClean)) {
        seenSyn.add(candClean);
        matchedSynonyms.push({
          ...candidate,
          matchReason: synReason
        });
      }
    }
  }

  return {
    synonyms: matchedSynonyms,
    antonyms: matchedAntonyms,
    totalSearched: allWords.length
  };
}

export interface WordThesaurusResult {
  word: string;
  wordState: WordState;
  synonyms: WordState[];
  antonyms: WordState[];
  hasLibraryMatch: boolean;
}

export interface SynonymCluster {
  id: string;
  rootWord: string;
  words: WordState[];
}

export interface AntonymPair {
  id: string;
  wordA: WordState;
  wordB: WordState;
  reason?: string;
}

export function getWordThesaurus(targetWord: WordState, allWords: WordState[]): WordThesaurusResult {
  const result = findSynonymsAndAntonymsInLibrary(targetWord, allWords);
  return {
    word: targetWord.word,
    wordState: targetWord,
    synonyms: result.synonyms,
    antonyms: result.antonyms,
    hasLibraryMatch: result.synonyms.length > 0 || result.antonyms.length > 0
  };
}

export function findLibrarySynonymClusters(words: WordState[]): SynonymCluster[] {
  const clusters: SynonymCluster[] = [];
  const processed = new Set<string>();

  for (const w of words) {
    const key = normalizeWord(w.word);
    if (processed.has(key)) continue;

    const res = findSynonymsAndAntonymsInLibrary(w, words);
    if (res.synonyms.length > 0) {
      const clusterWords = [w, ...res.synonyms];
      clusterWords.forEach(cw => processed.add(normalizeWord(cw.word)));
      clusters.push({
        id: `cluster-${w.id}`,
        rootWord: w.word,
        words: clusterWords
      });
    }
  }
  return clusters;
}

export function findLibraryAntonymPairs(words: WordState[]): AntonymPair[] {
  const pairs: AntonymPair[] = [];
  const seenPairs = new Set<string>();

  for (const w of words) {
    const res = findSynonymsAndAntonymsInLibrary(w, words);
    for (const ant of res.antonyms) {
      const pairKey = [w.id, ant.id].sort().join(':');
      if (!seenPairs.has(pairKey)) {
        seenPairs.add(pairKey);
        pairs.push({
          id: `pair-${pairKey}`,
          wordA: w,
          wordB: ant,
          reason: '词库反义词互联'
        });
      }
    }
  }
  return pairs;
}

export async function generateThesaurusForWords(
  words: WordState[]
): Promise<Record<string, { synonyms: string[]; antonyms: string[] }>> {
  const results: Record<string, { synonyms: string[]; antonyms: string[] }> = {};
  await Promise.all(
    words.map(async (w) => {
      try {
        const data = await fetchDatamuseSynAnt(w.word);
        results[w.word] = {
          synonyms: Array.from(data.syn).slice(0, 8),
          antonyms: Array.from(data.ant).slice(0, 8)
        };
      } catch (err) {
        results[w.word] = { synonyms: [], antonyms: [] };
      }
    })
  );
  return results;
}
