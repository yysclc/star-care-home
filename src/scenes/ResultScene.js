import Phaser from 'phaser';
import { ASSET_KEYS, ASSET_PATHS, GAME_W, TEXT_STYLE } from '../core/Constants.js';
import { normalizeState } from '../core/GameState.js';
import { getByPath } from '../core/ValueSystem.js';
import { evaluateDayEnd } from '../systems/EventSystem.js';
import { DIALOGS_FIXED } from '../data/dialogs_fixed.js';
import { DIALOGS_EVENTS } from '../data/dialogs_events.js';
import { WEEK1_ORANGE_STORY } from '../data/week1OrangeStory.js';
import { getWeeklyOrangeResultStory } from '../data/orangeStories.js';
import { getWeeklyResultPreStory } from '../data/resultStories.js';
import { getFinalEndingStoryLines } from '../data/finalEndingStories.js';
import { ENDING_BACKGROUNDS } from '../data/endingBackgrounds.js';
import { getOrangeLocation } from '../data/orangeSchedule.js';
import { getWeekConfig, isWeekGoalMet } from '../data/weekConfigs.js';
import { advanceToNextWeek } from '../core/DayManager.js';
import {
  getParentTrustDeltaFromGroup,
  getParentTrustReasonFromGroup,
  clampParentTrust,
  getEffectiveParentMessageCounts,
  getParentAiTriggeredCommunicationCount,
} from '../core/ParentTrustSystem.js';
import { getPendingParentAiOutcomes } from '../../parent-ai-core/index.js';
import HUD from '../ui/HUD.js';
import DialogBox from '../ui/DialogBox.js';
import ChoicePanel from '../ui/ChoicePanel.js';
import StoryPlayer from '../ui/StoryPlayer.js';
import StoryPortraitController from '../ui/StoryPortraitController.js';
import StoryBackgroundController from '../ui/StoryBackgroundController.js';
import { makeButton, makeCoverBackground, makeLabel, makeStartButton } from '../ui/widgets.js';
import { unlockActionGuide, saveLastGameStats } from '../data/archiveStorage.js';
import ResourceManager from '../core/ResourceManager.js';
import AudioManager from '../systems/AudioManager.js';

// 结算布局配置
const LAYOUT = {
  PANEL_X: GAME_W / 2, // 控制底框位置 (中心)
  PANEL_Y: 135,        // 控制底框位置
  PANEL_W: 860,        // 控制底框大小
  PANEL_H: 380,        // 控制底框大小
  TITLE_Y: 85,         // 标题高度
  TEXT_X: GAME_W / 2,  // 控制正文起点 (中心)
  TEXT_Y: 160,         // 控制正文起点
  LINE_GAP: 8,         // 控制行距
  BUTTON_Y: 570,       // 控制按钮高度
  SCROLLBAR_W: 16,     // 右侧滑轨宽度
};

export default class ResultScene extends Phaser.Scene {
  constructor() {
    super('ResultScene');
  }

  init(data) {
    this.gs = normalizeState(data?.gs);
  }

  preload() {
    ResourceManager.queueImage(this, ASSET_KEYS.resultBg, ASSET_PATHS.resultBg);
    ResourceManager.queueImage(this, ASSET_KEYS.office, ASSET_PATHS.office);
    ResourceManager.queueImage(this, 'chapter1_office_corridor', '/assets/images/chapter1/office_corridor.png');
    ResourceManager.queueImage(this, ASSET_KEYS.orangeResultStoryBg, ASSET_PATHS.orangeResultStoryBg);
    ResourceManager.queueImage(this, 'two_chairs_art', '/assets/collections/artwork/two_chairs_art.png');
    ResourceManager.queueImage(this, 'parent_cg', '/assets/collections/cg/parent_cg.png');
    if (this.gs?.day >= 7) {
      ENDING_BACKGROUNDS.forEach(({ key, path }) => {
        ResourceManager.queueImage(this, key, path);
      });
    }
  }

  create() {
    if (this.gs.day >= 7) {
      AudioManager.playBgm('ending_bgm');
    } else {
      AudioManager.playBgm('story_soft_bgm');
    }
    this.hud = new HUD(this, this.gs);
    this.dialog = new DialogBox(this);
    this.choice = new ChoicePanel(this);
    this.story = new StoryPlayer(this, this.dialog);
    this.storyBg = new StoryBackgroundController(this);
    this.storyPortrait = new StoryPortraitController(this, this.gs);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.storyBg?.destroy?.();
      this.storyPortrait?.destroy?.();
    });
    if (this.maybePlayWeek1OrangePreResult()) {
      return;
    }
    if (this.maybePlayWeeklyOrangePreResult()) {
      return;
    }
    if (this.maybePlayWeeklyPreResult()) {
      return;
    }
    this.drawResult();
  }

  showResultBackground() {
    makeCoverBackground(this, ASSET_KEYS.resultBg, 0.20);
  }

  showOrangeResultStoryBackground() {
    makeCoverBackground(this, ASSET_KEYS.orangeResultStoryBg, 0.06);
  }

  isWeek1OrangeSuccess() {
    const flags = this.gs.orange?.flags ?? {};
    return Boolean(
      flags.week1_table_art_obtained
      || this.gs.collections?.items?.table_art
    );
  }

  maybePlayWeek1OrangePreResult() {
    if (this.gs.day !== 1) return false;
    const flags = this.gs.orange?.flags ?? {};
    if (flags.week1_orange_result) return false;

    const success = this.isWeek1OrangeSuccess();
    const lines = success
      ? WEEK1_ORANGE_STORY.endCheck.successLines
      : WEEK1_ORANGE_STORY.endCheck.failLines;

    this.showOrangeResultStoryBackground();

    this.story.play([{ type: 'dialog', lines }], () => {
      if (success) {
        this.gs.orange.flags.week1_orange_result = 'success';
        if (this.maybePlayWeeklyPreResult()) {
          return;
        }
        this.drawResult();
        return;
      }

      this.gs.orange.flags.week1_orange_result = 'fail';
      this.showOrangeLineLockedNotice(() => this.continueAfterWeek1OrangeFail());
    });
    return true;
  }

  continueAfterWeek1OrangeFail() {
    this.gs.orange.flags.week1_orange_locked = true;
    if (this.maybePlayWeeklyPreResult()) {
      return;
    }
    this.drawResult();
  }

  showOrangeLineLockedNotice(onConfirm) {
    this.choice.showVNChoice(
      [
        '橙橙剧情线永久锁定。',
        '橙橙相关剧情将不再触发，但不影响照护所主线经营。',
      ],
      [
        { label: '知道了', action: () => onConfirm?.() },
      ],
      {
        choiceWidth: 360,
        choiceHeight: 48,
        choiceGap: 14,
        choiceStartY: 330,
        choiceFontSize: '18px',
      }
    );
  }

  continueAfterOrangeFail() {
    if (this.gs.day === 2) {
      this.continueAfterWeek2OrangeFail();
    } else if (this.gs.day === 3) {
      this.continueAfterWeek3OrangeFail();
    } else if (this.gs.day === 4) {
      this.continueAfterWeek4OrangeFail();
    } else if (this.gs.day === 5) {
      this.continueAfterWeek5OrangeFail();
    } else {
      this.drawResult();
    }
  }

  maybePlayWeeklyOrangePreResult() {
    if (this.gs.day === 1) return false;

    this.gs.flags ??= {};
    const story = getWeeklyOrangeResultStory(this.gs.day);
    const schedule = getOrangeLocation(this.gs.day);
    if ((!story?.lines && !story?.successLines && !story?.failLines) || !schedule) return false;

    const orangeKey = `${this.gs.day}_${schedule.roomId}_orangeInteraction`;
    const interacted = Boolean(this.gs.dayProgress?.orangeInteractionDone?.[orangeKey]);
    const orangeFlags = this.gs.orange?.flags ?? {};
    const week7OrangeButtonAvailable = this.gs.day === 7
      && !orangeFlags.week7_orange_locked
      && (
        orangeFlags.week5_orange_result === 'success'
        || this.gs.flags?.godModeEnabled
      );
    const flagKey = `week${this.gs.day}_orange_result_done`;
    if ((!interacted && !week7OrangeButtonAvailable) || this.gs.flags[flagKey]) return false;

    const success = this.isWeeklyOrangeSuccess(this.gs.day);
    const lines = success
      ? (story.successLines ?? story.lines)
      : (story.failLines ?? story.lines);

    if (success) {
      AudioManager.playBgm('first_understanding');
    }

    this.showResultBackground();
    this.story.play([
      { type: 'dialog', lines },
    ], () => {
      this.gs.flags[flagKey] = true;
      this.gs.orange.flags[`week${this.gs.day}_orange_result`] = success ? 'success' : 'fail';
      if (!success && (this.gs.day === 2 || this.gs.day === 3 || this.gs.day === 4 || this.gs.day === 5)) {
        AudioManager.playBgm('story_soft_bgm');
        this.showOrangeLineLockedNotice(() => this.continueAfterOrangeFail());
        return;
      }
      if (this.maybePlayWeeklyPreResult()) {
        return;
      }
      AudioManager.playBgm('story_soft_bgm');
      this.drawResult();
    });

    return true;
  }

  isWeeklyOrangeSuccess(week) {
    const flags = this.gs.orange?.flags ?? {};
    if (Number(week) === 2) {
      return Boolean(
        flags.week2_no_sound_art_obtained
        || this.gs.collections?.items?.no_sound_art
      );
    }
    if (Number(week) === 3) {
      return Boolean(
        flags.week3_two_colors_art_obtained
        || flags.week3_final_choice === 'door_card'
        || this.gs.collections?.items?.two_colors_art
      );
    }
    if (Number(week) === 4) {
      return Boolean(
        flags.week4_back_art_obtained
        || this.gs.collections?.items?.back_art
      );
    }
    if (Number(week) === 5) {
      return Boolean(
        flags.week5_two_chairs_art_obtained
        || this.gs.collections?.items?.two_chairs_art
      );
    }
    if (Number(week) === 7) {
      return Boolean(
        flags.week7_door_person_art_obtained
        || this.gs.collections?.items?.door_person_boy_art
        || this.gs.collections?.items?.door_person_girl_art
      );
    }
    return true;
  }

  getAgencyEndingKey(weekGoalMet) {
    if (!weekGoalMet) return 'closed';
    if ((this.gs.reputation ?? 0) >= 100 && (this.gs.funds ?? 0) >= 2500) {
      return 'cooperation';
    }
    return 'survive';
  }

  getUnderstandingEndingKey() {
    const directorAffection = this.gs.director?.affection ?? 0;
    const parentTrust = this.gs.parentTrust ?? 0;
    const professional = this.gs.attrs?.professional ?? 0;
    const communication = this.gs.attrs?.communication ?? 0;
    return directorAffection >= 30
      && parentTrust >= 80
      && professional >= 90
      && communication >= 80
      ? 'alpha'
      : 'beta';
  }

  hasEnteredWeek7OrangeLine() {
    const flags = this.gs.orange?.flags ?? {};
    if (
      flags.week7_orange_result
      || flags.week7_door_person_art_obtained
      || flags.week7_door_person_art_variant
      || this.gs.collections?.items?.door_person_boy_art
      || this.gs.collections?.items?.door_person_girl_art
    ) {
      return true;
    }

    const done = this.gs.dayProgress?.orangeInteractionDone ?? {};
    return Object.entries(done).some(([key, value]) => key.startsWith('7_') && Boolean(value));
  }

  getOrangeEndingKey() {
    const flags = this.gs.orange?.flags ?? {};
    if (!this.hasEnteredWeek7OrangeLine()) return 'incomplete';
    if (this.isWeeklyOrangeSuccess(7) || flags.week7_orange_result === 'success') return 'secondPerson';
    return 'lost';
  }

  buildFinalEndingLines(weekGoalMet) {
    const agencyKey = this.getAgencyEndingKey(weekGoalMet);
    const lines = [
      ...getFinalEndingStoryLines(`agency.${agencyKey}`),
    ];

    if (agencyKey === 'closed') {
      return lines;
    }

    lines.push(...getFinalEndingStoryLines(`understanding.${this.getUnderstandingEndingKey()}`));

    const orangeKey = this.getOrangeEndingKey();
    lines.push(...getFinalEndingStoryLines(`orange.${orangeKey}`));

    lines.push(...getFinalEndingStoryLines('common.quietAfternoon'));
    return lines;
  }

  buildFinalEndingSections(weekGoalMet) {
    const agencyKey = this.getAgencyEndingKey(weekGoalMet);
    const sections = [
      {
        title: '点击查看照护所的去向',
        lines: getFinalEndingStoryLines(`agency.${agencyKey}`),
      },
    ];

    if (agencyKey === 'closed') {
      return sections;
    }

    sections.push({
      title: '点击查看你学会看见的事',
      lines: getFinalEndingStoryLines(`understanding.${this.getUnderstandingEndingKey()}`),
    });

    const orangeKey = this.getOrangeEndingKey();
    const orangeLines = [...getFinalEndingStoryLines(`orange.${orangeKey}`)];
    sections.push({
      title: '点击查看橙橙的后来',
      lines: orangeLines,
    });

    sections.push({
      title: null,
      lines: getFinalEndingStoryLines('common.quietAfternoon'),
    });

    return sections;
  }

  getEpiloguePages() {
    return [
      {
        lines: [
          '《星星照护所》希望以游戏作为理解与照护的入口，让你在照护所的日常选择中，看见自闭症谱系障碍儿童不同的感知、沟通与表达方式。',
        ],
      },
      {
        lines: [
          '游戏关注的从来不只是"认识 ASD"——也包括照护者压力、家庭沟通、资源限制、边界尊重与社会包容。你在游戏里每一次选择"先看，不要急着做"，都在练习一种从"纠正一个人"转向"支持一个人"的思维。',
          '我们希望你带走的不是同情，而是更具体的理解：少一点急着解释，多一点观察；少一点标签，多一点支持；少一点替别人决定，多一点让当事人被看见的空间。',
        ],
      },
      {
        lines: [
          '① 用神经多样性的视角理解自闭症。',
          '语言塑造认知。当你说"神经多样性"而非"病"，已经在帮周围人换一个视角。ASD不是一种需要被消除的东西——它是一种不同的神经发育路径，就像有的人惯用左手、有的人惯用右手，大脑也可以有不同的运作方式。',
          '② 遇到ASD儿童时，先观察再行动。',
          '安静地坐在不远处，比冲上去问"你叫什么名字"更可能被接受。给他们时间确认安全。记住你在照护所学到的：先看懂孩子在做什么、承受什么，再决定你的介入方式。有时候你最好的帮助，就是不急着帮。',
          '③ 转发一条科普，消除一个谣言。',
          '关于ASD的误解仍在广泛传播：疫苗会导致自闭症、家庭教育失败造成的、可以被"治愈"……每一条被转发的正确信息，都是一次去污名。你不需要成为专家，只需要把正确的信息递给下一个人。',
        ],
      },
      {
        compact: true,
        lines: [
          '📖 书籍',
          '- 《NeuroTribes》（神经部落）— Steve Silberman',
          '- 《The Reason I Jump》（我跳起来的原因）— 东田直树',
          '🎬 纪录片',
          '- 《The Reason I Jump》（2020）',
          '- 《Life, Animated》（生活，动画）（2016）',
          '🌐 网站',
          '- thetransmitter.org/spectrum（国际ASD研究资讯）',
          '- 中国精协孤独症工作委员会（cafsn.cn）',
        ],
      },
      {
        compact: true,
        lines: [
          '🤝 壹基金海洋天堂计划',
          '国内规模最大的自闭症公益项目之一，提供直接服务、公众教育和政策倡导。',
          '🏫 星星雨教育研究所（北京）',
          '中国第一家自闭症儿童教育机构，为家长提供专业培训。',
          '📱 ALSOLIFE',
          '为自闭症家庭提供在线评估、干预指导和社区支持的平台。',
          '💡 各地自闭症家长组织',
          '搜索你所在城市的自闭症家长互助会。他们最需要的不一定是捐款——有时只是有人愿意了解。',
        ],
      },
    ];
  }

  playAnimatedEpilogue(onDone) {
    this.children.removeAll(true);
    this.storyBg?.destroy?.();
    this.storyPortrait?.destroy?.();
    AudioManager.playBgm('title_bgm');

    const W = this.scale.width;
    const H = this.scale.height;
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 1).setDepth(0);
    this.createEpilogueSkyEffects(W, H);

    const pages = this.getEpiloguePages();
    let pageIndex = 0;
    let active = [];
    let locked = false;

    const clearActive = () => {
      active.forEach((obj) => obj?.destroy?.());
      active = [];
    };

    const showReturnButton = () => {
      makeStartButton(this, W / 2, H - 74, 300, 56, '返回标题', () => {
        onDone?.();
      }, { primary: true, fontSize: '23px' }).setDepth(20);
    };

    const showPage = () => {
      locked = true;
      clearActive();

      const page = pages[pageIndex] ?? { lines: [] };
      const lines = page.lines ?? [];
      const text = this.add.text(W / 2, H / 2, lines.join(page.compact ? '\n' : '\n\n'), {
        fontFamily: '"MaokenZhuyuan", "Microsoft YaHei", "PingFang SC", sans-serif',
        fontSize: pageIndex === 0 ? '25px' : page.compact ? '20px' : '21px',
        color: '#fff3c7',
        align: 'center',
        lineSpacing: page.compact ? 8 : 10,
        wordWrap: { width: Math.min(1020, W - 80), useAdvancedWrap: true },
      }).setOrigin(0.5).setAlpha(0).setDepth(10);
      text.setShadow(0, 2, '#2a1604', 5, true, true);

      active.push(text);

      this.tweens.add({
        targets: text,
        alpha: 1,
        duration: 1500,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          locked = false;
          if (pageIndex === pages.length - 1) {
            showReturnButton();
          }
        },
      });
    };

    this.input.once('pointerdown', () => {});
    this.input.on('pointerdown', () => {
      if (locked || pageIndex >= pages.length - 1) return;
      locked = true;
      this.tweens.add({
        targets: active,
        y: '-=18',
        alpha: 0,
        duration: 360,
        ease: 'Sine.easeIn',
        onComplete: () => {
          pageIndex += 1;
          showPage();
        },
      });
    });

    showPage();
  }

  playEndingChapterTitle(title, onDone) {
    if (!title) {
      onDone?.();
      return;
    }

    this.children.removeAll(true);
    this.storyBg?.destroy?.();
    this.storyPortrait?.destroy?.();

    const W = this.scale.width;
    const H = this.scale.height;
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 1).setDepth(0);
    this.createEpilogueSkyEffects(W, H, { loopMeteors: false });

    const text = this.add.text(W / 2, H / 2, title, {
      fontFamily: '"MaokenZhuyuan", "Microsoft YaHei", "PingFang SC", sans-serif',
      fontSize: '36px',
      color: '#fff3c7',
      align: 'center',
    }).setOrigin(0.5).setAlpha(0).setDepth(10);
    text.setShadow(0, 2, '#2a1604', 6, true, true);

    const hit = this.add.zone(W / 2, H / 2, W, H)
      .setInteractive({ useHandCursor: true })
      .setDepth(11);

    let ready = false;
    let leaving = false;

    this.tweens.add({
      targets: text,
      alpha: 1,
      duration: 900,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        ready = true;
      },
    });

    const proceed = () => {
      if (!ready || leaving) return;
      leaving = true;
      hit.off('pointerdown', proceed);
      this.tweens.add({
        targets: text,
        alpha: 0,
        duration: 360,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          hit.destroy();
          onDone?.();
        },
      });
    };

    hit.on('pointerdown', proceed);
  }

  createEpilogueSkyEffects(W, H, opts = {}) {
    const sky = this.add.container(0, 0).setDepth(1);

    const starPalette = [0xf8f0d8, 0xd8e6ff, 0xffffff];
    for (let i = 0; i < 92; i += 1) {
      const x = Phaser.Math.Between(30, W - 30);
      const y = Phaser.Math.Between(18, H - 18);
      const radius = Phaser.Math.FloatBetween(1.1, 2.5);
      const alpha = Phaser.Math.FloatBetween(0.25, 0.68);
      const star = this.add.circle(x, y, radius, starPalette[i % starPalette.length], alpha);
      sky.add(star);
      this.tweens.add({
        targets: star,
        alpha: alpha * Phaser.Math.FloatBetween(0.35, 0.62),
        duration: Phaser.Math.Between(1800, 3600),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: Phaser.Math.Between(0, 2200),
      });
    }

    const dust = this.add.graphics();
    dust.fillStyle(0x29486f, 0.10);
    for (let i = 0; i < 34; i += 1) {
      dust.fillCircle(
        Phaser.Math.Between(0, W),
        Phaser.Math.Between(0, H),
        Phaser.Math.FloatBetween(1, 2.4)
      );
    }
    sky.add(dust);

    const planet = this.add.container(118, H - 74).setAlpha(0.58);
    const halo = this.add.circle(0, 0, 76, 0x5f83b8, 0.08);
    const body = this.add.circle(0, 0, 48, 0x24476f, 0.72);
    const shade = this.add.circle(15, -8, 45, 0x0a1226, 0.26);
    const ring = this.add.ellipse(0, 3, 132, 30, 0xb7c7da, 0.18)
      .setStrokeStyle(2, 0xd8e6ff, 0.16);
    const bandA = this.add.ellipse(-6, -10, 82, 12, 0xd7b777, 0.13);
    const bandB = this.add.ellipse(5, 14, 74, 10, 0x9bbdd8, 0.12);
    planet.add([halo, ring, body, bandA, bandB, shade]);
    sky.add(planet);

    this.tweens.add({
      targets: planet,
      angle: 360,
      duration: 42000,
      repeat: -1,
      ease: 'Linear',
    });
    this.tweens.add({
      targets: planet,
      y: planet.y - 5,
      duration: 5200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const spawnMeteor = () => {
      if (!this.scene.isActive()) return;
      const meteor = this.add.graphics().setDepth(2).setAlpha(0);
      const startX = Phaser.Math.Between(Math.round(W * 0.58), W + 90);
      const startY = Phaser.Math.Between(28, Math.round(H * 0.36));
      const length = Phaser.Math.Between(90, 150);
      meteor.lineStyle(2, 0xf4e4b6, 0.62);
      meteor.beginPath();
      meteor.moveTo(0, 0);
      meteor.lineTo(length, -length * 0.36);
      meteor.strokePath();
      meteor.fillStyle(0xffffff, 0.72);
      meteor.fillCircle(-2, 1, 2.3);
      meteor.setPosition(startX, startY);
      sky.add(meteor);

      this.tweens.add({
        targets: meteor,
        x: startX - Phaser.Math.Between(280, 420),
        y: startY + Phaser.Math.Between(94, 148),
        alpha: { from: 0, to: 0.72 },
        duration: 980,
        ease: 'Sine.easeOut',
        onComplete: () => {
          this.tweens.add({
            targets: meteor,
            alpha: 0,
            duration: 280,
            onComplete: () => meteor.destroy(),
          });
        },
      });
    };

    const spawnMeteorCluster = () => {
      const count = Phaser.Math.Between(2, 4);
      for (let i = 0; i < count; i += 1) {
        this.time.delayedCall(i * Phaser.Math.Between(260, 520), spawnMeteor);
      }
    };

    spawnMeteorCluster();
    if (opts.loopMeteors !== false) {
      this.time.addEvent({
        delay: 3200,
        loop: true,
        callback: spawnMeteorCluster,
      });
    }

    return sky;
  }

  resetForFinalEndingPlayback() {
    this.children.removeAll(true);
    this.dialog = new DialogBox(this);
    this.choice = new ChoicePanel(this);
    this.story = new StoryPlayer(this, this.dialog);
    this.storyBg?.destroy?.();
    this.storyPortrait?.destroy?.();
    this.storyBg = new StoryBackgroundController(this);
    this.storyPortrait = new StoryPortraitController(this, this.gs);
    this.storyBg.setBackground(ASSET_KEYS.resultBg, false);
  }

  playFinalEnding(weekGoalMet) {
    const sections = this.buildFinalEndingSections(weekGoalMet);

    const playSection = (index) => {
      if (index >= sections.length) {
        unlockActionGuide();
        saveLastGameStats(this.gs);
        this.playAnimatedEpilogue(() => {
          saveLastGameStats(this.gs);
          this.scene.start('StartScene');
        });
        return;
      }

      const section = sections[index];
      const playLines = () => {
        this.resetForFinalEndingPlayback();
        this.story.play([{ type: 'dialog', lines: section.lines }], () => {
          playSection(index + 1);
        });
      };

      if (section.title) {
        this.playEndingChapterTitle(section.title, playLines);
        return;
      }

      playLines();
    };

    playSection(0);
  }

  continueAfterWeek2OrangeFail() {
    this.gs.orange.flags.week2_orange_locked = true;
    if (this.maybePlayWeeklyPreResult()) {
      return;
    }
    this.drawResult();
  }

  continueAfterWeek3OrangeFail() {
    this.gs.orange.flags.week3_orange_locked = true;
    if (this.maybePlayWeeklyPreResult()) {
      return;
    }
    this.drawResult();
  }

  continueAfterWeek4OrangeFail() {
    this.gs.orange.flags.week4_orange_locked = true;
    if (this.maybePlayWeeklyPreResult()) {
      return;
    }
    this.drawResult();
  }

  continueAfterWeek5OrangeFail() {
    this.gs.orange.flags.week5_orange_locked = true;
    if (this.maybePlayWeeklyPreResult()) {
      return;
    }
    this.drawResult();
  }

  maybePlayWeeklyPreResult() {
    const story = getWeeklyResultPreStory(this.gs.day);
    if (!story?.lines?.length) return false;

    this.gs.flags ??= {};
    const flagKey = story.flagKey ?? `week${this.gs.day}_pre_result_story_done`;
    if (this.gs.flags[flagKey]) return false;

    this.showResultBackground();
    this.story.play([
      { type: 'dialog', lines: story.lines },
    ], () => {
      this.gs.flags[flagKey] = true;
      this.drawResult();
    });

    return true;
  }

  drawResult() {
    this.showResultBackground();

    const delta = getParentTrustDeltaFromGroup(this.gs);
    const parentTrustReason = getParentTrustReasonFromGroup(this.gs);
    this.gs.parentTrust = clampParentTrust((this.gs.parentTrust || 0) + delta);

    const parentMessageCounts = getEffectiveParentMessageCounts(
      this.gs.parentTrust,
      getParentAiTriggeredCommunicationCount(this.gs, this.gs.day),
    );
    const complaintKey = `${this.gs.day}_parent_complaint_done`;
    const complaintHandled = Boolean(this.gs.dayProgress?.freeActionDone?.[complaintKey]);
    const hasUnhandledComplaint = parentMessageCounts.complaints > 0 && !complaintHandled;
    const hasUnhandledParentAiComplaint = getPendingParentAiOutcomes(this.gs, { week: this.gs.day })
      .some((outcome) => outcome.parentCommunicationType === 'complaint');
    if (hasUnhandledComplaint || hasUnhandledParentAiComplaint) {
      this.gs.reputation -= 5;
    }

    const eventResult = evaluateDayEnd(this.gs, hasUnhandledComplaint || hasUnhandledParentAiComplaint);
    const fixedLines = DIALOGS_FIXED.day1.result.summaries?.[this.gs.day]
      ?? DIALOGS_FIXED.day1.result.summary;
    const eventLines = getByPath(DIALOGS_EVENTS, eventResult.dialogKey, ['[事件结算 - 待写]']);
    const weekConfig = getWeekConfig(this.gs.day);
    const weekGoalMet = isWeekGoalMet(this.gs);
    if (!weekGoalMet && this.gs.day < 7) {
      AudioManager.playBgm('pressure_bgm');
    }
    const goals = weekConfig?.goals ?? ['[本周目标占位 - 待配置]'];

    // 绘制背板 (奶油浅棕色，低透明度)
    const bg = this.add.graphics();
   bg.fillStyle(0xfff7df, 0.84);
    bg.fillRoundedRect(LAYOUT.PANEL_X - LAYOUT.PANEL_W / 2, LAYOUT.PANEL_Y, LAYOUT.PANEL_W, LAYOUT.PANEL_H, 20);

    makeLabel(this, GAME_W / 2, LAYOUT.TITLE_Y, `第 ${this.gs.day} 周结算`, {
      fontSize: '30px',
      align: 'center',
      color: '#ffffff',
    }).setOrigin(0.5).setShadow(0, 2, '#000000', 4, true, true);

    const summary = [
      `第 ${this.gs.day} 周任务状态：${weekGoalMet ? '已完成，可进入下一周。' : '未完成，请重试。'}`,
      '',
      ...fixedLines,
      '',
      ...eventLines,
      `${parentTrustReason} 家长信任 ${delta >= 0 ? '+' : ''}${delta}`,
    ];


   const textAreaX = LAYOUT.PANEL_X - LAYOUT.PANEL_W / 2 + 40;
const textAreaY = LAYOUT.TEXT_Y;
const textAreaW = LAYOUT.PANEL_W - 112;
const textAreaH = LAYOUT.BUTTON_Y - LAYOUT.TEXT_Y - 60; // 给按钮留空间

const summaryText = this.add.text(textAreaX + textAreaW / 2, 0, summary.join('\n'), {
  ...TEXT_STYLE,
  fontSize: '21px',
  align: 'center',
  color: '#5b3419',
  stroke: '#fff8e6',
  strokeThickness: 4,
  lineSpacing: LAYOUT.LINE_GAP,
  wordWrap: { width: textAreaW, useAdvancedWrap: true },
}).setOrigin(0.5, 0).setDepth(2);

const summaryContainer = this.add.container(0, textAreaY, [summaryText]).setDepth(2);

// 做一个遮罩，只显示固定区域里的正文
const maskGraphics = this.make.graphics();
maskGraphics.fillStyle(0xffffff, 1);
maskGraphics.fillRect(textAreaX, textAreaY, textAreaW, textAreaH);
const textMask = maskGraphics.createGeometryMask();
summaryContainer.setMask(textMask);

// 滚动逻辑
const maxScroll = Math.max(0, summaryText.height - textAreaH);
let scrollY = 0;
const trackX = textAreaX + textAreaW + 28;
const trackY = textAreaY;
const trackW = LAYOUT.SCROLLBAR_W;
const trackH = textAreaH;
const thumbMinH = 54;
const thumbH = maxScroll > 0
  ? Phaser.Math.Clamp((textAreaH / summaryText.height) * trackH, thumbMinH, trackH)
  : trackH;
const maxThumbTravel = Math.max(0, trackH - thumbH);
const scrollBar = this.add.graphics().setDepth(3);
const scrollHit = this.add.zone(trackX, trackY + trackH / 2, 44, trackH)
  .setInteractive({ useHandCursor: maxScroll > 0 })
  .setDepth(4);
const thumbHit = this.add.zone(trackX, trackY + thumbH / 2, 44, thumbH)
  .setInteractive({ useHandCursor: maxScroll > 0 })
  .setDepth(5);

if (maxScroll > 0) {
  this.input.setDraggable(thumbHit);
}

const drawScrollBar = () => {
  const ratio = maxScroll > 0 ? scrollY / maxScroll : 0;
  const thumbY = trackY + ratio * maxThumbTravel;
  scrollBar.clear();
  scrollBar.fillStyle(0xb8894a, 0.10);
  scrollBar.fillRoundedRect(trackX - trackW / 2 + 1, trackY + 1, trackW, trackH, trackW / 2);
  scrollBar.fillStyle(0xf9e1b6, 0.58);
  scrollBar.fillRoundedRect(trackX - trackW / 2, trackY, trackW, trackH, trackW / 2);
  scrollBar.lineStyle(1, 0xd9a15f, 0.34);
  scrollBar.strokeRoundedRect(trackX - trackW / 2, trackY, trackW, trackH, trackW / 2);

  if (maxScroll <= 0) return;

  scrollBar.fillStyle(0xb8894a, 0.14);
  scrollBar.fillRoundedRect(trackX - trackW / 2 + 1, thumbY + 2, trackW, thumbH, trackW / 2);
  scrollBar.fillStyle(0xf0bd74, 0.82);
  scrollBar.fillRoundedRect(trackX - trackW / 2, thumbY, trackW, thumbH, trackW / 2);
  scrollBar.lineStyle(1, 0xc88a4a, 0.34);
  scrollBar.strokeRoundedRect(trackX - trackW / 2, thumbY, trackW, thumbH, trackW / 2);
  thumbHit.y = thumbY + thumbH / 2;
};

const applyScroll = () => {
  scrollY = Phaser.Math.Clamp(scrollY, 0, maxScroll);
  summaryContainer.y = textAreaY - scrollY;
  drawScrollBar();
};

applyScroll();

this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
  const inside =
    pointer.x >= textAreaX &&
    pointer.x <= textAreaX + textAreaW &&
    pointer.y >= textAreaY &&
    pointer.y <= textAreaY + textAreaH;

  if (!inside || maxScroll <= 0) return;

  scrollY += deltaY * 0.6;
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

    if (this.gs.day >= 7) {
      makeButton(this, GAME_W / 2, LAYOUT.BUTTON_Y, 220, 44, '查看最终结局', () => {
        this.playFinalEnding(weekGoalMet);
      }, { fontSize: '17px', fill: 0xfffbeb, hover: 0xfef3c7 }).setDepth(10);
      return;
    }

    if (weekGoalMet && this.gs.day < 7) {
      makeButton(this, GAME_W / 2, LAYOUT.BUTTON_Y, 220, 44, '进入下一周', () => {
        this.finalizeSkippedOrangeResult();
        const updatedGs = advanceToNextWeek(this.gs);
        this.scene.start('OfficeScene', { gs: updatedGs });
      }, { fontSize: '17px', fill: 0xfffbeb, hover: 0xfef3c7 }).setDepth(10);
      return;
    }

    if (weekGoalMet && this.gs.day >= 7) {
      // 通关：解锁行动指南 + 保存玩家数据
      unlockActionGuide();
      saveLastGameStats(this.gs);
      makeButton(this, GAME_W / 2, LAYOUT.BUTTON_Y, 200, 44, '返回标题', () => {
        saveLastGameStats(this.gs);
        this.scene.start('StartScene');
      }, { fontSize: '17px', fill: 0xffffff, hover: 0xe5e7eb }).setDepth(10);
      return;
    }

    makeButton(this, GAME_W / 2, LAYOUT.BUTTON_Y, 200, 44, '返回标题', () => {
      saveLastGameStats(this.gs);
      this.scene.start('StartScene');
    }, { fontSize: '17px', fill: 0xffffff, hover: 0xe5e7eb }).setDepth(10);
  }

  finalizeSkippedOrangeResult() {
    const week = Number(this.gs.day);
    if (!Number.isFinite(week) || week <= 1) return;
    if (!getOrangeLocation(week)) return;
    this.gs.orange ??= {};
    this.gs.orange.flags ??= {};
    const key = `week${week}_orange_result`;
    if (this.gs.orange.flags[key]) return;
    this.gs.orange.flags[key] = 'fail';
    this.gs.orange.flags[`week${week}_orange_locked`] = true;
  }
}
