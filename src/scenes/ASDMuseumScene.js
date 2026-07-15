import Phaser from 'phaser';
import { ASSET_KEYS, ASSET_PATHS, GAME_H, GAME_W } from '../core/Constants.js';
import { ASD_MUSEUM_SECTIONS } from '../data/asdMuseumContent.js';
import { getAllKnowledgeCards, isKnowledgeCardUnlocked } from '../data/knowledgeCards.js';
import { isActionGuideUnlocked, getLastGameStats } from '../data/archiveStorage.js';
import { downloadShareCard } from '../ui/ShareCardPanel.js';
import { makeButton, makeCoverBackground, makeLabel } from '../ui/widgets.js';
import { getUiTheme } from '../ui/uiThemes.js';
import ResourceManager from '../core/ResourceManager.js';

const PANEL = {
  x: 54,
  y: 26,
  w: 1030,
  h: 588,
  navW: 244,
  pad: 30,
};

const ACTION_GUIDE_ALWAYS_OPEN = true;

export default class ASDMuseumScene extends Phaser.Scene {
  constructor() {
    super('ASDMuseumScene');
  }

  init(data) {
    this.gs = data?.gs ?? null;
    this.fromScene = data?.fromScene || 'StartScene';
    this.themeName = data?.theme || 'start';
    this.theme = getUiTheme(this.themeName);
    this.currentSectionId = ASD_MUSEUM_SECTIONS[0]?.id ?? null;
    this.sectionModes = {};
    this.sectionContainer = null;
    this.navContainer = null;
    this._sectionScrollCleanup = null;
  }

  preload() {
    ResourceManager.queueImage(this, ASSET_KEYS.startBg, ASSET_PATHS.startBg);
  }

  create() {
    makeCoverBackground(this, ASSET_KEYS.startBg, 0.16);
    this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, this.theme.overlay, this.theme.overlayAlpha);

    this._drawPanel();
    this._drawHeader();
    this._drawNav();
    this._drawSection();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this._sectionScrollCleanup?.();
      this._sectionScrollCleanup = null;
    });
  }

  _drawPanel() {
    const shadow = this.add.graphics();
    shadow.fillStyle(this.theme.shadow, this.theme.shadowAlpha);
    shadow.fillRoundedRect(PANEL.x + 8, PANEL.y + 10, PANEL.w, PANEL.h, 24);

    const panel = this.add.graphics();
    if (this.theme.panelFill2) {
      panel.fillGradientStyle(this.theme.panelFill, this.theme.panelFill, this.theme.panelFill2, this.theme.panelFill2, this.theme.panelAlpha);
    } else {
      panel.fillStyle(this.theme.panelFill, this.theme.panelAlpha);
    }
    panel.fillRoundedRect(PANEL.x, PANEL.y, PANEL.w, PANEL.h, 24);
    panel.lineStyle(3, this.theme.panelStroke, this.theme.panelStrokeAlpha);
    panel.strokeRoundedRect(PANEL.x, PANEL.y, PANEL.w, PANEL.h, 24);
    panel.lineStyle(1, this.theme.innerStroke, this.theme.innerStrokeAlpha);
    panel.strokeRoundedRect(PANEL.x + 8, PANEL.y + 8, PANEL.w - 16, PANEL.h - 16, 18);

    const divider = this.add.graphics();
    divider.lineStyle(2, this.theme.panelStroke, 0.55);
    divider.lineBetween(PANEL.x + PANEL.navW + 26, PANEL.y + 88, PANEL.x + PANEL.navW + 26, PANEL.y + PANEL.h - 34);
  }

  _drawHeader() {
    makeLabel(this, PANEL.x + PANEL.pad, PANEL.y + 26, 'ASD 档案馆｜孤独症谱系障碍', {
      fontSize: '28px',
      color: this.theme.text,
    }).setDepth(5);

    makeLabel(this, PANEL.x + PANEL.pad, PANEL.y + 64, '这里收纳了游戏背后的 ASD 相关资料、设计依据与参考来源。', {
      fontSize: '15px',
      color: this.theme.subtext,
    }).setDepth(5);

    makeButton(this, PANEL.x + PANEL.w - 76, PANEL.y + 48, 116, 38, '返回主页', () => {
      this.scene.start(this.fromScene || 'StartScene');
    }, {
      fontSize: '15px',
      fill: this.theme.buttonFill,
      hover: this.theme.buttonHover,
      stroke: this.theme.buttonStroke,
      textColor: this.theme.buttonText,
      radius: 14,
    }).setDepth(6);
  }

  _drawNav() {
    this.navContainer?.destroy();
    this.navContainer = this.add.container(0, 0).setDepth(8);

    const startY = PANEL.y + 112;
    const gap = 47;
    ASD_MUSEUM_SECTIONS.forEach((section, index) => {
      const y = startY + index * gap;
      const active = section.id === this.currentSectionId;
      const isLocked = section.locked && !this._isActionGuideOpen();
      const label = section.title;

      const btn = makeButton(this, PANEL.x + PANEL.pad + 88, y, 196, 38, label, () => {
        this.currentSectionId = section.id;
        this.sectionModes[section.id] = 'knowledge';
        this._drawNav();
        this._drawSection();
      }, {
        fontSize: '19px',
        fill: active ? this.theme.buttonActiveFill : this.theme.buttonFill,
        hover: active ? this.theme.buttonActiveFill : this.theme.buttonHover,
        stroke: this.theme.buttonStroke,
        textColor: isLocked ? this.theme.hint : this.theme.buttonText,
        radius: 12,
        disabled: active,
        disabledFill: this.theme.buttonActiveFill,
        disabledTextColor: this.theme.closeText,
      });
      btn.setDepth(8);
      this.navContainer.add([btn.g, btn.t, btn.zone]);
    });
  }

  _isCardUnlocked(card) {
    return isKnowledgeCardUnlocked(card.id, this.gs);
  }

  _isActionGuideOpen() {
    return ACTION_GUIDE_ALWAYS_OPEN || isActionGuideUnlocked();
  }

  _drawSection() {
    this._sectionScrollCleanup?.();
    this._sectionScrollCleanup = null;
    this.sectionContainer?.destroy();
    this.sectionContainer = this.add.container(0, 0).setDepth(8);

    const section = ASD_MUSEUM_SECTIONS.find((item) => item.id === this.currentSectionId) ?? ASD_MUSEUM_SECTIONS[0];
    const contentX = PANEL.x + PANEL.navW + 62;
    const contentY = PANEL.y + 112;
    const contentW = PANEL.w - PANEL.navW - 136;
    const viewportH = PANEL.y + PANEL.h - 90 - contentY;

    const title = makeLabel(this, contentX, contentY, section.title, {
      fontSize: '24px',
      color: this.theme.text,
    });
    title.setDepth(8);
    this.sectionContainer.add(title);

    const rawBodyParagraphs = section.id === 'action-guide' && this._isActionGuideOpen()
      ? (section.unlockedBody || section.body)
      : section.body;
    const bodyParts = this._splitMuseumBody(rawBodyParagraphs);
    const hasGamePresentation = bodyParts.game.length > 0;
    const currentMode = hasGamePresentation
      ? (this.sectionModes[section.id] === 'game' ? 'game' : 'knowledge')
      : 'knowledge';

    if (hasGamePresentation) {
      const toggleLabel = currentMode === 'game' ? '返回知识' : '游戏中的呈现';
      const toggleW = 188;
      const toggleX = Math.min(
        contentX + title.width + toggleW / 2 + 42,
        contentX + contentW - toggleW / 2 - 28,
      );
      const toggleBtn = makeButton(this, toggleX, contentY + 24, toggleW, 38, toggleLabel, () => {
        this.sectionModes[section.id] = currentMode === 'game' ? 'knowledge' : 'game';
        this._drawSection();
      }, {
        fontSize: '17px',
        fill: currentMode === 'game' ? this.theme.buttonActiveFill : this.theme.buttonFill,
        hover: this.theme.buttonHover,
        stroke: this.theme.buttonStroke,
        textColor: currentMode === 'game' ? this.theme.closeText : this.theme.buttonText,
        radius: 12,
      });
      toggleBtn.setDepth(8);
      this.sectionContainer.add([toggleBtn.g, toggleBtn.t, toggleBtn.zone]);
    }

    let y = contentY + 54;
    const bodyParagraphs = currentMode === 'game' ? bodyParts.game : bodyParts.knowledge;

    bodyParagraphs.forEach((paragraph) => {
      y = this._drawMuseumParagraph(paragraph, contentX, y, contentW, {
        fontSize: '19px',
        color: this.theme.text,
        lineSpacing: 8,
        paragraphGap: 24,
      });
    });

    if (section.id === 'knowledge-cards') {
      const cards = getAllKnowledgeCards();
      const unlockedCards = cards.filter((card) => this._isCardUnlocked(card));
      const divider = this.add.graphics().setDepth(8);
      divider.lineStyle(1.5, this.theme.panelStroke, 0.45);
      divider.lineBetween(contentX, y + 4, contentX + contentW, y + 4);
      this.sectionContainer.add(divider);
      y += 28;

      const cardTitle = makeLabel(this, contentX, y, `已收录知识卡 ${unlockedCards.length}/${cards.length}`, {
        fontSize: '20px',
        color: this.theme.text,
      });
      cardTitle.setDepth(8);
      this.sectionContainer.add(cardTitle);
      y += cardTitle.height + 18;

      if (unlockedCards.length === 0) {
        const locked = makeLabel(this, contentX, y, '游戏过程中阅读知识卡后，会逐步收录到这里。', {
          fontSize: '18px',
          color: this.theme.hint,
          wordWrap: { width: contentW, useAdvancedWrap: true },
        });
        locked.setDepth(8);
        this.sectionContainer.add(locked);
        y += locked.height + 20;
      } else {
        unlockedCards.forEach((card) => {
          y = this._drawKnowledgeCardEntry(card, contentX, y, contentW);
        });
      }
    }

    // ── 参考资料与声明 ──
    if (section.id === 'references-statement' && section.references) {
      y += 12;
      section.references.forEach((ref) => {
        const divider = this.add.graphics().setDepth(8);
        divider.lineStyle(1.2, this.theme.panelStroke, 0.35);
        divider.lineBetween(contentX, y, contentX + contentW, y);
        this.sectionContainer.add(divider);
        y += 18;

        const refTitle = makeLabel(this, contentX, y, `📎 ${ref.section}`, {
          fontSize: '20px',
          color: this.theme.text,
        });
        refTitle.setDepth(8);
        this.sectionContainer.add(refTitle);
        y += refTitle.height + 14;

        ref.sources.forEach((src) => {
          const srcText = makeLabel(this, contentX + 12, y, `· ${src}`, {
            fontSize: '16px',
            color: this.theme.hint,
            lineSpacing: 5,
            wordWrap: { width: contentW - 24, useAdvancedWrap: true },
          });
          srcText.setDepth(8);
          this.sectionContainer.add(srcText);
          y += srcText.height + 10;
        });
        y += 8;
      });
    }

    // ── 行动指南分区 ──
    if (section.id === 'action-guide') {
      const unlocked = this._isActionGuideOpen();

      if (!unlocked) {
        const lockMsg = makeLabel(this, contentX, y, '通关一次后解锁，了解你可以为 ASD 群体做的真实行动。', {
          fontSize: '19px',
          color: this.theme.hint,
          wordWrap: { width: contentW, useAdvancedWrap: true },
        });
        lockMsg.setDepth(8);
        this.sectionContainer.add(lockMsg);
        y += lockMsg.height + 20;
      } else {
        // 解锁后：顶部生成分享卡按钮
        const shareBtn = makeButton(this, contentX + 144, y, 288, 40, '生成照护档案照片', () => {
          const stats = getLastGameStats();
          downloadShareCard(stats);
          // 简短反馈
          const toast = makeLabel(this, contentX + 144, y + 58, '已保存至本地', {
            fontSize: '16px',
            color: this.theme.closeText,
          });
          toast.setDepth(9).setOrigin(0.5);
          this.sectionContainer.add(toast);
          this.time.delayedCall(2000, () => toast.destroy());
        }, {
          fontSize: '17px',
          fill: this.theme.buttonActiveFill,
          hover: this.theme.buttonHover,
          stroke: this.theme.buttonStroke,
          textColor: this.theme.closeText,
          radius: 12,
        });
        shareBtn.setDepth(8);
        this.sectionContainer.add([shareBtn.g, shareBtn.t, shareBtn.zone]);
        const shareTip = makeLabel(this, contentX, y + 52, '手机端可能无法正常生成图片，建议使用电脑端保存。', {
          fontSize: '15px',
          color: this.theme.hint,
        });
        shareTip.setDepth(8);
        this.sectionContainer.add(shareTip);
        y += 82;

        y += 8;

        // 子板块
        (section.subsections || []).forEach((sub) => {
          const divider = this.add.graphics().setDepth(8);
          divider.lineStyle(1.2, this.theme.panelStroke, 0.35);
          divider.lineBetween(contentX, y, contentX + contentW, y);
          this.sectionContainer.add(divider);
          y += 18;

          const subTitle = makeLabel(this, contentX, y, sub.title, {
            fontSize: '20px',
            color: this.theme.text,
          });
          subTitle.setDepth(8);
          this.sectionContainer.add(subTitle);
          y += subTitle.height + 14;

          if (sub.showStats) {
            const stats = getLastGameStats();
            if (stats) {
              const statsArr = [
                `最大完成周数：第 ${stats.maxCompletedWeek ?? 0} 周`,
                `照护所稳定支持结局次数：${stats.bestInstitutionEndingCount ?? 0}`,
                `具体看见结局次数：${stats.bestCareEndingCount ?? 0}`,
                `橙橙安心表达结局次数：${stats.bestOrangeEndingCount ?? 0}`,
                `橙橙画作获得数：${stats.maxOrangeArtworkCount ?? 0}`,
                `所长剧情解锁数：${stats.maxDirectorStoryCount ?? 0}`,
                `最高孩子信任度：${stats.bestChildTrust ?? 0}`,
                `最高机构名望：${stats.bestReputation ?? 0}`,
                `最高机构金钱：${stats.bestFunds ?? 0}`,
                `最高专业理解：${stats.bestProfessional ?? 0}`,
                `最高沟通能力：${stats.bestCommunication ?? 0}`,
                `最高体能经验：${stats.bestStaminaExp ?? 0}`,
              ];

              statsArr.forEach((line) => {
                const t = makeLabel(this, contentX + 12, y, `· ${line}`, {
                  fontSize: '18px',
                  color: this.theme.subtext,
                  lineSpacing: 4,
                  wordWrap: { width: contentW - 24, useAdvancedWrap: true },
                });
                t.setDepth(8);
                this.sectionContainer.add(t);
                y += t.height + 10;
              });
            } else {
              y += 2;
            }
          } else if (sub.body) {
            const subText = makeLabel(this, contentX, y, sub.body, {
              fontSize: '18px',
              color: this.theme.subtext,
              lineSpacing: 6,
              wordWrap: { width: contentW, useAdvancedWrap: true },
            });
            subText.setDepth(8);
            this.sectionContainer.add(subText);
            y += subText.height + 22;
          }
        });
      }
    }

    this._setupSectionScroll({
      contentX,
      contentY,
      contentW,
      viewportH,
      contentBottom: y,
    });
  }

  _drawKnowledgeCardEntry(card, x, y, w) {
    const entryPad = 16;
    const entryW = w;
    const title = `第${card.week}周｜${card.title}`;
    const body = (card.body ?? []).filter(Boolean).join('\n');

    const bodyText = this.add.text(0, 0, body, {
      fontSize: '17px',
      color: this.theme.text,
      lineSpacing: 5,
      wordWrap: { width: entryW - entryPad * 2, useAdvancedWrap: true },
    });
    const bodyH = bodyText.height;
    bodyText.destroy();

    const entryH = 46 + bodyH + entryPad;
    const bg = this.add.graphics().setDepth(8);
    bg.fillStyle(this.theme.buttonFill, 0.28);
    bg.fillRoundedRect(x, y, entryW, entryH, 10);
    bg.lineStyle(1, this.theme.buttonStroke, 0.38);
    bg.strokeRoundedRect(x, y, entryW, entryH, 10);
    this.sectionContainer.add(bg);

    const titleText = makeLabel(this, x + entryPad, y + 14, title, {
      fontSize: '19px',
      color: this.theme.text,
      wordWrap: { width: entryW - entryPad * 2, useAdvancedWrap: true },
    });
    titleText.setDepth(8);
    this.sectionContainer.add(titleText);

    const bodyLabel = makeLabel(this, x + entryPad, y + 42, body, {
      fontSize: '17px',
      color: this.theme.subtext,
      lineSpacing: 5,
      wordWrap: { width: entryW - entryPad * 2, useAdvancedWrap: true },
    });
    bodyLabel.setDepth(8);
    this.sectionContainer.add(bodyLabel);

    return y + entryH + 14;
  }

  _splitMuseumBody(paragraphs = []) {
    const marker = '━━━ 在游戏中的呈现 ━━━';
    const index = paragraphs.findIndex((paragraph) => paragraph === marker);
    if (index < 0) {
      return {
        knowledge: paragraphs,
        game: [],
      };
    }

    return {
      knowledge: paragraphs.slice(0, index),
      game: paragraphs.slice(index + 1),
    };
  }

  _drawMuseumParagraph(paragraph, x, y, w, {
    fontSize = '19px',
    color = this.theme.text,
    lineSpacing = 8,
    paragraphGap = 24,
  } = {}) {
    const lines = String(paragraph ?? '').split('\n');
    let cursorY = y;

    lines.forEach((rawLine, index) => {
      const line = rawLine.trimEnd();
      if (!line) {
        cursorY += 12;
        return;
      }

      const listMatch = line.match(/^([①②③④⑤■•])[\s\u00a0]*(.+)$/);
      if (listMatch) {
        cursorY = this._drawMuseumListLine(listMatch[1], listMatch[2], x, cursorY, w, {
          fontSize,
          color,
          lineSpacing,
        });
      } else {
        const text = makeLabel(this, x, cursorY, this._normalizeMuseumLine(line), {
          fontSize,
          color,
          lineSpacing,
          wordWrap: { width: w, useAdvancedWrap: true },
        });
        text.setDepth(8);
        this.sectionContainer.add(text);
        cursorY += text.height;
      }

      if (index < lines.length - 1) cursorY += 8;
    });

    return cursorY + paragraphGap;
  }

  _drawMuseumListLine(marker, body, x, y, w, {
    fontSize = '19px',
    color = this.theme.text,
    lineSpacing = 8,
  } = {}) {
    const markerW = marker === '•' ? 24 : 34;
    const markerText = makeLabel(this, x, y, marker, {
      fontSize,
      color,
    });
    markerText.setDepth(8);
    this.sectionContainer.add(markerText);

    const bodyText = makeLabel(this, x + markerW, y, this._normalizeMuseumLine(body), {
      fontSize,
      color,
      lineSpacing,
      wordWrap: { width: w - markerW, useAdvancedWrap: true },
    });
    bodyText.setDepth(8);
    this.sectionContainer.add(bodyText);

    return y + Math.max(markerText.height, bodyText.height);
  }

  _normalizeMuseumLine(line) {
    return String(line ?? '')
      .replace(/\s*≠\s*/g, '≠')
      .replace(/\s+——/g, '——')
      .replace(/——\s+/g, '——');
  }

  _setupSectionScroll({ contentX, contentY, contentW, viewportH, contentBottom }) {
    const maskGraphics = this.make.graphics();
    maskGraphics.fillStyle(0xffffff, 1);
    maskGraphics.fillRect(contentX - 4, contentY - 2, contentW + 8, viewportH + 4);
    const textMask = maskGraphics.createGeometryMask();
    this.sectionContainer.setMask(textMask);

    const maxScroll = Math.max(0, contentBottom - (contentY + viewportH));
    let scrollY = 0;
    const trackW = 14;
    const trackX = contentX + contentW + 28;
    const trackY = contentY;
    const trackH = viewportH;
    const thumbMinH = 54;
    const thumbH = maxScroll > 0
      ? Phaser.Math.Clamp((viewportH / Math.max(viewportH, contentBottom - contentY)) * trackH, thumbMinH, trackH)
      : trackH;
    const maxThumbTravel = Math.max(0, trackH - thumbH);

    const scrollBar = this.add.graphics().setDepth(9);
    const scrollHit = this.add.zone(trackX, trackY + trackH / 2, 44, trackH)
      .setInteractive({ useHandCursor: maxScroll > 0 })
      .setDepth(10);
    const thumbHit = this.add.zone(trackX, trackY + thumbH / 2, 44, thumbH)
      .setInteractive({ useHandCursor: maxScroll > 0 })
      .setDepth(11);
    const contentHit = this.add.zone(contentX + contentW / 2, contentY + viewportH / 2, contentW, viewportH)
      .setInteractive({ useHandCursor: maxScroll > 0 })
      .setDepth(7);

    if (maxScroll > 0) {
      this.input.setDraggable(thumbHit);
    }

    const drawScrollBar = () => {
      const ratio = maxScroll > 0 ? scrollY / maxScroll : 0;
      const thumbY = trackY + ratio * maxThumbTravel;
      scrollBar.clear();
      scrollBar.fillStyle(this.theme.innerStroke, 0.10);
      scrollBar.fillRoundedRect(trackX - trackW / 2 + 1, trackY + 1, trackW, trackH, trackW / 2);
      scrollBar.fillStyle(this.theme.buttonFill, 0.52);
      scrollBar.fillRoundedRect(trackX - trackW / 2, trackY, trackW, trackH, trackW / 2);
      scrollBar.lineStyle(1, this.theme.buttonStroke, 0.34);
      scrollBar.strokeRoundedRect(trackX - trackW / 2, trackY, trackW, trackH, trackW / 2);

      if (maxScroll <= 0) return;

      scrollBar.fillStyle(this.theme.shadow, 0.16);
      scrollBar.fillRoundedRect(trackX - trackW / 2 + 1, thumbY + 2, trackW, thumbH, trackW / 2);
      scrollBar.fillStyle(this.theme.buttonActiveFill, 0.86);
      scrollBar.fillRoundedRect(trackX - trackW / 2, thumbY, trackW, thumbH, trackW / 2);
      scrollBar.lineStyle(1, this.theme.buttonStroke, 0.42);
      scrollBar.strokeRoundedRect(trackX - trackW / 2, thumbY, trackW, thumbH, trackW / 2);
      thumbHit.y = thumbY + thumbH / 2;
    };

    const applyScroll = () => {
      scrollY = Phaser.Math.Clamp(scrollY, 0, maxScroll);
      this.sectionContainer.y = -scrollY;
      drawScrollBar();
    };

    const wheelHandler = (pointer, gameObjects, deltaX, deltaY) => {
      const inside =
        pointer.x >= contentX &&
        pointer.x <= contentX + contentW &&
        pointer.y >= contentY &&
        pointer.y <= contentY + viewportH;

      if (!inside || maxScroll <= 0) return;
      scrollY += deltaY * 0.6;
      applyScroll();
    };

    let dragStartY = 0;
    let dragStartScroll = 0;
    contentHit.on('pointerdown', (pointer) => {
      dragStartY = pointer.y;
      dragStartScroll = scrollY;
    });
    contentHit.on('pointermove', (pointer) => {
      if (!pointer.isDown || maxScroll <= 0) return;
      scrollY = dragStartScroll - (pointer.y - dragStartY);
      applyScroll();
    });

    scrollHit.on('pointerdown', (pointer) => {
      if (maxScroll <= 0) return;
      const targetThumbY = Phaser.Math.Clamp(pointer.y - thumbH / 2, trackY, trackY + maxThumbTravel);
      scrollY = ((targetThumbY - trackY) / maxThumbTravel) * maxScroll;
      applyScroll();
    });

    thumbHit.on('drag', (pointer, dragX, dragY) => {
      if (maxScroll <= 0) return;
      const targetThumbY = Phaser.Math.Clamp(dragY - thumbH / 2, trackY, trackY + maxThumbTravel);
      scrollY = ((targetThumbY - trackY) / maxThumbTravel) * maxScroll;
      applyScroll();
    });

    this.input.on('wheel', wheelHandler);
    applyScroll();

    this._sectionScrollCleanup = () => {
      this.input.off('wheel', wheelHandler);
      this.sectionContainer?.clearMask();
      maskGraphics.destroy();
      scrollBar.destroy();
      scrollHit.destroy();
      thumbHit.destroy();
      contentHit.destroy();
    };
  }
}
