import Phaser from 'phaser';
import { ASSET_KEYS, ASSET_PATHS, CONTENT_CENTER_X, CONTENT_OFFSET_X, CONTENT_W, contentX } from '../core/Constants.js';
import { applyEffects, getCurrentWeek, normalizeState, setResumeScene } from '../core/GameState.js';
import { DIALOGS_FIXED, WEEK5_PARENT_OBSERVATION_CHOICE, WEEK6_RECORD_ORGANIZATION_CHOICE, WEEK7_SUPPORT_PLAN_CHOICE, getWeeklyFixedDialog } from '../data/dialogs_fixed.js';
import { DIALOGS_ACTIONS } from '../data/dialogs_actions.js';
import { CONSTRUCTION_PROJECTS } from '../data/constructionProjects.js';
import { DIRECTOR_ADVICE_POOL } from '../data/directorAdvicePool.js';
import { DIRECTOR_CHAT_DIALOGS, DIRECTOR_CHAT_LOCKED_LINES } from '../data/dialogs_directorChats.js';
import { ASD_COURSE_QUESTIONS } from '../data/asdCourseQuestions.js';
import { DAILY_TALK_POOL, PARENT_COMPLAINT_POOL } from '../data/parentMessages.js';
import { WEEK1_ORANGE_STORY } from '../data/week1OrangeStory.js';
import { WEEK2_ORANGE_STORY } from '../data/week2OrangeStory.js';
import { WEEK3_ORANGE_STORY } from '../data/week3OrangeStory.js';
import { WEEK4_ORANGE_STORY } from '../data/week4OrangeStory.js';
import { WEEK5_ORANGE_STORY } from '../data/week5OrangeStory.js';
import {
  getEffectiveParentMessageCounts,
  getParentAiTriggeredCommunicationCount,
  pickRandomMessages,
  clampParentTrust,
  getParentTrustDeltaFromGroup,
  getParentTrustReasonFromGroup,
} from '../core/ParentTrustSystem.js';
import HUD from '../ui/HUD.js';
import DialogBox from '../ui/DialogBox.js';
import ChoicePanel from '../ui/ChoicePanel.js';
import StoryPlayer from '../ui/StoryPlayer.js';
import KnowledgeCardPanel from '../ui/KnowledgeCardPanel.js';
import { makeButton, makeCoverBackground, makeLabel } from '../ui/widgets.js';
import { getKnowledgeCard, unlockGlobalKnowledgeCard } from '../data/knowledgeCards.js';
import { getByPath } from '../core/ValueSystem.js';
import ResourceManager from '../core/ResourceManager.js';
import StoryBackgroundController from '../ui/StoryBackgroundController.js';
import StoryPortraitController from '../ui/StoryPortraitController.js';
import TutorialOverlay from '../ui/TutorialOverlay.js';
import AudioManager from '../systems/AudioManager.js';
import ComputerPanel from '../ui/ComputerPanel.js';
import ParentChatPanel from '../ui/ParentChatPanel.js';
import {
  applyParentTurnResult,
  buildParentAiSessionKey,
  createParentAiSession,
  getParentAiEventSummary,
  getPendingParentAiOutcomes,
  getPrimaryParentAiTopic,
} from '../../parent-ai-core/index.js';
import { requestParentAiTurn } from '../services/parentAiClient.js';

export default class OfficeScene extends Phaser.Scene {
  constructor() {
    super('OfficeScene');
  }

  init(data) {
    this._resetRuntimeUiState();
    this.gs = normalizeState(data?.gs);
    setResumeScene(this.gs, this.sys.settings.key);
  }

  preload() {
    ResourceManager.queueImage(this, ASSET_KEYS.office, ASSET_PATHS.office);
    ResourceManager.queueImage(this, 'chenlan_old_photo', '/assets/collections/cg/chenlan_old_photo.png');
    ResourceManager.queueImage(this, 'computer_panel', '/assets/ui/computer/computer_panel.png');
    ResourceManager.queueImage(this, 'computer_icon_build_room', '/assets/ui/computer/icon_build_room.png');
    ResourceManager.queueImage(this, 'computer_icon_asd_course', '/assets/ui/computer/icon_asd_course.png');
    ResourceManager.queueImage(this, 'computer_icon_fundraising', '/assets/ui/computer/icon_fundraising.png');
    ResourceManager.queueImage(this, 'computer_icon_parent_chat', '/assets/ui/computer/icon_parent_chat.png');
    ResourceManager.queueImage(this, 'computer_icon_close', '/assets/ui/computer/icon_close.png');
    ResourceManager.queueImage(this, 'chat_panel', '/assets/ui/chat_panel.png');
    ResourceManager.queueImage(this, 'chat_panel_empty', '/assets/ui/chat_panel_empty.png');
    ResourceManager.queueImage(this, 'chat_send_button', '/assets/ui/chat_send_button.png');
    ResourceManager.queueImage(this, 'chat_player_avatar', '/assets/ui/player.png');
    ResourceManager.queueImage(this, 'chat_close', '/assets/ui/chat_close.png');
  }

  create() {
    AudioManager.playBgm('daily_bgm');
    this._resetRuntimeUiState();
    this.hud = new HUD(this, this.gs);
    this.dialog = new DialogBox(this);
    this.choice = new ChoicePanel(this);
    this.story = new StoryPlayer(this, this.dialog);
    this.knowledgeCard = new KnowledgeCardPanel(this);
    this.storyBg = new StoryBackgroundController(this);
    this.storyPortrait = new StoryPortraitController(this, this.gs);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this._tutorialPreviewButton?.destroy();
      this._computerPanel?.destroy();
      this._parentChatPanel?.destroy();
      this.tutorialOverlay?.destroy();
      this._startFixedButton?.destroy();
      this._skipFixedButton?.destroy();
      this.storyBg?.destroy();
      this.storyPortrait?.destroy();
      this.knowledgeCard?.destroy();
      this._resetRuntimeUiState();
    });

    this._ensureWeekPackReady(() => {
      // arrival 阶段背景由 storyBg 接管（从走廊→活动室→office2）。
      // 其他阶段（fixed / free / weekIntro）直接铺 office2 静态背景。
      if (this.gs.flags.day1OfficeIntroPlayed) {
        makeCoverBackground(this, ASSET_KEYS.office, 0.06);
      }

      this.drawOfficeHotspots();
      this.routeByPhase();
    });
  }

  _getCurrentWeek() {
    return getCurrentWeek(this.gs);
  }

  _showOfficeLoadingOverlay(text = '正在进入照护所...') {
    const w = this.scale.width;
    const h = this.scale.height;
    const container = this.add.container(0, 0).setDepth(160);

    const shade = this.add.rectangle(w / 2, h / 2, w, h, 0x0f172a, 0.38);
    const panel = this.add.rectangle(w / 2, h / 2, 360, 88, 0x1f2937, 0.84)
      .setStrokeStyle(2, 0xe5e7eb, 0.4);
    const label = this.add.text(w / 2, h / 2, text, {
      fontFamily: '"MaokenZhuyuan", "Microsoft YaHei", sans-serif',
      fontSize: '20px',
      color: '#f9fafb',
    }).setOrigin(0.5);

    container.add([shade, panel, label]);
    return container;
  }

  _ensureWeekPackReady(onReady) {
    const week = this._getCurrentWeek();
    const packName = ResourceManager.getPackNameForWeek?.(week) || `week${week || 1}`;

    const overlay = this._showOfficeLoadingOverlay('正在进入照护所...');

    ResourceManager.loadPack(this, packName, {
      silent: true,
    })
      .catch(() => {
        // silent 模式下通常不会抛，兜底继续流程
      })
      .finally(() => {
        overlay?.destroy();
        onReady?.();
      });
  }

  _resetRuntimeUiState() {
    this._startFixedButtonsShown = false;
    this._startFixedButton = null;
    this._skipFixedButton = null;
    this._tutorialPreviewButton = null;
    this.tutorialOverlay = null;
    this._computerPanel = null;
    this._activeParentAiSessionId = null;
    this._parentAiPendingTurns ??= new Map();
  }

  routeByPhase() {
    const phase = this.gs.dayProgress.phase;
    const checkpoint = this._getDay1OfficeIntroCheckpoint();

    if (checkpoint?.mode === 'greeting' || checkpoint?.mode === 'todayFlow') {
      this.showArrivalOffice();
      return;
    }

    if (phase === 'weekIntro' && this.gs.day >= 2 && this.gs.day <= 7) {
      this.showWeekIntroOffice();
      return;
    }

    if (phase === 'free') {
      this.showFreePhaseOffice();
      return;
    }

    if (phase === 'fixedEntry' || phase === 'fixed') {
      this.showFixedEntryOffice();
      return;
    }

    this.showArrivalOffice();
  }

  drawOfficeHotspots() {
    makeLabel(this, CONTENT_CENTER_X, 95, '教师办公室', {
      fontSize: '28px',
      align: 'center',
      color: '#ffffff',
    }).setOrigin(0.5).setShadow(0, 2, '#000000', 4, true, true);


  }

  playStoryLines(lines, onDone, opts = {}) {
    this.story.play([{ type: 'dialog', lines, opts }], onDone);
  }

  /**
   * 通用：把一组 lines 按 __BG:xxx__ marker 分段。
   * 同时过滤指定的占位标记。
   *
   * @param {string[]} rawLines        - 原始台词数组
   * @param {object}   [opts]
   * @param {string[]} [opts.stripMarkers] - 要完全过滤掉的占位标记（如 '__STAMP_EASTER_EGG__'）
   * @returns {{ bgKey: string|null, lines: string[] }[]}
   */
  _splitSegments(rawLines, { stripMarkers = [] } = {}) {
    const segments = [];
    let pendingBgKey = null;
    let pendingPortraitCmds = [];

    for (const line of rawLines) {
      if (stripMarkers.includes(line)) continue;

      if (this.storyBg?.isBgMarker(line)) {
        pendingBgKey = line.trim().replace(/^__BG:/, '').replace(/__$/, '');
        continue;
      }

      if (this.storyPortrait?.isPortraitMarker(line)) {
        pendingPortraitCmds.push(line.trim());
        continue;
      }

      const resolved = line.replace(/\{player\.name\}/g, '你');
      const portraitCmds = [...pendingPortraitCmds];
      const autoCmd = this.storyPortrait?.getAutoCommandForLine?.(resolved);
      if (autoCmd) {
        portraitCmds.push(autoCmd);
      }

      segments.push({
        bgKey: pendingBgKey,
        portraitCmds,
        lines: [resolved],
      });

      pendingBgKey = null;
      pendingPortraitCmds = [];
    }

    if (pendingBgKey !== null || pendingPortraitCmds.length > 0) {
      segments.push({
        bgKey: pendingBgKey,
        portraitCmds: pendingPortraitCmds,
        lines: [],
      });
    }

    return segments;
  }

  // 构建 directorGreeting 台词：处理占位标记 + 条件追加印章彩蛋
  // 只负责拼接文本，不修改任何 gs 状态。
  // 返回 { segments, hasEasterEgg }
  _buildDirectorGreeting() {
    const raw = DIALOGS_FIXED.day1.office.directorGreeting;

    const hasEasterEgg =
      this.gs.player?.prologueLetterReaction === 'curious' &&
      !this.gs.flags?.prologueStampBonusGiven;

    const expanded = [...raw];
    if (hasEasterEgg) {
      // 把彩蛋行插入到 __STAMP_EASTER_EGG__ 位置（替换标记）
      const eggIdx = expanded.indexOf('__STAMP_EASTER_EGG__');
      const eggLines = [
        '你想起信封上那枚橙色印章。',
        '【你】那个星星印章……',
        '陈岚停了一下，转过来看你。',
        '【陈岚】你注意到了？那是照护所第一批孩子帮我设计的。七年前了。',
        '所长好感度+5',
      ];
      if (eggIdx >= 0) {
        expanded.splice(eggIdx, 1, ...eggLines);
      } else {
        expanded.push(...eggLines);
      }
    }

    const segments = this._splitSegments(expanded, { stripMarkers: ['__STAMP_EASTER_EGG__'] });
    return { segments, hasEasterEgg };
  }

  _getDay1OfficeIntroCheckpoint() {
    const checkpoint = this.gs.flags?.day1OfficeIntroCheckpoint;
    return checkpoint && typeof checkpoint === 'object' ? checkpoint : null;
  }

  _setDay1OfficeIntroCheckpoint(checkpoint) {
    this.gs.flags ??= {};
    this.gs.flags.day1OfficeIntroCheckpoint = checkpoint;
  }

  _clearDay1OfficeIntroCheckpoint() {
    if (this.gs.flags?.day1OfficeIntroCheckpoint) {
      delete this.gs.flags.day1OfficeIntroCheckpoint;
    }
  }

  _showFixedEntryBackground() {
    makeCoverBackground(this, ASSET_KEYS.office, 0.06);
    this._startFixedButtonsShown = false;
  }

  _restoreGreetingBackgroundForResume(steps, index) {
    let bgKey = null;
    for (let i = 0; i < index; i += 1) {
      if (steps[i]?._bgKey) {
        bgKey = steps[i]._bgKey;
      }
    }
    if (bgKey) {
      this.storyBg?.setBackground(bgKey, false);
    }
  }

  showArrivalOffice() {
    const checkpoint = this._getDay1OfficeIntroCheckpoint();

    if (checkpoint?.mode === 'todayFlow') {
      this.gs.flags.day1OfficeIntroPlayed = true;
      this.gs.dayProgress.phase = 'officeStory';
      this._playTodayFlowIntroWithTutorial();
      return;
    }

    if (this.gs.flags.day1OfficeIntroPlayed) {
      this._clearDay1OfficeIntroCheckpoint();
      this.showFixedEntryOffice();
      return;
    }

    const { segments: greetingSegs, hasEasterEgg } = this._buildDirectorGreeting();
    const arrivalSegs  = this._splitSegments(DIALOGS_FIXED.day1.office.arrival);

    // 把分段数组转为 step 列表（保留有 bgKey / portraitCmds 的段以触发切换）
    const toSteps = (segs) => segs.map((seg) => ({
      lines:         seg.lines,
      _bgKey:        seg.bgKey,
      _portraitCmds: seg.portraitCmds,
    }));

    const onAllDone = () => {
      if (hasEasterEgg && !this.gs.flags?.prologueStampBonusGiven) {
        this.gs.director.affection += 5;
        this.gs.flags.prologueStampBonusGiven = true;
      }
      this.gs.flags.day1OfficeIntroPlayed = true;
      this.gs.dayProgress.phase = 'officeStory';
      this._playTodayFlowIntroWithTutorial();
    };

    // 三组 step 串联：arrival → directorGreeting → todayFlowIntro
    const allSteps = [
      ...toSteps(arrivalSegs),
      ...toSteps(greetingSegs),
    ];

    const startIndex = checkpoint?.mode === 'greeting'
      ? Phaser.Math.Clamp(Number(checkpoint.index) || 0, 0, allSteps.length)
      : 0;

    if (startIndex > 0) {
      this._restoreGreetingBackgroundForResume(allSteps, startIndex);
    }

    this._playGreetingSegments(allSteps, startIndex, onAllDone, { checkpointMode: 'greeting' });
  }

  /**
   * 递归按段播放，每段开始前触发背景切换（若有 bgKey）。
   * 跳过没有台词的纯背景切换段（仍然触发背景切换）。
   */
  _playGreetingSegments(steps, index, onDone, options = {}) {
    if (index >= steps.length) {
      this.storyPortrait?.clearAll?.(true);
      onDone?.();
      return;
    }
    const step = steps[index];
    if (options.checkpointMode === 'greeting') {
      this._setDay1OfficeIntroCheckpoint({ mode: 'greeting', index });
    }

    // 背景切换
    if (step._bgKey) {
      this.storyBg?.setBackground(step._bgKey, true);
    }

    // 立绘指令（与背景切换并行，不阻塞对话流程）
    if (step._portraitCmds?.length) {
      this.storyPortrait?.applyCommands(step._portraitCmds);
    }

    if (!step.lines || step.lines.length === 0) {
      // 纯切换段（无台词），直接推进
      this._playGreetingSegments(steps, index + 1, onDone, options);
      return;
    }

    this.playStoryLines(step.lines, () => {
      this._playGreetingSegments(steps, index + 1, onDone, options);
    }, {
      onSkip: () => this._playGreetingSegments(steps, steps.length, onDone, options),
    });
  }

  _getDay1OfficeTutorialSteps() {
    const tutorialSteps = [
      {
        rect: { x: 10, y: 0, w: 1120, h: 55 },
        text: '\u53ef\u4ee5\u968f\u65f6\u67e5\u770b\u7167\u62a4\u6240\u5f53\u524d\u72b6\u6001\uff1a\u8d44\u91d1\u3001\u540d\u671b\u3001\u884c\u52a8\u529b\u3001\u5b69\u5b50\u4fe1\u4efb\u548c\u538b\u529b\u3002',
      },
      {
        rect: { x: 780, y: 0, w: 120, h: 55 },
        text: '\u4efb\u52a1\u63d0\u793a\u4eca\u5929\u6700\u8be5\u5173\u6ce8\u7684\u76ee\u6807\u3002\u6ce8\u610f\u5b8c\u6210\u4efb\u52a1\uff0c\u624d\u80fd\u6210\u529f\u89e3\u9501\u4e0b\u4e00\u5468\u3002',
      },
      {
        rect: { x: contentX(100), y: 265, w: 150, h: 70 },
        text: '\u53ef\u4ee5\u6765\u627e\u9648\u5c9a\u804a\u5929\u3002\u804a\u5929\u4f1a\u6d88\u8017\u884c\u52a8\u529b\uff0c\u4f46\u80fd\u83b7\u5f97\u5efa\u8bae\uff0c\u4e5f\u53ef\u80fd\u63d0\u5347\u4e13\u4e1a\u7406\u89e3\u3002',
        previewButton: { x: contentX(178), y: 300, w: 112, h: 52, label: '\u6240\u957f' },
      },
      {
        rect: { x: contentX(588), y: 270, w: 150, h: 70 },
        text: '\u7535\u8111\u91cc\u6709\u8bfe\u7a0b\u3001\u623f\u95f4\u5efa\u8bbe\u3001\u516c\u76ca\u76f4\u64ad\u548c\u5bb6\u957f\u6c9f\u901a\u3002\u5bb6\u957f\u6295\u8bc9\u5c24\u5176\u8981\u8bb0\u5f97\u5904\u7406\uff0c\u957f\u671f\u6ca1\u4eba\u56de\u590d\u4f1a\u5f71\u54cd\u7167\u62a4\u6240\u4fe1\u4efb\u3002',
        previewButton: { x: contentX(662), y: 306, w: 116, h: 50, label: '\u7535\u8111' },
      },
      {
        rect: { x: contentX(355), y: 480, w: 250, h: 70 },
        text: '\u4ece\u8fd9\u91cc\u8fdb\u5165\u56fa\u5b9a\u7167\u62a4\u5b89\u6392\u3002\u6bcf\u5468\u5c3d\u91cf\u4e0d\u8981\u91cd\u590d\u5b89\u6392\u540c\u4e00\u79cd\u56fa\u5b9a\u6d3b\u52a8\uff1b\u4e0d\u540c\u623f\u95f4\u4f1a\u7ec3\u4e60\u4e0d\u540c\u7167\u62a4\u4e3b\u9898\u3002',
      },
    ];

    return tutorialSteps;
  }

  _playTodayFlowIntroWithTutorial(onDone) {
    this.gs.flags.day1OfficeIntroPlayed = true;
    this.gs.dayProgress.phase = 'officeStory';
    this.storyBg?.setBackground('chapter1_office', false);

    const raw = DIALOGS_FIXED.day1.office.todayFlowIntro;
    const tutorialSteps = this._getDay1OfficeTutorialSteps();
    const script = [
      { lines: raw.slice(0, 5), tutorial: tutorialSteps[0] },
      { lines: raw.slice(5, 6), tutorial: tutorialSteps[1] },
      { lines: raw.slice(6, 7), tutorial: tutorialSteps[2] },
      { lines: raw.slice(7, 11), tutorial: tutorialSteps[3] },
      {
        lines: raw.slice(11),
        beforeTutorial: () => {
          this.storyPortrait?.clearAll?.(true);
          this.gs.dayProgress.phase = 'fixedEntry';
          this._showFixedEntryBackground();
          this.showStartFixedActionButton();
        },
        tutorial: tutorialSteps[4],
      },
    ];

    const resume = this._getDay1OfficeIntroCheckpoint()?.mode === 'todayFlow'
      ? this._getDay1OfficeIntroCheckpoint()
      : null;
    const startIndex = resume
      ? Phaser.Math.Clamp(Number(resume.scriptIndex) || 0, 0, script.length)
      : 0;

    const run = (index, resumeState = null) => {
      if (index >= script.length) {
        this.gs.flags.day1OfficeIntroPlayed = true;
        this._clearDay1OfficeIntroCheckpoint();
        this.showKnowledgeCard('beforeFixed', () => {
          this.showFixedEntryOffice();
          onDone?.();
        });
        return;
      }

      const step = script[index];
      const segments = this._splitSegments(step.lines);

      const showTutorial = () => {
        this._setDay1OfficeIntroCheckpoint({
          mode: 'todayFlow',
          scriptIndex: index,
          segmentIndex: segments.length,
          tutorial: true,
        });
        step.beforeTutorial?.();
        this._showTutorialStep(step.tutorial, () => run(index + 1));
      };

      if (resumeState?.scriptIndex === index && resumeState.tutorial) {
        showTutorial();
        return;
      }

      const segmentIndex = resumeState?.scriptIndex === index
        ? Phaser.Math.Clamp(Number(resumeState.segmentIndex) || 0, 0, segments.length)
        : 0;

      this._playTutorialDialogSegments(segments, segmentIndex, showTutorial, index);
    };

    run(startIndex, resume);
  }

  _playTutorialDialogSegments(segments, index, onDone, scriptIndex = null) {
    if (index >= segments.length) {
      onDone?.();
      return;
    }

    const step = segments[index];
    if (scriptIndex !== null) {
      this._setDay1OfficeIntroCheckpoint({
        mode: 'todayFlow',
        scriptIndex,
        segmentIndex: index,
        tutorial: false,
      });
    }

    if (step.bgKey) {
      this.storyBg?.setBackground(step.bgKey, true);
    }
    if (step.portraitCmds?.length) {
      this.storyPortrait?.applyCommands(step.portraitCmds);
    }

    if (!step.lines || step.lines.length === 0) {
      this._playTutorialDialogSegments(segments, index + 1, onDone, scriptIndex);
      return;
    }

    this.playStoryLines(step.lines, () => {
      this._playTutorialDialogSegments(segments, index + 1, onDone, scriptIndex);
    }, {
      onSkip: () => onDone?.(),
    });
  }

  _showTutorialStep(step, onDone) {
    this.storyPortrait?.clearAll?.(false);
    this._tutorialPreviewButton?.destroy();
    this._tutorialPreviewButton = null;
    if (step.previewButton) {
      const btn = step.previewButton;
      this._tutorialPreviewButton = makeButton(this, btn.x, btn.y, btn.w, btn.h, btn.label, () => {}, {
        disabled: true,
        fontSize: '18px',
        fill: 0xfffbeb,
      }).setDepth(10);
    }

    this.tutorialOverlay?.destroy();
    this.tutorialOverlay = new TutorialOverlay(this, [{ ...step, buttonLabel: '\u77e5\u9053\u4e86' }], () => {
      this._tutorialPreviewButton?.destroy();
      this._tutorialPreviewButton = null;
      this.tutorialOverlay = null;
      onDone?.();
    });
  }

  showWeekIntroOffice() {
    const introLines = getWeeklyFixedDialog(this.gs.day, 'beforeFixed');

    this.story.play([
      { type: 'dialog', lines: introLines },
    ], () => {
      this.showKnowledgeCard('beforeFixed', () => {
        this.showFixedEntryOffice({ refreshBackground: true });
      });
    }, { allowSkip: true });
  }

  showKnowledgeCard(phase, onDone) {
    const card = getKnowledgeCard(this.gs.day, phase);
    if (!card) {
      onDone?.();
      return;
    }

    this.gs.flags ??= {};
    const flagKey = `knowledgeCard_${this.gs.day}_${phase}`;
    if (this.gs.flags[flagKey]) {
      onDone?.();
      return;
    }

    this.knowledgeCard ??= new KnowledgeCardPanel(this);
    this.knowledgeCard.show({
      ...card,
      showArchive: true,
      onClose: () => {
        this.gs.flags[flagKey] = true;
        this.gs.knowledgeCards ??= {};
        this.gs.knowledgeCards.unlocked ??= {};
        this.gs.knowledgeCards.unlocked[card.id] = true;
        unlockGlobalKnowledgeCard(card.id);
        onDone?.();
      },
    });
  }

  showFixedPhaseOffice() {
    this.showFixedEntryOffice();
  }

  showFixedEntryOffice({ refreshBackground = false } = {}) {
    setResumeScene(this.gs, this.sys.settings.key);
    this.gs.dayProgress.phase = 'fixedEntry';
    if (refreshBackground) {
      this._showFixedEntryBackground();
    }
    this.storyPortrait?.clearAll?.(false);
    this.showStartFixedActionButton();
  }

  showStartFixedActionButton() {
    if (this._startFixedButtonsShown) return;
    this._startFixedButtonsShown = true;

    this.storyPortrait?.clearAll?.(false);
    makeButton(this, CONTENT_CENTER_X, 515, 250, 52, '进入固定行动阶段', () => {
      this.gs.dayProgress.phase = 'fixed';
      setResumeScene(this.gs, 'FixedActionScene');
      this.storyPortrait?.clearAll?.(false);
      this.scene.start('FixedActionScene', { gs: this.gs });
    }, { fontSize: '20px', fill: 0xfffbeb, hover: 0xfef3c7 }).setDepth(10);

    makeButton(this, CONTENT_CENTER_X, 575, 250, 42, '跳过固定阶段', () => {
      this.confirmSkipFixedPhase();
    }, { fontSize: '16px', fill: 0xfffbeb, hover: 0xfef3c7 }).setDepth(10);
  }

  confirmSkipFixedPhase() {
    this.choice.showVNChoice(
      ['确认跳过固定行动阶段吗？'],
      [
        { label: '确认跳过', action: () => this.skipFixedPhaseForTest() },
        { label: '再想想', action: () => {} },
      ]
    );
  }

skipFixedPhaseForTest() {
  applyEffects(this.gs, { actionPoints: -4, 'group.trust': 10 });
  this.gs.dayProgress.fixedActionsDone = 3;
  this.gs.dayProgress.phase = 'free';

  this.playStoryLines([
    '（跳过固定行动阶段）',
    '行动力 -4，孩子信任度 +10，孩子压力值不变。',
  ], () => {
    this.storyPortrait?.clearAll?.(false);
    this.scene.start('OfficeScene', { gs: this.gs });
  });
}

  showFreePhaseOffice() {
    this.storyPortrait?.clearAll?.(false);
    const showHub = () => {
      if (this.canShowWeek2OrangeReview()) {
        this.playWeek2OrangeReview();
        return;
      }
      if (this.canShowWeek3OrangeReview()) {
        this.playWeek3OrangeReview();
        return;
      }
      if (this.canShowWeek4FatherCall()) {
        this.playWeek4FatherCall();
        return;
      }
      if (this.canShowWeek5FatherReflection()) {
        this.playWeek5FatherReflection();
        return;
      }
      this.drawFreeHubButtons();
    };
    const flagKey = this.gs.day === 1
      ? 'day1FreePhaseIntroPlayed'
      : `week${this.gs.day}FreePhaseIntroPlayed`;

    if (!this.gs.flags[flagKey]) {
      if (this.gs.day === 5) {
        this.showWeek5ParentObservationChoice(showHub, flagKey);
        return;
      }
      if (this.gs.day === 6) {
        this.showWeek6RecordOrganizationChoice(showHub, flagKey);
        return;
      }
      if (this.gs.day === 7) {
        this.showWeek7SupportPlanChoice(showHub, flagKey);
        return;
      }

      this.story.play([
        { type: 'dialog', lines: getWeeklyFixedDialog(this.gs.day, 'beforeFree') },
      ], () => {
        this.gs.flags[flagKey] = true;
        this.showKnowledgeCard('beforeFree', () => {
          if (this.gs.day === 4 && !this.gs.flags.week4ExhibitionPhotoChoiceDone) {
            this.showWeek4ExhibitionPhotoChoice(showHub);
            return;
          }
          showHub();
        });
      }, { allowSkip: true });
      return;
    }

    if (this.gs.day === 4 && !this.gs.flags.week4ExhibitionPhotoChoiceDone) {
      this.showWeek4ExhibitionPhotoChoice(showHub);
      return;
    }

    showHub();
  }

  showWeek4ExhibitionPhotoChoice(onDone) {
    AudioManager.playBgm('late_night_decision');
    const finish = (choiceId, lines, effects = {}) => {
      this.gs.flags.week4ExhibitionPhotoChoiceDone = true;
      this.gs.flags.week4ExhibitionPhotoChoice = choiceId;
      this.gs.reputation += effects.reputation ?? 0;
      this.gs.attrs ??= {};
      this.gs.attrs.professional = (this.gs.attrs.professional ?? 0) + (effects.professional ?? 0);
      this.hud.update(this.gs);

      const effectLines = [];
      if (effects.reputation) effectLines.push(`名望 +${effects.reputation}`);
      if (effects.professional) effectLines.push(`专业理解 +${effects.professional}`);

      this.story.play([{ type: 'dialog', lines: [
        ...lines,
        ...effectLines,
        '【系统提示】本周有公益平台展示邀约，建议去绘画室处理。',
      ] }], () => {
        AudioManager.playBgm('daily_bgm');
        onDone?.();
      });
    };

    this.choice.showVNChoice(
      ['如果平台现在只要一张图，你先放哪张？'],
      [
        {
          label: '活动室那张',
          action: () => finish('activity_room_photo', [
            '【你】活动室那张。它能让人看见孩子是真的在用卡，不只是我们摆了一套工具。',
            '【周嘉宁】这张确实更容易让外面的人看懂。问题是，哪怕没有拍全脸，它还是某个孩子的具体时刻。',
            '【陈岚】这张如果要用，至少要先问家长，也要想办法让孩子知道，这个画面会被别人看到。不能因为没有正脸，就当成没有人。',
            '【周嘉宁】还有，撤回要容易。如果后来家长或者孩子不愿意，这张图不能已经被放得到处都是。',
            '你点点头，在照片旁边写下：“可用，但需授权；优先做内部备选，不先外发。”',
            '【周嘉宁】你看，展示不是选一张好看的图。每张图都有代价。活动照的代价是边界，环境照的代价是别人不一定看懂。',
            '【周嘉宁】不要只想“这张能不能展示”。还要想：如果不用孩子本人，我们能不能把支持讲清楚；如果用了孩子的片段，我们有没有资格这样做。',
          ], { reputation: 1, professional: 1 }),
        },
        {
          label: '图书室那张',
          action: () => finish('library_photo', [
            '【你】图书室那张。它没有孩子本人，但能说明我们给孩子留了一个可以停住的位置。',
            '【周嘉宁】这张边界风险低，但它不太会自己说话。外面的人可能只看见一个空房间。',
            '【陈岚】所以文字要写清楚。不是“温馨图书角”，而是“孩子可以先站在门口，不被立刻要求进入活动”。不然它就只是一张装修照片。',
            '【周嘉宁】对。环境照不是最安全就自动最好。它需要说明，否则支持会被拍成布置。',
            '你在照片旁边写下：“优先使用；需配说明，解释门口位置和选择卡的作用。”',
            '【周嘉宁】你看，展示不是选一张好看的图。每张图都有代价。活动照的代价是边界，环境照的代价是别人不一定看懂。',
            '【周嘉宁】不要只想“这张能不能展示”。还要想：如果不用孩子本人，我们能不能把支持讲清楚；如果用了孩子的片段，我们有没有资格这样做。',
          ], { professional: 2 }),
        },
      ],
      {
        choiceWidth: 760,
        choiceHeight: 48,
        choiceGap: 14,
        choiceStartY: 260,
        choiceFontSize: '17px',
      }
    );
  }

  showWeek5ParentObservationChoice(onDone, flagKey = 'week5FreePhaseIntroPlayed') {
    const story = WEEK5_PARENT_OBSERVATION_CHOICE;
    const finish = (choice) => {
      this.gs.flags[flagKey] = true;
      this.gs.flags.week5ParentObservationChoiceDone = true;
      this.gs.flags.week5ParentObservationChoice = choice.id;
      this.gs.attrs ??= {};
      this.gs.attrs.professional = (this.gs.attrs.professional ?? 0) + (choice.effects.professional ?? 0);
      this.gs.attrs.communication = (this.gs.attrs.communication ?? 0) + (choice.effects.communication ?? 0);
      this.hud.update(this.gs);

      this.story.play([{ type: 'dialog', lines: [
        ...choice.resultLines,
        ...story.outroLines,
      ] }], () => this.showKnowledgeCard('beforeFree', onDone));
    };

    this.story.play([{ type: 'dialog', lines: story.lines }], () => {
      this.choice.showVNChoice(
        ['这周你更倾向于哪种方式？'],
        story.choices.map((choice) => ({
          label: choice.label,
          action: () => finish(choice),
        })),
        {
          choiceWidth: 820,
          choiceHeight: 52,
          choiceGap: 14,
          choiceStartY: 260,
          choiceFontSize: '17px',
        }
      );
    }, { allowSkip: true });
  }

  showWeek6RecordOrganizationChoice(onDone, flagKey = 'week6FreePhaseIntroPlayed') {
    const story = WEEK6_RECORD_ORGANIZATION_CHOICE;
    const finish = (choice) => {
      this.gs.flags[flagKey] = true;
      this.gs.flags.week6RecordOrganizationChoiceDone = true;
      this.gs.flags.week6RecordOrganizationChoice = choice.id;
      this.gs.attrs ??= {};
      this.gs.attrs.professional = (this.gs.attrs.professional ?? 0) + (choice.effects.professional ?? 0);
      this.gs.attrs.communication = (this.gs.attrs.communication ?? 0) + (choice.effects.communication ?? 0);
      this.hud.update(this.gs);

      this.story.play([{ type: 'dialog', lines: [
        ...choice.resultLines,
        ...story.outroLines,
      ] }], () => this.showKnowledgeCard('beforeFree', onDone));
    };

    this.story.play([{ type: 'dialog', lines: story.lines }], () => {
      this.choice.showVNChoice(
        ['你准备先从哪里开始整理？'],
        story.choices.map((choice) => ({
          label: choice.label,
          action: () => finish(choice),
        })),
        {
          choiceWidth: 820,
          choiceHeight: 52,
          choiceGap: 14,
          choiceStartY: 260,
          choiceFontSize: '17px',
        }
      );
    }, { allowSkip: true });
  }

  showWeek7SupportPlanChoice(onDone, flagKey = 'week7FreePhaseIntroPlayed') {
    const story = WEEK7_SUPPORT_PLAN_CHOICE;
    const finish = (choice) => {
      this.gs.flags[flagKey] = true;
      this.gs.flags.week7SupportPlanChoiceDone = true;
      this.gs.flags.week7SupportPlanChoice = choice.id;
      const effects = choice.effects ?? {};
      applyEffects(this.gs, {
        'group.trust': effects['group.trust'] ?? 0,
        reputation: effects.reputation ?? 0,
      });
      this.hud.update(this.gs);

      this.story.play([{ type: 'dialog', lines: choice.resultLines }], () => this.showKnowledgeCard('beforeFree', onDone));
    };

    this.story.play([{ type: 'dialog', lines: story.lines }], () => {
      this.choice.showVNChoice(
        ['你先从哪组孩子开始做个别化支持计划？'],
        story.choices.map((choice) => ({
          label: choice.label,
          action: () => finish(choice),
        })),
        {
          choiceWidth: 820,
          choiceHeight: 52,
          choiceGap: 14,
          choiceStartY: 260,
          choiceFontSize: '17px',
        }
      );
    }, { allowSkip: true });
  }

  drawFreeHubButtons() {
    // These coordinates are deliberately tied to the current office illustration:
    // left desk = director, right desk monitor = computer, right door = map / leaving office.
    makeButton(this, contentX(248), 320, 80, 40, '所长', () => {
      this.showDirectorMenu();
    }, { fontSize: '20px', fill: 0xfffbeb, hover: 0xfef3c7 }).setDepth(10);

    makeButton(this, contentX(655), 306, 80, 40, '电脑', () => {
      this.showComputerMenu();
    }, { fontSize: '20px', fill: 0xfffbeb, hover: 0xfef3c7 }).setDepth(10);

    makeButton(this, contentX(880), 350, 80, 40, '地图', () => {
      this.scene.launch('MapScene', { gs: this.gs, fromScene: this.scene.key });
      this.scene.bringToTop('MapScene');
    }, { fontSize: '18px', fill: 0xfffbeb, hover: 0xfef3c7 }).setDepth(10);

    // ── 收集图鉴入口（小图标）────────────────────────
    makeButton(this, contentX(780), 560, 220, 48, '结束这一周', () => {
      const endDay = () => {
        this.gs.dayProgress.phase = 'result';
        this.storyPortrait?.clearAll?.(false);
        this.scene.start('ResultScene', { gs: this.gs });
      };

      this.choice.showVNChoice(
        ['确认要结束这一周吗？'],
        [
          { label: '确认结束', action: () => endDay() },
          { label: '再想想', action: () => {} },
        ]
      );
    }, { fontSize: '19px', fill: 0xfffbeb, hover: 0xfef3c7 }).setDepth(10);
  }

  // ── 收集图鉴快捷入口（左上角，第X周下面）─────────────────────────────
  _createCollectionShortcut() {
    // 位置：左上角"第X周"下面
    const x = 52;  // 与"第X周"文本中心对齐
    const y = 76;  // 在 HUD 条下面，稍微下调避免贴得太紧
    const btnWidth = 58;
    const btnHeight = 52;
    const radius = 12;

    // 按钮背景（圆角矩形）
    const bg = this.add.graphics().setDepth(10);
    const drawButton = (hover = false) => {
      bg.clear();
      bg.fillStyle(hover ? 0xffedc2 : 0xfff7df, hover ? 0.98 : 0.94);
      bg.fillRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, radius);
      bg.lineStyle(2, hover ? 0xffcf7a : 0xa46b36, hover ? 0.95 : 0.82);
      bg.strokeRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, radius);
      bg.lineStyle(1, 0xffffff, 0.38);
      bg.strokeRoundedRect(x - btnWidth / 2 + 4, y - btnHeight / 2 + 4, btnWidth - 8, btnHeight - 8, radius - 4);
    };
    drawButton(false);

    // 图标和文字
    const icon = this.add.text(x, y - 10, '🎨', {
      fontSize: '18px',
      align: 'center',
    }).setOrigin(0.5).setDepth(10);

    const label = this.add.text(x, y + 12, '收集', {
      fontSize: '15px',
      color: '#5b3419',
      align: 'center',
    }).setOrigin(0.5).setDepth(10);
    label.setShadow(0, 1, '#fff7df', 1, true, true);

    const hitArea = this.add.zone(x, y, btnWidth, btnHeight)
      .setInteractive({ useHandCursor: true })
      .setDepth(12);

    // 如果有新收集的 item，显示红点提示
    const newCount = this._getNewCollectionCount();
    if (newCount > 0) {
      const dot = this.add.circle(x + btnWidth/2 - 8, y - btnHeight/2 + 8, 5, 0xef4444, 1).setDepth(11);
      const count = this.add.text(x + btnWidth/2 - 8, y - btnHeight/2 + 8, newCount > 9 ? '9+' : String(newCount), {
        fontSize: '9px',
        color: '#ffffff',
        align: 'center',
      }).setOrigin(0.5).setDepth(12);
    }

    // 交互
    hitArea.on('pointerdown', () => {
      this.scene.launch('CollectionScene', { gs: this.gs, fromScene: 'OfficeScene' });
      this.scene.bringToTop('CollectionScene');
    });

    // 悬停效果
    hitArea.on('pointerover', () => {
      drawButton(true);
      icon.setScale(1.08);
      label.setScale(1.03);
    });

    hitArea.on('pointerout', () => {
      drawButton(false);
      icon.setScale(1.0);
      label.setScale(1.0);
    });

    // 保存引用以便销毁
    this._collectionShortcut = { bg, icon, label, hitArea };
  }

  _getNewCollectionCount() {
    // 这里可以实现"新收集"计数逻辑
    // 暂时返回 0，后续可以根据 gs.collections.newItems 等字段实现
    return 0;
  }

  showComputerMenu() {
    if (this.canShowWeek2HeadphonesPurchase()) {
      this.showWeek2HeadphonesPurchase();
      return;
    }

    this.showComputerDesktop();
  }

  showComputerDesktop() {
    this._getComputerPanel().showDesktop([
      { key: 'computer_icon_build_room', label: '修建房间', action: () => this.showBuildRoomMenu() },
      { key: 'computer_icon_asd_course', label: 'ASD课程', action: () => this.studyASDCourse() },
      { key: 'computer_icon_fundraising', label: '公益筹款', action: () => this.doFundraisingLive() },
      { key: 'computer_icon_parent_chat', label: '家长沟通', action: () => this.showParentCommunicationMenu() },
    ]);
  }

  _getComputerPanel() {
    if (!this._computerPanel?.container) {
      this._computerPanel = new ComputerPanel(this, {
        onClose: () => {
          this._computerPanel = null;
        },
      });
    }
    return this._computerPanel;
  }

  _lockComputerControls() {
    this._computerPanel?.setControlsEnabled?.(false);
  }

  _unlockComputerControls() {
    this._computerPanel?.setControlsEnabled?.(true);
  }

  _openParentChatPanel() {
    this._parentChatPanel?.destroy();
    this._parentChatPanel = new ParentChatPanel(this, {
      onClose: () => {
        this._activeParentAiSessionId = null;
        this._parentChatPanel = null;
        this.showComputerDesktop();
      },
      onBackToContacts: () => {
        this.showParentCommunicationMenu();
      },
    });
    return this._parentChatPanel;
  }

  canShowWeek2HeadphonesPurchase() {
    return this.gs.day === 2
      && this.gs.orange?.flags?.week2_orange_review_done
      && !this.gs.orange?.flags?.week2_noise_headphones_purchased
      && !this.gs.orange?.flags?.week2_noise_headphones_declined;
  }

  showWeek2HeadphonesPurchase() {
    const story = WEEK2_ORANGE_STORY.computer;
    this._getComputerPanel();
    this._lockComputerControls();
    this.story.play([{ type: 'dialog', lines: story.lines }], () => {
      this.choice.showVNChoice(
        ['你要怎么处理这项采购？'],
        [
          { label: '购买', action: () => this.purchaseWeek2Headphones() },
          { label: '不购买', action: () => this.skipWeek2HeadphonesPurchase() },
        ],
        {
          choiceWidth: 760,
          choiceHeight: 48,
          choiceGap: 14,
          choiceStartY: 260,
          choiceFontSize: '17px',
        }
      );
    });
  }

  purchaseWeek2Headphones() {
    const story = WEEK2_ORANGE_STORY.computer;
    if (this.gs.funds < 200) {
      this.story.play([{ type: 'dialog', lines: story.notEnoughFundsLines }], () => {
        this.showComputerDesktop();
      });
      return;
    }

    this.gs.funds -= 200;
    this.gs.orange.flags.week2_noise_headphones_purchased = true;
    this.gs.inventory.careItems ??= [];
    if (!this.gs.inventory.careItems.includes('noise_canceling_headphones')) {
      this.gs.inventory.careItems.push('noise_canceling_headphones');
    }
    this.hud.update(this.gs);
    this.story.play([{ type: 'dialog', lines: story.successLines }], () => {
      this._unlockComputerControls();
    });
  }

  skipWeek2HeadphonesPurchase() {
    this.gs.orange.flags.week2_noise_headphones_declined = true;
    this.story.play([{ type: 'dialog', lines: WEEK2_ORANGE_STORY.computer.skipLines }], () => {
      this.showComputerDesktop();
    });
  }

  showBuildRoomMenu() {
    this._lockComputerControls();
    const allowedRoomIds = new Set(['paintingRoom', 'library', 'sensoryRoom']);
    const buildProjects = CONSTRUCTION_PROJECTS.filter((project) => allowedRoomIds.has(project.roomId));

    this.choice.showVNChoice([
      '（修建房间）',
      '选择要修建或查看的房间。',
    ], [
      ...buildProjects.map((project) => ({
        label: `${this.gs.rooms[project.roomId] ? '查看' : '修建'}${project.displayName}（¥${project.price}）`,
        action: () => this.buildRoom(project),
      })),
      { label: '返回', action: () => this.showComputerMenu() },
    ]);
  }

  studyASDCourse() {
    this._lockComputerControls();
    const key = `${this.gs.day}_asd_course_done`;
    if (this.gs.dayProgress.freeActionDone[key]) {
      this.playStoryLines(['\u672c\u5468\u5df2\u7ecf\u5b66\u4e60\u8fc7\u8bfe\u7a0b\u4e86\u3002'], () => this._unlockComputerControls());
      return;
    }

    if (this.gs.actionPoints < 1) {
      this.playStoryLines(['\u884c\u52a8\u529b\u4e0d\u8db3\u3002'], () => this._unlockComputerControls());
      return;
    }

    if (this.gs.funds < 100) {
      this.playStoryLines(['\u8d44\u91d1\u4e0d\u8db3\u3002'], () => this._unlockComputerControls());
      return;
    }

    const careQuestions = ASD_COURSE_QUESTIONS.filter((q) => q.type === 'care');
    const knowledgeQuestions = ASD_COURSE_QUESTIONS.filter((q) => q.type === 'knowledge');

    if (careQuestions.length < 1 || knowledgeQuestions.length < 1) {
      this.playStoryLines(['\u8bfe\u7a0b\u9898\u5e93\u6682\u4e0d\u53ef\u7528\u3002'], () => this._unlockComputerControls());
      return;
    }

    const careQuestion = Phaser.Utils.Array.GetRandom(careQuestions);
    const knowledgeQuestion = Phaser.Utils.Array.GetRandom(knowledgeQuestions);

    const totalGain = {
      professional: 0,
      communication: 0,
      reputation: 0,
    };

    const applyQuestionResult = (question, isCorrect) => {
      const rewards = question.rewards?.[isCorrect ? 'correct' : 'wrong'] ?? {};
      const professional = rewards.professional ?? 0;
      const communication = rewards.communication ?? 0;
      const reputation = rewards.reputation ?? 0;

      this.gs.attrs.professional += professional;
      this.gs.attrs.communication += communication;
      this.gs.reputation += reputation;

      totalGain.professional += professional;
      totalGain.communication += communication;
      totalGain.reputation += reputation;
    };

    const askCourseQuestion = (question, onDone) => {
      const typeLabel = question.type === 'care' ? '\u7167\u62a4\u60c5\u5883\u9898' : '\u79d1\u666e\u77e5\u8bc6\u9898';

      this.choice.showVNChoice(
        [
          `\u300a${typeLabel}\u300b`,
          question.question,
        ],
        question.options.map((option) => ({
          label: `${option.key}. ${option.text}`,
          action: () => {
            const isCorrect = option.key === question.correctAnswer;
            applyQuestionResult(question, isCorrect);
            this.playStoryLines([
              isCorrect ? '\u56de\u7b54\u6b63\u786e\u3002' : '\u56de\u7b54\u4e0d\u5b8c\u5168\u51c6\u786e\u3002',
              question.explanation,
            ], () => {
              onDone();
            });
          },
        })),
        {
          choiceWidth: 760,
          choiceHeight: 48,
          choiceGap: 14,
          choiceStartY: 210,
          choiceFontSize: '17px',
        }
      );
    };

    const finishCourse = () => {
      this.gs.dayProgress.freeActionDone[key] = true;
      this.hud.update(this.gs);

      this.playStoryLines([
        '\u4f60\u5b8c\u6210\u4e86\u4e00\u8282 ASD \u4e13\u4e1a\u8bfe\u7a0b\u3002',
        `\u884c\u52a8\u529b -1\uff0c\u91d1\u94b1 -100\uff0c\u4e13\u4e1a\u7406\u89e3 +${totalGain.professional}\uff0c\u6c9f\u901a\u80fd\u529b +${totalGain.communication}\uff0c\u540d\u671b +${totalGain.reputation}`,
      ], () => this._unlockComputerControls(), { hideSpeaker: true });
    };

    this.choice.showVNChoice([
      '\u662f\u5426\u8fdb\u5165 ASD \u7167\u62a4\u8bfe\u7a0b\uff1f',
      '\u8bfe\u7a0b\u5305\u542b\u4e00\u9053\u7167\u62a4\u60c5\u5883\u9898\u548c\u4e00\u9053\u79d1\u666e\u77e5\u8bc6\u9898\u3002',
    ], [
      {
        label: '\u8fdb\u5165 ASD \u7167\u62a4\u8bfe\u7a0b\uff08\u884c\u52a8\u529b -1\uff0c\u91d1\u94b1 -100\uff09',
        action: () => {
          this.gs.actionPoints -= 1;
          this.gs.funds -= 100;
          this.hud.update(this.gs);
          this.playStoryLines([
            '\u4f60\u6253\u5f00\u4e86\u7ebf\u4e0a ASD \u8bfe\u7a0b\u3002\u8fd9\u8282\u8bfe\u5305\u542b\u4e00\u9053\u7167\u62a4\u60c5\u5883\u9898\u548c\u4e00\u9053\u79d1\u666e\u77e5\u8bc6\u9898\u3002',
          ], () => {
            askCourseQuestion(careQuestion, () => {
              askCourseQuestion(knowledgeQuestion, () => {
                finishCourse();
              });
            });
          });
        },
      },
      { label: '\u6682\u65f6\u4e0d\u8fdb\u5165', action: () => this._unlockComputerControls() },
    ], {
      choiceWidth: 760,
      choiceHeight: 48,
      choiceGap: 14,
      choiceStartY: 260,
      choiceFontSize: '17px',
    });
  }

  doFundraisingLive() {
    this._lockComputerControls();
    const key = `${this.gs.day}_fundraising_live_done`;
    if (this.gs.dayProgress.freeActionDone[key]) {
      this.playStoryLines(['\u672c\u5468\u5df2\u7ecf\u505a\u8fc7\u516c\u76ca\u76f4\u64ad\u4e86\u3002'], () => this._unlockComputerControls());
      return;
    }

    const communication = this.gs.attrs.communication;
    let tierName = '';

    if (communication > 50) {
      tierName = '\u4f20\u64ad\u6709\u529b';
    } else if (communication >= 31) {
      tierName = '\u8868\u8fbe\u6e05\u695a';
    } else if (communication >= 21) {
      tierName = '\u57fa\u672c\u5b8c\u6210';
    } else {
      tierName = '\u5b58\u5728\u98ce\u9669';
    }

    this.choice.showVNChoice(
      [
        `\u5f53\u524d\u6c9f\u901a\u80fd\u529b\uff1a${communication}\uff0c\u9884\u8ba1\u6863\u4f4d\uff1a${tierName}`,
        '\u786e\u8ba4\u5f00\u59cb\u8fd9\u6b21\u76f4\u64ad\u5417\uff1f',
      ],
      [
        {
          label: '\u5f00\u59cb\u76f4\u64ad',
          action: () => {
            if (this.gs.actionPoints < 1) {
              this.playStoryLines(['\u884c\u52a8\u529b\u4e0d\u8db3\u3002'], () => this._unlockComputerControls());
              return;
            }

            this.gs.actionPoints -= 1;
            this.gs.dayProgress.freeActionDone[key] = true;

            const lines = [];
            if (communication > 50) {
              this.gs.funds += 500;
              this.gs.reputation += 8;
              lines.push('\u76f4\u64ad\u4f20\u64ad\u6709\u529b\uff0c\u89c2\u4f17\u660e\u663e\u88ab\u7167\u62a4\u6240\u7684\u7406\u5ff5\u6253\u52a8\u3002', '\u884c\u52a8\u529b -1\uff0c\u91d1\u94b1 +500\uff0c\u540d\u671b +8');
            } else if (communication >= 31) {
              this.gs.funds += 350;
              this.gs.reputation += 5;
              lines.push('\u76f4\u64ad\u8868\u8fbe\u6e05\u695a\u800c\u771f\u8bda\uff0c\u89c2\u4f17\u613f\u610f\u652f\u6301\u7167\u62a4\u6240\u3002', '\u884c\u52a8\u529b -1\uff0c\u91d1\u94b1 +350\uff0c\u540d\u671b +5');
            } else if (communication >= 21) {
              this.gs.funds += 200;
              lines.push('\u76f4\u64ad\u57fa\u672c\u5b8c\u6210\uff0c\u83b7\u5f97\u4e86\u4e00\u4e9b\u6350\u52a9\u3002', '\u884c\u52a8\u529b -1\uff0c\u91d1\u94b1 +200');
            } else {
              this.gs.funds += 100;
              this.gs.reputation -= 5;
              lines.push('\u76f4\u64ad\u4e2d\u6709\u4e9b\u8868\u8fbe\u4e0d\u591f\u6e05\u695a\uff0c\u5f15\u53d1\u4e86\u5c11\u91cf\u8bef\u89e3\u3002', '\u884c\u52a8\u529b -1\uff0c\u91d1\u94b1 +100\uff0c\u540d\u671b -5');
            }

            this.hud.update(this.gs);
            this.playStoryLines(lines, () => this._unlockComputerControls());
          },
        },
        { label: '\u518d\u60f3\u60f3', action: () => this._unlockComputerControls() },
      ]
    );
  }

  _ensureParentAiProgress() {
    this.gs.dayProgress.parentAiTriggeredEvents = Array.isArray(this.gs.dayProgress.parentAiTriggeredEvents)
      ? this.gs.dayProgress.parentAiTriggeredEvents
      : [];
    this.gs.dayProgress.parentAiCompletedEvents = Array.isArray(this.gs.dayProgress.parentAiCompletedEvents)
      ? this.gs.dayProgress.parentAiCompletedEvents
      : [];
    this.gs.dayProgress.parentAiCompletedOutcomes = Array.isArray(this.gs.dayProgress.parentAiCompletedOutcomes)
      ? this.gs.dayProgress.parentAiCompletedOutcomes
      : [];
    this.gs.dayProgress.parentAiSessions ??= {};
    this.gs.dayProgress.parentAiCompletedSessions ??= {};
  }

  _getParentAiPendingOutcomes() {
    this._ensureParentAiProgress();
    return getPendingParentAiOutcomes(this.gs, { week: this.gs.day });
  }

  _getParentAiTriggeredCommunicationCount() {
    return getParentAiTriggeredCommunicationCount(this.gs, this.gs.day);
  }

  _getEffectiveParentMessageCounts() {
    return getEffectiveParentMessageCounts(
      this.gs.parentTrust,
      this._getParentAiTriggeredCommunicationCount(),
    );
  }

  _getParentAiContacts() {
    const outcomes = this._getParentAiPendingOutcomes();
    return outcomes.map((outcome, index) => {
      const eventOutcomes = [outcome];
      const topic = getPrimaryParentAiTopic({ eventIds: [outcome.eventId], eventOutcomes });
      const summary = getParentAiEventSummary(eventOutcomes);
      const session = this._getParentAiSession(eventOutcomes);
      const previewText = this._parentAiPendingTurns.has(session.id)
        ? '正在等待家长回复…'
        : outcome.parentMessage || (summary ? `想确认：${summary}` : '想确认一件当天发生的事。');
      return {
        name: topic.parentName,
        preview: previewText.length > 34 ? `${previewText.slice(0, 34)}…` : previewText,
        avatar: {
          color: [0xe7c6ef, 0xf5c8b8, 0xbfe3c0][index % 3],
          type: ['heart', 'person', 'leaf'][index % 3],
        },
        action: () => this.startParentAiEventChat(eventOutcomes),
      };
    });
  }

  _getParentAiParentStyleId(eventOutcomes = []) {
    const outcomes = Array.isArray(eventOutcomes) ? eventOutcomes : [];
    const hasComplaint = outcomes.some((outcome) => outcome?.parentCommunicationType === 'complaint');
    if (!hasComplaint) return 'deferential';

    const key = outcomes
      .map((outcome) => outcome?.id ?? `${outcome?.eventId ?? ''}:${outcome?.choiceId ?? ''}`)
      .join('|');
    const checksum = [...key].reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return checksum % 2 === 0 ? 'anxious' : 'skeptical';
  }

  _getParentAiSession(eventOutcomes) {
    this._ensureParentAiProgress();
    const parentStyleId = this._getParentAiParentStyleId(eventOutcomes);
    const eventIds = eventOutcomes.map((outcome) => outcome.eventId);
    const sessionKey = buildParentAiSessionKey({
      week: this.gs.day,
      eventIds,
      eventOutcomes,
      parentStyleId,
    });

    if (!this.gs.dayProgress.parentAiSessions[sessionKey]) {
      this.gs.dayProgress.parentAiSessions[sessionKey] = createParentAiSession({
        week: this.gs.day,
        eventIds,
        eventOutcomes,
        parentStyleId,
        trust: this.gs.parentTrust,
        maxTurns: 4,
      });
    }

    return this.gs.dayProgress.parentAiSessions[sessionKey];
  }

  _saveParentAiSession(session) {
    this._ensureParentAiProgress();
    this.gs.dayProgress.parentAiSessions[session.id] = session;
  }

  _markParentAiSessionComplete(session) {
    this._ensureParentAiProgress();
    this.gs.dayProgress.parentAiCompletedSessions[session.id] = true;
    session.eventOutcomes.forEach((outcome) => {
      if (!this.gs.dayProgress.parentAiCompletedOutcomes.includes(outcome.id)) {
        this.gs.dayProgress.parentAiCompletedOutcomes.push(outcome.id);
      }
    });
    session.eventIds.forEach((eventId) => {
      if (!this.gs.dayProgress.parentAiCompletedEvents.includes(eventId)) {
        this.gs.dayProgress.parentAiCompletedEvents.push(eventId);
      }
    });
  }

  startParentAiEventChat(eventOutcomes = this._getParentAiPendingOutcomes().slice(0, 1)) {
    const chat = this._parentChatPanel ?? this._openParentChatPanel();
    chat.clearMessages();
    chat.setChatAvatar({ color: 0xe7c6ef, type: 'heart' });
    chat.setCloseEnabled(true);

    if (!eventOutcomes.length) {
      chat.addSystemMessage('本周尚未触发可展开的事件，先使用原有家长沟通内容。');
      chat.setInputAction(() => this.showParentCommunicationMenu());
      return;
    }

    const session = this._getParentAiSession(eventOutcomes);
    this._activeParentAiSessionId = session.id;
    chat.setParentSatisfaction(session.trust);
    session.messages.forEach((message) => {
      if (message.role === 'parent') {
        chat.addParentMessage(message.text);
      } else if (message.role === 'player') {
        chat.addPlayerMessage(message.text);
      } else {
        chat.addSystemMessage(message.text);
      }
    });

    if (session.conversationEnded) {
      this._markParentAiSessionComplete(session);
      chat.addSystemMessage(this._formatParentAiEndLine(session));
      chat.setInputAction(() => this.showParentCommunicationMenu());
      return;
    }

    const pendingTurn = this._parentAiPendingTurns.get(session.id);
    if (pendingTurn) {
      chat.addPlayerMessage(pendingTurn.playerReply);
      chat.setParentSatisfaction(session.trust);
      chat.enableFreeTextInput({
        placeholder: '正在等待家长回复…',
        onSubmit: () => {},
      });
      chat.setFreeTextInputEnabled(false, '正在等待家长回复…');
      chat.setCloseEnabled(true);
      return;
    }

    this._enableParentAiFreeReply(session);
  }

  _enableParentAiFreeReply(session) {
    const chat = this._parentChatPanel ?? this._openParentChatPanel();
    chat.hideReplyOptions();
    chat.enableFreeTextInput({
      placeholder: '\u8f93\u5165\u4f60\u8981\u56de\u590d\u5bb6\u957f\u7684\u8bdd...',
      onSubmit: (text) => this._submitParentAiReply(session, text),
    });
  }

  async _submitParentAiReply(session, playerReply) {
    if (this._parentAiPendingTurns.has(session.id)) return;
    const chat = this._parentChatPanel ?? this._openParentChatPanel();
    chat.hideReplyOptions();
    chat.setCloseEnabled(true);
    chat.setParentSatisfaction(session.trust);
    chat.setFreeTextInputEnabled(false, 'AI \u6b63\u5728\u8bc4\u4f30\u5e76\u751f\u6210\u5bb6\u957f\u56de\u5e94...');
    chat.addPlayerMessage(playerReply);

    if (this._shouldResolveParentAiCourtesy(session, playerReply)) {
      const result = this._buildParentAiCourtesyResult(session);
      const nextSession = applyParentTurnResult(session, result, playerReply);
      this._saveParentAiSession(nextSession);
      const gameDelta = this._getParentAiGameDelta(result, session);
      this.gs.parentTrust = clampParentTrust((this.gs.parentTrust || 0) + gameDelta.trust);
      this.gs.reputation += gameDelta.reputation;
      this._markParentAiSessionComplete(nextSession);
      this.hud?.update(this.gs);

      chat.setParentSatisfaction(nextSession.trust);
      chat.addParentMessage(result.parentReply);
      const deltaLine = this._formatParentAiGameDeltaLine(gameDelta);
      if (deltaLine) {
        chat.addSystemMessage(deltaLine);
      }
      chat.setCloseEnabled(true);
      chat.disableFreeTextInput();
      chat.setInputPlaceholder(this._formatParentAiEndLine(nextSession));
      chat.setInputAction(() => this.showParentCommunicationMenu());
      return;
    }

    const typingIndicator = chat.addParentTypingIndicator('家长正在输入中');
    this._parentAiPendingTurns.set(session.id, { playerReply });

    try {
      const response = await requestParentAiTurn({
        session,
        playerReply,
      });
      const result = response.result ?? response;
      const nextSession = response.session ?? applyParentTurnResult(session, result, playerReply);
      this._parentAiPendingTurns.delete(session.id);
      this._saveParentAiSession(nextSession);
      const turnEnded = nextSession.conversationEnded || result.shouldEnd;
      const gameDelta = turnEnded ? this._getParentAiGameDelta(result, session) : { trust: 0, reputation: 0 };
      if (turnEnded) {
        this.gs.parentTrust = clampParentTrust((this.gs.parentTrust || 0) + gameDelta.trust);
        this.gs.reputation += gameDelta.reputation;
        this._markParentAiSessionComplete(nextSession);
      }
      this.hud?.update(this.gs);

      const activeChat = this._parentChatPanel === chat
        && Boolean(chat.container)
        && this._activeParentAiSessionId === session.id;
      if (!activeChat) return;

      typingIndicator.remove();
      chat.setParentSatisfaction(nextSession.trust);
      chat.addParentMessage(result.parentReply ?? '\u5bb6\u957f\u6682\u65f6\u6ca1\u6709\u7ee7\u7eed\u56de\u590d\u3002');

      if (turnEnded) {
        const deltaLine = this._formatParentAiGameDeltaLine(gameDelta);
        if (deltaLine) {
          chat.addSystemMessage(deltaLine);
        }
        chat.setCloseEnabled(true);
        chat.disableFreeTextInput();
        chat.setInputPlaceholder(this._formatParentAiEndLine(nextSession));
        chat.setInputAction(() => this.showParentCommunicationMenu());
        return;
      }

      chat.setCloseEnabled(true);
      this._enableParentAiFreeReply(nextSession);
    } catch (error) {
      this._parentAiPendingTurns.delete(session.id);
      const activeChat = this._parentChatPanel === chat
        && Boolean(chat.container)
        && this._activeParentAiSessionId === session.id;
      if (!activeChat) return;
      typingIndicator.remove();
      chat.setParentSatisfaction(session.trust);
      chat.setCloseEnabled(true);
      chat.addSystemMessage('当前无法连接 AI 家长沟通服务，本次可按离线方式记录处理。');
      chat.disableFreeTextInput();
      chat.showReplyOptions([
        {
          label: '记录并跟进',
          action: () => this._completeParentAiOffline(session, chat),
        },
        {
          label: '稍后再试',
          action: () => this._enableParentAiFreeReply(session),
        },
      ]);
    }
  }

  _completeParentAiOffline(session, chat = this._parentChatPanel) {
    if (!session || !chat) return;
    const communicationType = this._getParentAiCommunicationType(session);
    const trustDelta = communicationType === 'complaint' ? 2 : 1;
    const nextSession = {
      ...session,
      turnCount: Math.max(Number(session.turnCount) || 0, 1),
      trust: clampParentTrust(Number(session.trust ?? 50) + trustDelta),
      conversationEnded: true,
      endReason: 'offline_recorded',
      lastEvaluation: {
        shouldEnd: true,
        endReason: 'offline_recorded',
        score: 60,
        trustDelta,
        safetyFlag: 'offline',
      },
      messages: [
        ...(Array.isArray(session.messages) ? session.messages : []),
        {
          role: 'system',
          name: '系统',
          text: '当前无法连接 AI 家长沟通服务，已按离线方式记录处理。',
        },
      ],
    };
    this._saveParentAiSession(nextSession);
    this._markParentAiSessionComplete(nextSession);
    this.gs.parentTrust = clampParentTrust((this.gs.parentTrust || 0) + trustDelta);
    this.hud?.update(this.gs);

    chat.hideReplyOptions();
    chat.setParentSatisfaction(nextSession.trust);
    chat.addSystemMessage(`已记录并安排后续跟进。家长信任 +${trustDelta}`);
    chat.setCloseEnabled(true);
    chat.disableFreeTextInput();
    chat.setInputPlaceholder(this._formatParentAiEndLine(nextSession));
    chat.setInputAction(() => this.showParentCommunicationMenu());
  }

  _formatParentAiTaskList(taskIds = []) {
    const labels = {
      emotional_facts: '\u56de\u5e94\u62c5\u5fe7\u4e0e\u4e8b\u5b9e',
      professional_reframe: '\u89e3\u91ca\u5224\u65ad',
      action_partnership: '\u4e0b\u4e00\u6b65\u534f\u4f5c',
    };
    return taskIds.map((taskId) => labels[taskId] ?? taskId).join('\u3001');
  }

  _formatParentAiResultLine() {
    return '';
  }

  _formatParentAiEndLine(session) {
    const topic = getPrimaryParentAiTopic(session);
    return `\u5df2\u5b8c\u6210\u300c${topic.title}\u300d\u7684\u5bb6\u957f\u6c9f\u901a\u3002`;
  }

  _normalizeParentAiText(text = '') {
    return String(text ?? '').replace(/[\s，。！？、,.!?~～…]/g, '');
  }

  _getLastParentAiMessage(session) {
    const messages = Array.isArray(session?.messages) ? session.messages : [];
    return [...messages].reverse().find((message) => message?.role === 'parent')?.text ?? '';
  }

  _isParentAiClosureMessage(text = '') {
    const value = this._normalizeParentAiText(text);
    if (!value) return false;
    return [
      '我明白了',
      '我了解了',
      '我知道了',
      '我放心了',
      '比较放心',
      '这样说我放心',
      '先按这个方法',
      '按这个方法做',
      '按你们说的方向',
      '按您说的方向',
      '有变化再沟通',
      '谢谢您解释',
      '谢谢你解释',
      '谢谢您耐心解释',
      '谢谢你耐心解释',
      '谢谢您耐心解答',
      '谢谢你耐心解答',
      '谢谢您的理解',
      '谢谢你的理解',
    ].some((marker) => value.includes(marker));
  }

  _isParentAiCourtesyReply(text = '') {
    const value = this._normalizeParentAiText(text);
    if (!value || value.length > 28) return false;
    return [
      '好的',
      '好',
      '嗯嗯',
      '谢谢理解',
      '谢谢您的理解',
      '谢谢你的理解',
      '感谢理解',
      '不客气',
      '应该的',
      '有变化再沟通',
      '后面有变化再沟通',
      '有情况再联系',
      '希望能帮到您',
      '希望能帮到你',
    ].some((marker) => value.includes(marker));
  }

  _isParentAiConfirmationQuestion(text = '') {
    const value = this._normalizeParentAiText(text);
    if (!value) return false;
    return [
      '吗',
      '对吗',
      '是吗',
      '这样理解',
      '想确认',
      '是不是',
      '是否',
      '可以这样',
    ].some((marker) => value.includes(marker));
  }

  _isParentAiAffirmativeReply(text = '') {
    const value = this._normalizeParentAiText(text);
    if (!value || value.length > 36) return false;
    return [
      '是的',
      '对',
      '对的',
      '没错',
      '可以这样理解',
      '是这样',
      '嗯',
      '嗯嗯',
    ].some((marker) => value.startsWith(marker) || value.includes(marker));
  }

  _shouldResolveParentAiCourtesy(session, playerReply) {
    const lastParentMessage = this._getLastParentAiMessage(session);
    if (this._isParentAiClosureMessage(lastParentMessage) && this._isParentAiCourtesyReply(playerReply)) {
      return true;
    }
    return false;
  }

  _buildParentAiCourtesyResult(session) {
    const trustBefore = Number(session?.trust ?? 50);
    return {
      score: 72,
      trustDelta: 0,
      parentMood: 'trusting',
      parentReply: '好的，后面有新情况我们再沟通。',
      coachFeedback: '家长已经接受当前说明，本轮礼貌收尾即可结束。',
      taskAssessments: [
        { id: 'emotional_facts', status: 'complete', evidence: '家长已表达理解或放心。', reason: '自然收尾' },
        { id: 'professional_reframe', status: 'complete', evidence: '前文已完成核心解释。', reason: '自然收尾' },
        { id: 'action_partnership', status: 'complete', evidence: '双方同意后续有变化再沟通。', reason: '自然收尾' },
      ],
      completedTaskIds: ['emotional_facts', 'professional_reframe', 'action_partnership'],
      missingTaskIds: [],
      strengths: ['自然结束对话'],
      risks: [],
      harmfulStreak: 0,
      harmfulSignalHistory: Array.isArray(session?.harmfulSignalHistory) ? session.harmfulSignalHistory : [],
      shouldEnd: true,
      endReason: 'resolved',
      isIrrelevant: false,
      safetyFlag: 'none',
      timingTrace: {
        trustBefore,
        trustAfter: trustBefore,
      },
    };
  }

  _getParentAiCommunicationType(session) {
    const outcomes = Array.isArray(session?.eventOutcomes) ? session.eventOutcomes : [];
    return outcomes.some((outcome) => outcome?.parentCommunicationType === 'complaint')
      ? 'complaint'
      : 'sharing';
  }

  _formatParentAiGameDeltaLine(delta = {}) {
    const lines = [];
    if (delta.trust) {
      lines.push(`家长信任 ${delta.trust >= 0 ? '+' : ''}${delta.trust}`);
    }
    if (delta.reputation) {
      lines.push(`名望 ${delta.reputation >= 0 ? '+' : ''}${delta.reputation}`);
    }
    return lines.join('，');
  }

  _getParentAiGameDelta(result, sessionBefore) {
    const endReason = result?.endReason ?? 'continue';
    const communicationType = this._getParentAiCommunicationType(sessionBefore);
    const isComplaint = communicationType === 'complaint';
    if (!result?.shouldEnd && endReason === 'continue') return { trust: 0, reputation: 0 };

    if (endReason === 'resolved') {
      const trustBefore = Number(result?.timingTrace?.trustBefore ?? sessionBefore?.trust ?? 50);
      const trustDelta = Number(result?.trustDelta || 0);
      const trustAfter = clampParentTrust(trustBefore + trustDelta);
      const score = Number(result?.score || 0);
      const highQualityTrust = isComplaint ? 70 : 80;
      const highQuality = trustAfter > highQualityTrust || trustDelta >= 10;
      if (isComplaint) {
        return highQuality
          ? { trust: 5, reputation: 2 }
          : { trust: 2, reputation: 0 };
      }
      return highQuality
        ? { trust: 2, reputation: 2 }
        : { trust: 2, reputation: 0 };
    }

    if (endReason === 'failed') {
      if (result?.safetyFlag === 'harmful') return { trust: -8, reputation: -5 };
      return isComplaint
        ? { trust: -5, reputation: -2 }
        : { trust: -2, reputation: 0 };
    }

    if (endReason === 'irrelevant') {
      return { trust: -8, reputation: -5 };
    }

    if (endReason === 'max_turns') {
      return isComplaint
        ? { trust: -2, reputation: -2 }
        : { trust: 0, reputation: 0 };
    }

    return { trust: 0, reputation: 0 };
  }

  showParentCommunicationMenu() {
    this._activeParentAiSessionId = null;
    this._lockComputerControls();
    const chat = this._openParentChatPanel();
    const counts = this._getEffectiveParentMessageCounts();
    const contacts = [{
      name: '王老师',
      preview: '负责家长沟通，有问题可以先问我。',
      avatar: { color: 0xb9d7f0, type: 'star' },
      action: () => this.showWangTeacherChat(),
    }];

    contacts.push(...this._getParentAiContacts());

    if (!this.gs.dayProgress.freeActionDone[`${this.gs.day}_parent_daily_talk_done`] && counts.dailyTalk > 0) {
      contacts.push(...this._getParentMessageContacts('dailyTalk', DAILY_TALK_POOL, counts.dailyTalk));
    }

    if (!this.gs.dayProgress.freeActionDone[`${this.gs.day}_parent_complaint_done`] && counts.complaints > 0) {
      contacts.push(...this._getParentMessageContacts('complaint', PARENT_COMPLAINT_POOL, counts.complaints));
    }

    chat.showContacts(contacts);
  }

  _getParentMessageContacts(type, pool, count) {
    this.gs.dayProgress.parentContacts ??= {};
    this.gs.dayProgress.parentContactsProcessed ??= {};

    const key = `${this.gs.day}_${type}`;
    if (!this.gs.dayProgress.parentContacts[key]) {
      const picked = pickRandomMessages(pool, count);
      const names = type === 'dailyTalk'
        ? ['林家长', '周家长', '许家长']
        : ['陈家长', '赵家长', '孙家长'];
      const avatarTypes = ['flower', 'person', 'leaf', 'heart', 'home'];
      const avatarColors = [0xf9d58c, 0xbfe3c0, 0xb9d7f0, 0xe7c6ef, 0xf5c8b8];
      this.gs.dayProgress.parentContacts[key] = picked.map((msg, index) => ({
        messageId: msg.id,
        name: names[index % names.length],
        avatar: {
          color: avatarColors[index % avatarColors.length],
          type: avatarTypes[index % avatarTypes.length],
        },
      }));
    }

    const processed = new Set(this.gs.dayProgress.parentContactsProcessed[key] ?? []);
    return this.gs.dayProgress.parentContacts[key]
      .map((entry) => ({
        ...entry,
        message: pool.find((msg) => msg.id === entry.messageId),
      }))
      .filter((entry) => entry.message && !processed.has(entry.messageId))
      .map((entry) => ({
        name: entry.name,
        preview: type === 'dailyTalk' ? '\u3010\u503e\u8bc9\u3011\u65e5\u5e38\u6d88\u606f\uff08\u884c\u52a8\u529b -1\uff09' : '\u3010\u6295\u8bc9\u3011\u5bb6\u957f\u6295\u8bc9\uff08\u884c\u52a8\u529b -1\uff09',
        avatar: entry.avatar,
        action: () => this.processSingleParentMessage(entry.message, type, entry),
      }));
  }

  showWangTeacherChat() {
    const chat = this._parentChatPanel ?? this._openParentChatPanel();
    chat.clearMessages();
    chat.setParentSatisfaction(null);
    chat.setPanelMode('chat');
    chat.setChatAvatar({ color: 0xb9d7f0, type: 'star' });
    chat.setCloseEnabled(true);
    chat.addParentMessage('我是王老师，平时主要负责和家长沟通。你要是想确认家长那边的状态，可以先问我。');
    chat.setInputAction(() => this.showWangTeacherOptions());
  }

  showWangTeacherOptions() {
    const chat = this._parentChatPanel ?? this._openParentChatPanel();
    chat.showReplyOptions([
      { label: '当前家长信任', action: () => this.askWangTeacher('trust') },
      { label: '当前家长信任产生的影响', action: () => this.askWangTeacher('impact') },
      { label: '当前每周家长信任变化', action: () => this.askWangTeacher('weekly') },
      { label: '没什么想问的了', action: () => this.askWangTeacher('bye') },
    ]);
  }

  askWangTeacher(topic) {
    const chat = this._parentChatPanel ?? this._openParentChatPanel();
    const questions = {
      trust: '当前家长信任怎么样？',
      impact: '当前家长信任会产生什么影响？',
      weekly: '当前每周家长信任会怎么变化？',
      bye: '没什么想问的了。',
    };
    chat.addPlayerMessage(questions[topic]);
    chat.addParentMessage(this.getWangTeacherReply(topic));
    chat.setInputAction(() => this.showWangTeacherOptions());
  }

  getWangTeacherReply(topic) {
    const parentTrust = this.gs.parentTrust ?? 0;
    const counts = this._getEffectiveParentMessageCounts();

    if (topic === 'trust') {
      if (parentTrust >= 75) return `当前家长信任是 ${parentTrust}。现在家长整体比较信任照护所。大多数问题会从“想了解孩子状态”开始，而不是直接质疑。`;
      if (parentTrust >= 50) return `当前家长信任是 ${parentTrust}。现在家长信任还算稳定，但不是完全放心。解释要具体，最好让家长知道我们下一步会怎么做。`;
      if (parentTrust >= 25) return `当前家长信任是 ${parentTrust}。现在家长已经有些不安。很多问题表面是小事，背后是在确认我们有没有认真看见孩子。`;
      return `当前家长信任是 ${parentTrust}。现在家长信任比较危险。接下来每一次沟通都要具体、及时，空泛承诺反而会让家长更不放心。`;
    }

    if (topic === 'impact') {
      return `按现在的信任水平，本周预计会有 ${counts.dailyTalk} 条日常消息和 ${counts.complaints} 条投诉。信任越高，家长越愿意分享孩子的变化；信任越低，投诉和确认会更多。`;
    }

    if (topic === 'weekly') {
      const delta = getParentTrustDeltaFromGroup(this.gs);
      const reason = getParentTrustReasonFromGroup(this.gs);
      return `${reason} 如果今天就结算，本周家长信任预计 ${delta >= 0 ? '+' : ''}${delta}。`;
    }

    return '好。家长沟通不用一次说完所有事，但每次都要让对方知道：我们看见了，也会继续跟进。';
  }

  handleParentDailyChat() {
    const key = `${this.gs.day}_parent_daily_talk_done`;
    if (this.gs.dayProgress.freeActionDone[key]) {
      this.playStoryLines(['本周的日常倾诉已经处理完了。'], () => this._unlockComputerControls());
      return;
    }

    const count = this._getEffectiveParentMessageCounts().dailyTalk;
    if (count <= 0) {
      this.playStoryLines(['本周没有新的日常倾诉。'], () => this._unlockComputerControls());
      return;
    }

    if (this.gs.actionPoints < 1) {
      this.playStoryLines(['\u884c\u52a8\u529b\u4e0d\u8db3\u3002'], () => this._unlockComputerControls());
      return;
    }

    this.gs.actionPoints -= 1;
    this.hud.update(this.gs);
    const messages = pickRandomMessages(DAILY_TALK_POOL, count);
    this.processParentMessages(messages, 'dailyTalk', () => {
      this.gs.dayProgress.freeActionDone[key] = true;
      this.hud.update(this.gs);
      this._unlockComputerControls();
    });
  }

  handleParentComplaint() {
    const key = `${this.gs.day}_parent_complaint_done`;
    if (this.gs.dayProgress.freeActionDone[key]) {
      this.playStoryLines(['本周的家长投诉已经处理完了。'], () => this._unlockComputerControls());
      return;
    }

    const count = this._getEffectiveParentMessageCounts().complaints;
    if (count <= 0) {
      this.playStoryLines(['本周没有新的家长投诉。'], () => this._unlockComputerControls());
      return;
    }

    if (this.gs.actionPoints < 1) {
      this.playStoryLines(['\u884c\u52a8\u529b\u4e0d\u8db3\u3002'], () => this._unlockComputerControls());
      return;
    }

    this.gs.actionPoints -= 1;
    this.hud.update(this.gs);
    const messages = pickRandomMessages(PARENT_COMPLAINT_POOL, count);
    this.processParentMessages(messages, 'complaint', () => {
      this.gs.dayProgress.freeActionDone[key] = true;
      this.hud.update(this.gs);
      this._unlockComputerControls();
    });
  }

  processParentMessages(messages, type, onAllDone) {
    let index = 0;
    const chat = this._parentChatPanel ?? this._openParentChatPanel();
    chat.clearMessages();
    chat.setParentSatisfaction(null);
    chat.setCloseEnabled(true);

    const nextMessage = () => {
      if (index >= messages.length) {
        chat.addSystemMessage(type === 'dailyTalk' ? '\u503e\u8bc9\u5904\u7406\u5b8c\u6210\uff0c\u884c\u52a8\u529b -1' : '\u6295\u8bc9\u5904\u7406\u5b8c\u6210\uff0c\u884c\u52a8\u529b -1');
        chat.setInputAction(() => this.showParentCommunicationMenu());
        chat.setCloseEnabled(true);
        onAllDone();
        return;
      }

      const msg = messages[index];
      index++;
      chat.addParentMessage(msg.text);
      chat.setInputAction(() => {
        chat.showReplyOptions(msg.options.map(opt => ({
          label: opt.label,
          action: () => {
            chat.addPlayerMessage(opt.label);
            const resultLines = [opt.good ? msg.goodReply : msg.badReply, ''];
            let effectLine = '';
            if (type === 'dailyTalk') {
              if (opt.good) {
                this.gs.parentTrust = clampParentTrust(this.gs.parentTrust + 2);
                this.gs.reputation += 1;
                effectLine = '家长信任 +2，名望 +1';
              } else {
                this.gs.parentTrust = clampParentTrust(this.gs.parentTrust - 2);
                this.gs.reputation -= 2;
                effectLine = '家长信任 -2，名望 -2';
              }
            } else {
              if (opt.good) {
                this.gs.parentTrust = clampParentTrust(this.gs.parentTrust + 5);
                effectLine = '家长信任 +5';
              } else {
                this.gs.parentTrust = clampParentTrust(this.gs.parentTrust - 5);
                this.gs.reputation -= 5;
                effectLine = '家长信任 -5，名望 -5';
              }
            }

            chat.addParentMessage(resultLines[0]);
            chat.addSystemMessage(effectLine);
            this.hud.update(this.gs);
            this.time.delayedCall(350, nextMessage);
          }
        })));
      });
    };

    nextMessage();
  }

  processSingleParentMessage(msg, type, contactEntry) {
    if (this.gs.actionPoints < 1) {
      const chat = this._parentChatPanel ?? this._openParentChatPanel();
      chat.clearMessages();
      chat.addSystemMessage('\u884c\u52a8\u529b\u4e0d\u8db3\u3002');
      chat.setCloseEnabled(true);
      return;
    }

    this.gs.actionPoints -= 1;
    this.hud.update(this.gs);
    const chat = this._parentChatPanel ?? this._openParentChatPanel();
    chat.clearMessages();
    chat.setParentSatisfaction(null);
    chat.setChatAvatar(contactEntry.avatar);
    chat.setCloseEnabled(true);
    chat.addParentMessage(msg.text);
    chat.setInputAction(() => {
      chat.showReplyOptions(msg.options.map(opt => ({
        label: opt.label,
        action: () => {
          chat.addPlayerMessage(opt.label);
          let effectLine = '';
          if (type === 'dailyTalk') {
            if (opt.good) {
              this.gs.parentTrust = clampParentTrust(this.gs.parentTrust + 2);
              this.gs.reputation += 1;
              effectLine = '家长信任 +2，名望 +1';
            } else {
              this.gs.parentTrust = clampParentTrust(this.gs.parentTrust - 2);
              this.gs.reputation -= 2;
              effectLine = '家长信任 -2，名望 -2';
            }
          } else {
            if (opt.good) {
              this.gs.parentTrust = clampParentTrust(this.gs.parentTrust + 5);
              effectLine = '家长信任 +5';
            } else {
              this.gs.parentTrust = clampParentTrust(this.gs.parentTrust - 5);
              this.gs.reputation -= 5;
              effectLine = '家长信任 -5，名望 -5';
            }
          }

          chat.addParentMessage(opt.good ? msg.goodReply : msg.badReply);
          chat.addSystemMessage(effectLine + '\uff0c\u884c\u52a8\u529b -1');
          this.hud.update(this.gs);
          this._markParentContactProcessed(type, contactEntry.messageId);
          chat.setInputAction(() => this.showParentCommunicationMenu());
          chat.setCloseEnabled(true);
        },
      })));
    });
  }

  _markParentContactProcessed(type, messageId) {
    this.gs.dayProgress.parentContactsProcessed ??= {};
    const key = `${this.gs.day}_${type}`;
    this.gs.dayProgress.parentContactsProcessed[key] ??= [];
    if (!this.gs.dayProgress.parentContactsProcessed[key].includes(messageId)) {
      this.gs.dayProgress.parentContactsProcessed[key].push(messageId);
    }

    const remaining = this._getParentMessageContacts(
      type,
      type === 'dailyTalk' ? DAILY_TALK_POOL : PARENT_COMPLAINT_POOL,
      this._getEffectiveParentMessageCounts()[type === 'dailyTalk' ? 'dailyTalk' : 'complaints'],
    );
    if (remaining.length === 0) {
      const doneKey = type === 'dailyTalk'
        ? `${this.gs.day}_parent_daily_talk_done`
        : `${this.gs.day}_parent_complaint_done`;
      this.gs.dayProgress.freeActionDone[doneKey] = true;
    }
  }

  showParentTrustStatus() {
    const counts = this._getEffectiveParentMessageCounts();
    const chat = this._parentChatPanel ?? this._openParentChatPanel();
    chat.clearMessages();
    chat.setParentSatisfaction(null);
    chat.addSystemMessage('家长信任');
    chat.addParentMessage(`当前家长信任：${this.gs.parentTrust}`);
    chat.addParentMessage(`预计本周日常倾诉：${counts.dailyTalk} 封，家长投诉：${counts.complaints} 封`);
    chat.setInputAction(() => {
      this.choice.showVNChoice(['下一步要做什么？'], [
        { label: '日常倾诉（行动力 -1）', action: () => this.handleParentDailyChat() },
        { label: '家长投诉（行动力 -1）', action: () => this.handleParentComplaint() },
        { label: '返回', action: () => this.showParentCommunicationMenu() },
      ], {
        choiceWidth: 760,
        choiceHeight: 48,
        choiceGap: 14,
        choiceStartY: 210,
        choiceFontSize: '17px',
      });
    });
  }

  buildRoom(project) {
    if (this.gs.rooms[project.roomId]) {
      this.playStoryLines([
        ...DIALOGS_ACTIONS.computer.build.alreadyBuilt,
        `${project.displayName}已经可以从地图进入。`,
      ], () => this._unlockComputerControls());
      return;
    }

    if (this.gs.funds < project.price) {
      this.playStoryLines([
        ...DIALOGS_ACTIONS.computer.build.notEnoughFunds,
        `修建${project.displayName}需要 ¥${project.price}，当前资金为 ¥${this.gs.funds}。`,
      ], () => this._unlockComputerControls());
      return;
    }

    this.gs.funds -= project.price;
    this.gs.rooms[project.roomId] = true;
    this.gs.flags[`built_${project.roomId}`] = true;
    this.hud.update(this.gs);

    const lines = getByPath(DIALOGS_ACTIONS, project.successDialogKey, ['[电脑 / 修建完成 - 待写]']);
    this.playStoryLines([
      ...lines,
      `金钱 -${project.price}，${project.displayName}已开放。`,
    ], () => this._unlockComputerControls());
  }

  showDirectorMenu() {
    this.storyPortrait?.applyCommands?.(['__PORTRAIT:chenlan:right__']);
    const choices = [];
    if (this.canShowWeek1OrangeReview()) {
      choices.push({ label: '聊聊橙橙', action: () => this.playWeek1OrangeReview() });
    }
    choices.push(
      { label: '请教建议（消耗 1 行动力）', action: () => this.askDirectorAdvice() },
      { label: '聊天（每周一次）', action: () => this.chatWithDirector() },
      { label: '返回', action: () => this.storyPortrait?.clearAll?.(false) },
    );

    this.choice.showVNChoice([
      '陈岚抬头看了看你，放下手中的文件。',
    ], choices);
  }

  canShowWeek1OrangeReview() {
    return this.gs.day === 1
      && this.gs.orange?.flags?.week1_orange_met
      && !this.gs.orange?.flags?.week1_orange_review_done;
  }

  canShowWeek2OrangeReview() {
    return this.gs.day === 2
      && this.gs.orange?.flags?.week2_noise_event_done
      && !this.gs.orange?.flags?.week2_orange_review_done;
  }

  playWeek2OrangeReview() {
    const response = this.gs.orange?.flags?.week2_noise_response;
    const story = WEEK2_ORANGE_STORY.directorReview;
    const lines = [
      ...story.baseLines,
      ...(response === 'support' ? story.supportLines : story.explainLines),
      ...story.unlockLines,
    ];

    this.story.play([{ type: 'dialog', lines }], () => {
      this.gs.orange.flags.week2_orange_review_done = true;
      this.gs.orange.flags.week2_noise_headphones_unlocked = true;
      this.hud.update(this.gs);
      this.drawFreeHubButtons();
    });
  }

  canShowWeek3OrangeReview() {
    return this.gs.day === 3
      && this.gs.orange?.flags?.week3_book_choice_done
      && !this.gs.orange?.flags?.week3_orange_review_done;
  }

  playWeek3OrangeReview() {
    this.story.play([{ type: 'dialog', lines: WEEK3_ORANGE_STORY.review.lines }], () => {
      this.gs.orange.flags.week3_orange_review_done = true;
      this.gs.orange.flags.week3_choice_cards_unlocked = true;
      this.hud.update(this.gs);
      this.drawFreeHubButtons();
    });
  }

  canShowWeek4FatherCall() {
    return this.gs.day === 4
      && this.gs.orange?.flags?.week4_display_consent_done
      && !this.gs.orange?.flags?.week4_father_call_done;
  }

  playWeek4FatherCall() {
    const story = WEEK4_ORANGE_STORY.fatherCall;
    this.story.play([{ type: 'dialog', lines: story.lines }], () => {
      this.choice.showVNChoice(
        ['你现在要怎么回答？'],
        story.choices.map((choice) => ({
          label: choice.label,
          action: () => this.resolveWeek4FatherCallChoice(choice),
        })),
        {
          choiceWidth: 760,
          choiceHeight: 48,
          choiceGap: 14,
          choiceStartY: 260,
          choiceFontSize: '17px',
        }
      );
    });
  }

  resolveWeek4FatherCallChoice(choice) {
    if (choice.affectionDelta) {
      this.gs.orange.affection = (this.gs.orange.affection ?? 0) + choice.affectionDelta;
    }
    this.gs.orange.flags.week4_father_call_done = true;
    this.gs.orange.flags.week4_father_call_choice = choice.id;
    if (choice.id === 'ask_orange') {
      this.gs.orange.flags.orange_parent_understands_consent = true;
      this.gs.orange.flags.orange_self_consent_needed = true;
    }
    this.hud.update(this.gs);
    this.story.play([{ type: 'dialog', lines: choice.resultLines }], () => {
      this.drawFreeHubButtons();
    });
  }

  canShowWeek5FatherReflection() {
    return this.gs.day === 5
      && this.gs.orange?.flags?.week5_folder_review_done
      && !this.gs.orange?.flags?.week5_father_reflection_done;
  }

  playWeek5FatherReflection() {
    this.story.play([{ type: 'dialog', lines: WEEK5_ORANGE_STORY.fatherReflection.lines }], () => {
      this.gs.orange.flags.week5_father_reflection_done = true;
      this.hud.update(this.gs);
      this.drawFreeHubButtons();
    });
  }

  playWeek1OrangeReview() {
    const firstContact = this.gs.orange?.flags?.orange_first_contact;
    const story = WEEK1_ORANGE_STORY.directorReview;
    const lines = [
      ...story.baseLines,
      ...(this.gs.rooms?.paintingRoom ? story.alreadyBuiltLines : []),
      ...(firstContact === 'interrupt' ? story.interruptLines : story.observeLines),
      ...(this.gs.rooms?.paintingRoom ? [] : story.buildHintLines),
    ];

    const finishReview = () => {
      this.gs.orange.flags.week1_orange_review_done = true;
      this.hud.update(this.gs);
      this.storyPortrait?.clearAll?.(false);
    };

    this.story.play([{ type: 'dialog', lines }], () => {
      if (firstContact !== 'interrupt') {
        finishReview();
        return;
      }

      this.choice.showVNChoice(
        ['你要怎么回应？'],
        story.repairChoices.map((choice) => ({
          label: choice.label,
          action: () => {
            this.gs.orange.flags.orange_first_contact_repaired = choice.id === 'repair';
            if (choice.affectionDelta) {
              this.gs.orange.affection = Math.max(0, (this.gs.orange.affection ?? 0) + choice.affectionDelta);
            }
            this.story.play([{ type: 'dialog', lines: choice.lines }], finishReview);
          },
        })),
        {
          choiceWidth: 760,
          choiceHeight: 48,
          choiceGap: 14,
          choiceStartY: 260,
          choiceFontSize: '17px',
        }
      );
    });
  }
  askDirectorAdvice() {
    if (this.gs.actionPoints < 1) {
      this.playStoryLines(['行动力不足。'], () => {
        this.storyPortrait?.clearAll?.(false);
      });
      return;
    }

    const advice = Phaser.Utils.Array.GetRandom(DIRECTOR_ADVICE_POOL);

    this.gs.actionPoints -= 1;
    this.gs.attrs.professional += 3;
    this.hud.update(this.gs);
    this.storyPortrait?.applyCommands?.(['__PORTRAIT:chenlan:right__']);

    this.playStoryLines([
      advice.adviceText,
      '行动力 -1，专业理解 +3。',
    ], () => {
      this.storyPortrait?.clearAll?.(false);
    }, { speaker: '陈岚' });
  }

  chatWithDirector() {
    const chatKey = `${this.gs.day}_director_chat`;
    if (this.gs.dayProgress.freeActionDone[chatKey]) {
      this.playStoryLines(['本周已经和陈岚聊过了。'], () => {
        this.storyPortrait?.clearAll?.(false);
      });
      return;
    }

    this.gs.dayProgress.freeActionDone[chatKey] = true;
    this.gs.director.flags ??= {};
    const chatCount = this.gs.director.flags.chenlan_chat_count ?? 0;
    this.storyPortrait?.applyCommands?.(['__PORTRAIT:chenlan:right__']);

    const chatDialog = DIRECTOR_CHAT_DIALOGS[chatCount];
    if (chatDialog) {
      if (!this.canPlayDirectorChat(chatDialog)) {
        this.playLockedDirectorChat();
        return;
      }
      this.showDirectorChatDialog(chatDialog, chatCount);
      return;
    }

    this.gs.director.affection += 5;
    this.gs.director.flags.chenlan_chat_count = chatCount + 1;

    // 检查特殊剧情
    let specialLine = null;
    if (this.gs.director.affection >= 30 && !this.gs.director.flags.director_affection_30_seen) {
      specialLine = '所长告诉你，照护工作最难的部分，有时不是方法，而是持续相信每个孩子都值得被理解。';
      this.gs.director.flags.director_affection_30_seen = true;
    } else if (this.gs.director.affection >= 20 && !this.gs.director.flags.director_affection_20_seen) {
      specialLine = '所长提到，有些孩子不是没有变化，只是变化很小、很慢，需要有人愿意看见。';
      this.gs.director.flags.director_affection_20_seen = true;
    } else if (this.gs.director.affection >= 10 && !this.gs.director.flags.director_affection_10_seen) {
      specialLine = '所长第一次比较认真地讲起照护所创立之初的困难。';
      this.gs.director.flags.director_affection_10_seen = true;
    }

    this.hud.update(this.gs);

    if (specialLine) {
      this.playStoryLines([
        specialLine,
        '所长好感度 +5。',
      ], () => {
        this.storyPortrait?.clearAll?.(false);
      }, { speaker: '陈岚' });
    } else {
      this.playStoryLines([
        '所长讲起自己刚开始做照护工作时的经历。那时候很多事也没有答案，只能一点点观察、记录、再调整。',
        '所长好感度 +5。',
      ], () => {
        this.storyPortrait?.clearAll?.(false);
      }, { speaker: '陈岚' });
    }
  }

  showDirectorChatDialog(chatDialog, chatCount) {
    // BGM 切换：所长聊天 04/06 → 信任与自白，07 → 深夜决断
    if (chatCount === 3 || chatCount === 5) {
      AudioManager.playBgm('intimate_trust');
    } else if (chatCount === 6) {
      AudioManager.playBgm('late_night_decision');
    }
    this.story.play([{ type: 'dialog', lines: chatDialog.lines }], () => {
      if (!chatDialog.choices?.length) {
        if (chatDialog.effects) {
          applyEffects(this.gs, chatDialog.effects);
        }
        this.gs.director.flags.chenlan_chat_count = chatCount + 1;
        this.hud.update(this.gs);
        AudioManager.playBgm('daily_bgm');
        const effectLines = chatDialog.effectLines ?? [];
        if (effectLines.length) {
          this.playStoryLines(effectLines, () => {
            this.storyPortrait?.clearAll?.(false);
          }, { speaker: '系统' });
        } else {
          this.storyPortrait?.clearAll?.(false);
        }
        return;
      }

      this.choice.showVNChoice([
        '你想了想，决定怎么回应陈岚。',
      ], chatDialog.choices.map((choice) => ({
        label: choice.label,
        action: () => this.resolveDirectorChatChoice(chatDialog, choice, chatCount),
      })), {
        choiceWidth: 820,
        choiceHeight: 58,
        choiceGap: 14,
        choiceStartY: 260,
        choiceFontSize: '17px',
      });
    });
  }

  resolveDirectorChatChoice(chatDialog, choice, chatCount) {
    const gain = choice.affection ?? 0;
    this.gs.director.affection += gain;
    if (choice.setFlags) {
      Object.entries(choice.setFlags).forEach(([key, value]) => {
        this.gs.director.flags[key] = value;
      });
    }
    this.gs.director.flags.chenlan_chat_count = chatCount + 1;
    this.hud.update(this.gs);

    this.story.play([{ type: 'dialog', lines: [...(choice.lines ?? []), `陈岚好感度 +${gain}。`] }], () => {
      AudioManager.playBgm('daily_bgm');
      this.storyPortrait?.clearAll?.(false);
    });
  }

  canPlayDirectorChat(chatDialog) {
    if (chatDialog.requiredAffection && this.gs.director.affection < chatDialog.requiredAffection) {
      return false;
    }
    if (chatDialog.requiredFlag && !this.gs.director.flags?.[chatDialog.requiredFlag]) {
      return false;
    }
    return true;
  }

  playLockedDirectorChat() {
    const pool = DIRECTOR_CHAT_LOCKED_LINES.length ? DIRECTOR_CHAT_LOCKED_LINES : [['【陈岚】今天先到这里。']];
    const lines = Phaser.Utils.Array.GetRandom(pool);
    this.story.play([{ type: 'dialog', lines }], () => {
      this.storyPortrait?.clearAll?.(false);
    });
  }

}




