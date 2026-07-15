/**
 * HaS-Anonymizer adapter for the parent AI safety layer.
 *
 * Strategy:
 * 1. Use a remote HaS-compatible anonymizer endpoint when configured.
 * 2. Fall back to built-in rules so EdgeOne Functions keep working.
 * 3. Never persist original sensitive text in the returned session payload.
 *
 * API keys are protected by EdgeOne environment variables and are not handled
 * by this module.
 */

const BUILTIN_PII_RULES = [
  {
    id: 'phone',
    label: '中国手机号',
    pattern: /(?<!\d)1[3-9]\d{9}(?!\d)/g,
    replacement: '[手机号已隐藏]',
  },
  {
    id: 'email',
    label: '电子邮箱',
    pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    replacement: '[邮箱已隐藏]',
  },
  {
    id: 'id_card',
    label: '身份证号码',
    pattern: /(?<!\d)[1-9]\d{5}(?:18|19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[\dXx](?!\d)/g,
    replacement: '[身份证号已隐藏]',
  },
  {
    id: 'wechat_qq',
    label: '微信号/QQ号',
    pattern: /(?:wxid_[a-zA-Z0-9_-]{5,}|(?:微信|微 信|wechat|WeChat|VX|vx|WX|wx)\s*[:：]?\s*[a-zA-Z][a-zA-Z0-9_-]{5,20}|(?:QQ|qq)\s*[:：]?\s*\d{5,12})/g,
    replacement: '[社交账号已隐藏]',
  },
  {
    id: 'address',
    label: '明显地址信息',
    pattern: /(?:[\u4e00-\u9fa5]{2,}(?:省|自治区|特别行政区)[\u4e00-\u9fa5]{2,}(?:市|自治州|地区)[\u4e00-\u9fa5]{1,}(?:区|县|市)|[\u4e00-\u9fa5]{2,}(?:路|街|巷|大道|小区|公寓|花园|广场)\s*\d{1,5}\s*(?:号|栋|幢|单元|室)?|\d{1,4}\s*(?:栋|幢)\s*\d{1,4}\s*(?:单元)\s*\d{1,5}\s*(?:室|号)?)/g,
    replacement: '[地址信息已隐藏]',
  },
  {
    id: 'real_name',
    label: '真实姓名疑似表达',
    pattern: /(?:我叫|我是|我的名字(?:是|叫)|本人(?:是|叫)?|孩子叫|孩子名字(?:是|叫))\s*[\u4e00-\u9fa5]{2,4}(?=[。！？，,.!?\s]|$)/g,
    replacement: '[姓名已隐藏]',
  },
];

function sanitizeTextBuiltin(text) {
  if (typeof text !== 'string' || !text) {
    return { sanitized: text ?? '', findings: [] };
  }

  let sanitized = text;
  const findings = [];

  for (const rule of BUILTIN_PII_RULES) {
    const matches = sanitized.match(rule.pattern);
    if (!matches?.length) continue;

    findings.push({
      id: rule.id,
      label: rule.label,
      count: matches.length,
    });
    sanitized = sanitized.replace(rule.pattern, rule.replacement);
  }

  return { sanitized, findings };
}

async function tryHasAnonymizer(text) {
  const endpoint = process.env.HAS_ANONYMIZER_ENDPOINT;
  if (!endpoint) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) return null;

    const data = await response.json();
    if (!data?.sanitized) return null;

    return {
      sanitized: data.sanitized,
      findings: Array.isArray(data.findings) ? data.findings : [],
    };
  } catch {
    return null;
  }
}

async function sanitizeText(text) {
  const hasResult = await tryHasAnonymizer(text);
  if (hasResult) {
    return {
      sanitized: hasResult.sanitized,
      findings: hasResult.findings,
      provider: 'has-anonymizer',
    };
  }

  const builtin = sanitizeTextBuiltin(text);
  return {
    sanitized: builtin.sanitized,
    findings: builtin.findings,
    provider: 'has-anonymizer-fallback',
  };
}

export async function sanitizeTurnPayload(payload) {
  const sanitized = { ...payload };
  const allFindings = [];
  let provider = 'has-anonymizer-fallback';

  if (typeof sanitized.playerReply === 'string') {
    const result = await sanitizeText(sanitized.playerReply);
    sanitized.playerReply = result.sanitized;
    if (result.findings.length) {
      allFindings.push(...result.findings);
      provider = result.provider;
    }
  }

  if (typeof sanitized.currentPlayerReply === 'string') {
    sanitized.currentPlayerReply = sanitized.playerReply;
  }

  if (Array.isArray(sanitized.history)) {
    sanitized.history = await Promise.all(
      sanitized.history.map(async (msg) => {
        if (!msg || typeof msg.text !== 'string') return msg;

        const result = await sanitizeText(msg.text);
        if (result.findings.length) {
          allFindings.push(...result.findings);
          if (result.provider === 'has-anonymizer') provider = 'has-anonymizer';
        }
        return { ...msg, text: result.sanitized };
      }),
    );
  }

  const aggregatedFindings = aggregateFindings(allFindings);

  return {
    payload: sanitized,
    privacyGuard: {
      enabled: true,
      provider,
      piiTypes: aggregatedFindings.map((finding) => finding.id),
      piiSummary: aggregatedFindings.map((finding) => `${finding.label}×${finding.count}`),
      originalTextStored: false,
    },
  };
}

function aggregateFindings(findings) {
  const map = new Map();
  for (const finding of findings) {
    const count = finding.count ?? 1;
    if (map.has(finding.id)) {
      map.get(finding.id).count += count;
    } else {
      map.set(finding.id, {
        id: finding.id,
        label: finding.label,
        count,
      });
    }
  }
  return [...map.values()];
}

export function getAnonymizerStatus() {
  const hasEndpoint = Boolean(process.env.HAS_ANONYMIZER_ENDPOINT);
  return {
    mode: hasEndpoint ? 'has-anonymizer' : 'has-anonymizer-fallback',
    hasRemote: hasEndpoint,
    builtinRules: BUILTIN_PII_RULES.map((rule) => rule.id),
  };
}
