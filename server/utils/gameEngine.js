// ==========================================
// 🎮 开字母 2.0 核心引擎
// ==========================================
const REGEX = {
  eng: /[a-zA-Z0-9]/g,
  kana: /[\u3040-\u309F\u30A0-\u30FF]/g,
  kanji: /[\u4E00-\u9FAF]/g,
  space: /\s/g,
  sym: /[^\sa-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g
};

const TRANS_MAP = {
  'α':'a', 'β':'b', 'γ':'g', 'δ':'d', 'ε':'e', 'ζ':'z', 'η':'h', 'θ':'th', 'ι':'i', 'κ':'k', 'λ':'l', 'μ':'m', 'ν':'n', 'ξ':'x', 'ο':'o', 'π':'p', 'ρ':'r', 'σ':'s', 'ς':'s', 'τ':'t', 'υ':'y', 'φ':'f', 'χ':'ch', 'ψ':'ps', 'ω':'o',
  'а':'a', 'б':'b', 'в':'v', 'г':'g', 'д':'d', 'е':'e', 'ё':'e', 'ж':'zh', 'з':'z', 'и':'i', 'й':'y', 'к':'k', 'л':'l', 'м':'m', 'н':'n', 'о':'o', 'п':'p', 'р':'r', 'с':'s', 'т':'t', 'у':'u', 'ф':'f', 'х':'kh', 'ц':'ts', 'ч':'ch', 'ш':'sh', 'щ':'shch', 'ъ':'', 'ы':'y', 'ь':'', 'э':'e', 'ю':'yu', 'я':'ya'
};

// 🔥 升级版：规范化字符串 (去符号、去空格、去音标注音、小写转写平替)
function normalizeTitle(str) {
  if (!str) return '';
  let res = str.toLowerCase();
  
  // 1. 去除字符上的音调注音 (比如: nέο κόsmo -> nεo κoςmo)
  res = res.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  // 2. 映射希腊字母与俄文字母到英文字母
  let mapped = "";
  for(let char of res) {
     mapped += TRANS_MAP[char] || char;
  }
  
  // 3. 仅保留字母、数字、平假名、片假名、汉字，彻底剔除所有特殊符号与空格
  return mapped.replace(/[^\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, '');
}

/**
 * 🎯 计算多语种文本熵值基础算力 (Base OV)
 */
function calculateBaseOV(title) {
  // 统计各类字符出现的集合 (Unique)
  const uniqueEng = new Set(title.match(REGEX.eng)?.map(c => c.toLowerCase()) || []);
  const uniqueKana = new Set(title.match(REGEX.kana) || []);
  const uniqueKanji = new Set(title.match(REGEX.kanji) || []);
  const uniqueSym = new Set(title.match(REGEX.sym) || []);
  
  // 统计空格数量 (Words - 1)
  const spaceCount = (title.match(REGEX.space) || []).length;
  
  // 有效长度 (不含空格)
  const length = title.replace(REGEX.space, '').length;

  // 如果连有效长度都没有，兜底 0 分
  if (length === 0) return 0;

  // 核心多语种熵值公式
  let ov = 10 
         + (length * 1.5) 
         + (uniqueEng.size * 2.5) 
         + (uniqueKana.size * 3.5) 
         + (uniqueKanji.size * 5.0) 
         + (uniqueSym.size * 2.0) 
         - (spaceCount * 2.0);

  return Math.max(ov, 5); // 绝对保底不低于 5 分
}

/**
 * 🎭 掩码生成器 (Masking Engine)
 * 作用：根据玩家已开出的字符和 Mod，将真实歌名转换为前端可见的掩码
 */
function generateMaskedTitle(title, openedChars, mods = []) {
  // 提取 Mod 效果
  const hasPerceiver = mods.includes('Perceiver'); // 空格也变掩码
  const hasPuzzle = mods.includes('Puzzle');       // 变数字 [长度]
  
  // 预处理已开出的字符，转为小写集合方便比对
  const openedSet = new Set(openedChars.map(c => c.toLowerCase()));

  if (hasPuzzle) {
    // Puzzle 模式下，直接返回未开出的字符剩余数量
    let unrevealedCount = 0;
    for (let char of title) {
      if (!hasPerceiver && char.trim() === '') continue; // 不算空格
      if (!openedSet.has(char.toLowerCase())) unrevealedCount++;
    }
    return `[${unrevealedCount}]`;
  }

  // 常规/Perceiver 模式生成掩码
  let masked = '';
  for (let char of title) {
    const isSpace = char.trim() === '';
    
    if (isSpace) {
      // 如果有 Perceiver 且没开出空格，空格变 *。如果玩家“开”了空格，才能显示空格。
      if (hasPerceiver) {
        masked += openedSet.has(' ') ? ' ' : '*';
      } else {
        masked += ' '; // 经典模式：空格直接暴露
      }
      continue;
    }

    // 字符比对 (无视大小写)
    if (openedSet.has(char.toLowerCase())) {
      masked += char; // 暴露真实字符 (保留原大小写)
    } else {
      masked += '*';  // 掩码
    }
  }

  return masked;
}

function calculateSessionStarRating(baseOvs) {
  const totalBaseOv = baseOvs.reduce((a, b) => a + b, 0);
  return Number((totalBaseOv / 60.0).toFixed(2));
}

/**
 * 🚀 非线性 OV 收益转换 (基于纯粹星数)
 * 完美通关总 Base 收益 = 10 * (星数 ^ 1.8)
 * 例如：3星=72 OV, 5星=181 OV, 10星=630 OV
 */
function distributeNonLinearOV(starRating, songBaseOvs) {
  const perfectSessionOv = 10 * Math.pow(starRating, 1.8);
  const totalBase = songBaseOvs.reduce((a, b) => a + b, 0) || 1; 
  
  return songBaseOvs.map(ov => Number((perfectSessionOv * (ov / totalBase)).toFixed(2)));
}

function getRevealRatio(title, openedChars, mods = []) {
  const openedSet = new Set(openedChars.map(c => c.toLowerCase()));
  const hasPerceiver = mods.includes('Perceiver');
  
  let totalValid = 0;
  let revealed = 0;

  for (let char of title) {
    if (char.trim() === '' && !hasPerceiver) continue; // 正常模式不统计空格
    totalValid++;
    if (openedSet.has(char.toLowerCase())) revealed++;
  }

  return totalValid === 0 ? 0 : (revealed / totalValid);
}

/**
 * ⚖️ 计算单曲最终实际得分 (Actual OV)
 */
function calculateActualOV(baseOv, title, openedChars, mistakes, mods = []) {
  // 1. 获取基础乘区信息
  const openedSet = new Set(openedChars.map(c => c.toLowerCase()));
  
  // 计算 R (盲猜率)：开出的字符 / 总有效字符数
  // 注意：Perceiver 模式下，空格算有效字符；正常模式下不算。
  const hasPerceiver = mods.includes('Perceiver');
  let totalValidChars = 0;
  let revealedChars = 0;

  for (let char of title) {
    const isSpace = char.trim() === '';
    if (isSpace && !hasPerceiver) continue; 
    
    totalValidChars++;
    if (openedSet.has(char.toLowerCase())) {
      revealedChars++;
    }
  }

  const R = totalValidChars === 0 ? 0 : (revealedChars / totalValidChars);
  // 自然死亡判定：如果开出率 R 为 1 (全开)，直接 0 分
  if (R >= 1) return 0;

  // 2. Mod 乘区映射表
  const MOD_MULTIPLIERS = {
    Tenacity: 1.15, Fear: 1.15, Prudence: 1.55, Reflection: 1.30, 
    Perceiver: 1.30, Puzzle: 1.70, Easy: 0.45, Brave: 0.50, 
    Lucky: 0.20, Strength: 0.10
  };

  let modMultiplier = 1.0;
  mods.forEach(mod => {
    if (MOD_MULTIPLIERS[mod]) modMultiplier *= MOD_MULTIPLIERS[mod];
  });

  // 3. 最终公式： Base * (1-R)^2 * (0.85^Mistakes) * Mods
  let actualOv = baseOv * Math.pow((1 - R), 2) * Math.pow(0.85, mistakes) * modMultiplier;
  
  return Number(actualOv.toFixed(2));
}

module.exports = { normalizeTitle, calculateBaseOV, generateMaskedTitle, calculateActualOV, getRevealRatio, calculateSessionStarRating, distributeNonLinearOV };