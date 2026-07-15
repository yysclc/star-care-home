/**
 * 社交分享卡生成器
 * 使用独立隐藏 Canvas（纯 2D API），与游戏 Canvas 无关。
 */

const CARD_W = 600;
const CARD_H = 980;
const PAD = 38;
const FONT = '"MaokenZhuyuan", "Microsoft YaHei", "PingFang SC", sans-serif';
const SHARE_URL = 'http://starcarehome-clc.top/';
const SHARE_QR_PATH = '/assets/ui/share_qr.png';

const COLORS = {
  bg: '#fff5dc',
  panel: '#fffaf0',
  panel2: '#fff0c8',
  line: '#dfc08d',
  text: '#573417',
  subtext: '#7a5635',
  muted: '#9a7854',
  accent: '#b77b36',
  accentDark: '#8c5528',
  white: '#ffffff',
};

const ASD_FACTS = [
  '在中国，每约100名儿童中就有1名在自闭症谱系上。它不是家庭教育失败，也不是可以被简单“纠正”的问题。',
  '“不看人”不等于“不在意”，“不说话”不等于“没有想法”。表达方式有很多种。',
  '行为也是沟通。捂耳朵、后退、停住，可能是在说：“我现在承受不了。”',
  '低口语不等于低理解力。一个人不说话时，可能正在用其他方式处理复杂的信息。',
  '真正的包容不是让少数人努力适应多数人的世界，而是从一开始就把不同感知方式考虑进去。',
  '“不要”本身也是表达，而且是很重要的一种。不能因为对方没有说出“不”，就默认同意。',
];

const QUOTES = [
  '真正的照护不是把一个人修好，而是创造一个让他能被看见、被尊重的环境。',
  '理解不是一次选择，而是持续行动。',
  '少一点急着解释，多一点观察；少一点标签，多一点支持。',
  '靠近不是替别人决定，而是为对方留下可以表达的空间。',
];

function _wrapLines(ctx, text, maxW) {
  const result = [];
  const paragraphs = text.split('\n');

  paragraphs.forEach((para) => {
    if (!para) {
      result.push('');
      return;
    }
    let line = '';
    for (const ch of para) {
      const testLine = line + ch;
      if (ctx.measureText(testLine).width > maxW && line.length > 0) {
        result.push(line);
        line = ch;
      } else {
        line = testLine;
      }
    }
    if (line) result.push(line);
  });

  return result;
}

function _randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function _drawRoundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function _fillRoundedRect(ctx, x, y, w, h, r, fill) {
  _drawRoundedRect(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
}

function _strokeRoundedRect(ctx, x, y, w, h, r, stroke, lineWidth = 1) {
  _drawRoundedRect(ctx, x, y, w, h, r);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

function _drawWrappedText(ctx, text, x, y, maxW, lineH, options = {}) {
  ctx.font = options.font ?? `15px ${FONT}`;
  ctx.fillStyle = options.color ?? COLORS.subtext;
  ctx.textAlign = options.align ?? 'left';
  const lines = _wrapLines(ctx, text, maxW);
  lines.forEach((line, index) => {
    ctx.fillText(line, x, y + index * lineH);
  });
  return lines.length * lineH;
}

function _drawSectionTitle(ctx, text, x, y) {
  ctx.fillStyle = COLORS.accentDark;
  ctx.font = `bold 16px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText(text, x, y);
}

function _loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function _formatRecordRows(stats) {
  const safe = stats ?? {};
  return [
    {
      title: '结局与剧情',
      rows: [
        ['最大完成周数', `第 ${safe.maxCompletedWeek ?? 0} 周`],
        ['照护所稳定支持结局', `${safe.bestInstitutionEndingCount ?? 0} 次`],
        ['具体看见结局', `${safe.bestCareEndingCount ?? 0} 次`],
        ['橙橙安心表达结局', `${safe.bestOrangeEndingCount ?? 0} 次`],
        ['橙橙画作获得数', `${safe.maxOrangeArtworkCount ?? 0}`],
        ['所长剧情解锁数', `${safe.maxDirectorStoryCount ?? 0}`],
      ],
    },
    {
      title: '最高数值',
      rows: [
        ['孩子信任度', `${safe.bestChildTrust ?? 0}`],
        ['机构名望', `${safe.bestReputation ?? 0}`],
        ['机构金钱', `${safe.bestFunds ?? 0}`],
        ['专业理解', `${safe.bestProfessional ?? 0}`],
        ['沟通能力', `${safe.bestCommunication ?? 0}`],
        ['体能经验', `${safe.bestStaminaExp ?? 0}`],
      ],
    },
  ];
}

function _drawRecordPanel(ctx, stats, x, y, w) {
  const panelH = 410;
  _fillRoundedRect(ctx, x, y, w, panelH, 18, COLORS.panel);
  _strokeRoundedRect(ctx, x, y, w, panelH, 18, COLORS.line, 1.4);

  ctx.fillStyle = COLORS.text;
  ctx.font = `bold 18px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('旅程记录', x + w / 2, y + 38);

  const groups = _formatRecordRows(stats);
  let cursorY = y + 78;
  const labelX = x + 54;
  const valueX = x + w - 54;

  groups.forEach((group, groupIndex) => {
    if (groupIndex > 0) {
      ctx.strokeStyle = COLORS.line;
      ctx.globalAlpha = 0.65;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 34, cursorY - 11);
      ctx.lineTo(x + w - 34, cursorY - 11);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    _drawSectionTitle(ctx, group.title, x + 34, cursorY);
    cursorY += 24;

    group.rows.forEach(([label, value]) => {
      ctx.font = `14px ${FONT}`;
      ctx.fillStyle = COLORS.subtext;
      ctx.textAlign = 'left';
      ctx.fillText(label, labelX, cursorY);

      ctx.font = `bold 15px ${FONT}`;
      ctx.fillStyle = COLORS.text;
      ctx.textAlign = 'right';
      ctx.fillText(value, valueX, cursorY);

      cursorY += 24;
    });

    cursorY += 12;
  });

  return panelH;
}

export async function generateShareCard(stats) {
  const qrImage = await _loadImage(SHARE_QR_PATH);
  const canvas = document.createElement('canvas');
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext('2d');

  const bgGradient = ctx.createLinearGradient(0, 0, 0, CARD_H);
  bgGradient.addColorStop(0, '#fff0cc');
  bgGradient.addColorStop(0.48, COLORS.bg);
  bgGradient.addColorStop(1, '#fff8e8');
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  ctx.fillStyle = COLORS.accent;
  ctx.fillRect(0, 0, CARD_W, 8);

  let y = 32;

  ctx.fillStyle = COLORS.accent;
  ctx.font = `bold 34px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('⭐ 星星照护所 ⭐', CARD_W / 2, y + 20);

  ctx.fillStyle = COLORS.subtext;
  ctx.font = `16px ${FONT}`;
  ctx.fillText('一段关于理解、照护与靠近的旅程', CARD_W / 2, y + 54);
  y += 86;

  const quote = _randomItem(QUOTES);
  const quoteX = PAD;
  const quoteW = CARD_W - PAD * 2;
  _fillRoundedRect(ctx, quoteX, y, quoteW, 98, 16, COLORS.panel2);

  ctx.font = `18px ${FONT}`;
  ctx.fillStyle = COLORS.text;
  ctx.textAlign = 'center';
  const quoteLines = _wrapLines(ctx, `“${quote}”`, quoteW - 50).slice(0, 3);
  const quoteStartY = y + 34;
  quoteLines.forEach((line, index) => {
    ctx.fillText(line, CARD_W / 2, quoteStartY + index * 25);
  });
  y += 144;

  const fact = _randomItem(ASD_FACTS);
  const factX = PAD + 8;
  ctx.fillStyle = COLORS.accentDark;
  ctx.font = `bold 17px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText('带走的一点理解', factX, y);
  y += 26;

  const factHeight = _drawWrappedText(ctx, fact, factX, y, CARD_W - PAD * 2 - 16, 22, {
    font: `15px ${FONT}`,
    color: COLORS.subtext,
  });
  y += factHeight + 22;

  _drawRecordPanel(ctx, stats, PAD, y, CARD_W - PAD * 2);

  ctx.fillStyle = COLORS.accent;
  ctx.globalAlpha = 0.11;
  ctx.fillRect(0, CARD_H - 134, CARD_W, 134);
  ctx.globalAlpha = 1;

  const footerY = CARD_H - 116;
  const qrSize = 82;
  const qrX = PAD + 18;
  const qrY = footerY + 2;
  _fillRoundedRect(ctx, qrX - 8, qrY - 8, qrSize + 16, qrSize + 16, 12, COLORS.white);
  _strokeRoundedRect(ctx, qrX - 8, qrY - 8, qrSize + 16, qrSize + 16, 12, COLORS.line, 1);
  if (qrImage) {
    ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);
  }

  const footerTextX = qrX + qrSize + 30;
  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.text;
  ctx.font = `bold 16px ${FONT}`;
  ctx.fillText('了解《星星照护所》', footerTextX, footerY + 18);

  ctx.fillStyle = COLORS.accentDark;
  ctx.font = `15px ${FONT}`;
  ctx.fillText(SHARE_URL, footerTextX, footerY + 44);

  ctx.fillStyle = COLORS.muted;
  ctx.font = `13px ${FONT}`;
  ctx.fillText('扫码或复制链接进入作品页面', footerTextX, footerY + 70);

  ctx.fillStyle = COLORS.subtext;
  ctx.font = `13px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('《星星照护所》— 理解不是一次选择，而是持续行动', CARD_W / 2, CARD_H - 18);

  return canvas.toDataURL('image/png');
}

export async function downloadShareCard(stats) {
  const dataUrl = await generateShareCard(stats);
  const link = document.createElement('a');
  link.download = '星星照护所_旅程记录.png';
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  return dataUrl;
}
