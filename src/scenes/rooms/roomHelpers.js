import { ASSET_KEYS, ASSET_PATHS, CONTENT_CENTER_X, GAME_H, GAME_W, contentX } from '../../core/Constants.js';
import { applyEffects, spendActionPoints } from '../../core/GameState.js';
import { getByPath, describeDelta } from '../../core/ValueSystem.js';
import { DIALOGS_ACTIONS } from '../../data/dialogs_actions.js';
import { getFreeActionSpecialEvent } from '../../data/freeActionSpecialEvents.js';
import { WEEK6_OBSERVATION_EVENTS } from '../../data/week6ObservationStories.js';
import { freeActionLayouts } from '../../data/freeActionLayouts.js';
import { isOrangeInRoom, getOrangeLocation } from '../../data/orangeSchedule.js';
import { getWeeklyOrangeInteraction } from '../../data/orangeStories.js';
import HUD from '../../ui/HUD.js';
import DialogBox from '../../ui/DialogBox.js';
import ChoicePanel from '../../ui/ChoicePanel.js';
import StoryPlayer from '../../ui/StoryPlayer.js';
import StoryPortraitController from '../../ui/StoryPortraitController.js';
import StoryBackgroundController from '../../ui/StoryBackgroundController.js';
import { makeButton, makeCoverBackground, makeLabel } from '../../ui/widgets.js';
import ResourceManager from '../../core/ResourceManager.js';
import { resolveParentAiEventOutcome } from '../../../parent-ai-core/index.js';

const EFFECT_LABELS = {
  'attrs.professional': '专业理解',
  'attrs.communication': '沟通能力',
  'attrs.physicalExp': '体能经验',
  'group.trust': '孩子信任度',
  'group.stress': '孩子压力值',
  'orange.affection': '橙橙好感值',
  'director.affection': '所长好感度',
  reputation: '名望',
  parentTrust: '家长信任',
  funds: '金钱',
  actionPoints: '行动力',
};

const CHARITY_EXHIBITION_WARNING_LINES = [
  '【陈岚】我们可以为了照护所争取资源，但不能让孩子的表达反复变成筹款材料。',
  '【陈岚】一次展示需要同意、说明和撤回机制；如果它开始变成固定收入，就已经偏了。',
];

const CHARITY_EXHIBITION_BLOCKED_LINES = [
  '【陈岚】这次先停。',
  '【陈岚】孩子的画不是照护所的库存，也不是我们资金周转的办法。要筹钱，我们换一种不消耗孩子表达的方式。',
];

function isCharityExhibitionAction(gs, roomId, actionId) {
  return roomId === 'paintingRoom' && actionId === 'charityExhibition';
}

function getCharityExhibitionCount(gs) {
  return Number(gs?.flags?.charityExhibitionCount ?? 0) || 0;
}

function incrementCharityExhibitionCount(gs) {
  gs.flags ??= {};
  gs.flags.charityExhibitionCount = getCharityExhibitionCount(gs) + 1;
  return gs.flags.charityExhibitionCount;
}

function getActionLabel(gs, roomId, action) {
  if (Number(gs?.day) === 4 && isCharityExhibitionAction(gs, roomId, action.id)) {
    return '处理公益展示邀约';
  }
  return action.label;
}

function getRoomBgKey(roomId) {
  return ASSET_KEYS.roomBgs?.[roomId] ?? ASSET_KEYS.activityPlaceholder;
}

function getRoomBgPath(roomId) {
  return ASSET_PATHS.roomBgs?.[roomId] ?? ASSET_PATHS.activityPlaceholder;
}

function getRoomOrangeBgKey(roomId) {
  return ASSET_KEYS.roomBgsWithOrange?.[roomId] ?? null;
}

function getRoomOrangeBgPath(roomId) {
  return ASSET_PATHS.roomBgsWithOrange?.[roomId] ?? null;
}

function ensureDayProgressBuckets(gs) {
  if (!gs.dayProgress) {
    gs.dayProgress = {};
  }

  if (!gs.dayProgress.freeActionDone) {
    gs.dayProgress.freeActionDone = {};
  }

  if (!gs.dayProgress.orangeInteractionDone) {
    gs.dayProgress.orangeInteractionDone = {};
  }

  if (!Array.isArray(gs.dayProgress.parentAiTriggeredEvents)) {
    gs.dayProgress.parentAiTriggeredEvents = [];
  }

  if (!Array.isArray(gs.dayProgress.parentAiTriggeredOutcomes)) {
    gs.dayProgress.parentAiTriggeredOutcomes = [];
  }
}

function markParentAiEventTriggered(gs, choice, { roomId, actionId, choiceIndex } = {}) {
  const resolvedOutcome = resolveParentAiEventOutcome({
    week: gs.day,
    roomId,
    actionId,
    choiceIndex,
    choice,
  });
  if (!resolvedOutcome) return false;
  const storedOutcome = {
    id: resolvedOutcome.id,
    eventId: resolvedOutcome.eventId,
    week: resolvedOutcome.week,
    roomId: resolvedOutcome.roomId,
    actionId: resolvedOutcome.actionId,
    choiceId: resolvedOutcome.choiceId,
    choiceLabel: resolvedOutcome.choiceLabel,
    keyLines: resolvedOutcome.keyLines,
  };
  ensureDayProgressBuckets(gs);
  if (!gs.dayProgress.parentAiTriggeredEvents.includes(storedOutcome.eventId)) {
    gs.dayProgress.parentAiTriggeredEvents.push(storedOutcome.eventId);
  }
  const existingIndex = gs.dayProgress.parentAiTriggeredOutcomes
    .findIndex((item) => item?.id === storedOutcome.id);
  if (existingIndex >= 0) {
    gs.dayProgress.parentAiTriggeredOutcomes[existingIndex] = storedOutcome;
  } else {
    gs.dayProgress.parentAiTriggeredOutcomes.push(storedOutcome);
  }
  return true;
}

function showParentAiFollowUpNotice(scene) {
  const depth = 2500;
  const noticeW = 460;
  const noticeH = 56;
  const cx = GAME_W / 2;
  const noticeY = GAME_H / 2 - 80;

  const noticeBg = scene.add.graphics().setDepth(depth).setAlpha(0);
  noticeBg.fillStyle(0x6f4318, 0.92);
  noticeBg.fillRoundedRect(cx - noticeW / 2, noticeY - noticeH / 2, noticeW, noticeH, 14);

  const noticeTxt = scene.add.text(cx, noticeY, '有家长想进一步确认今天的情况', {
    fontFamily: '"MaokenZhuyuan", "Microsoft YaHei", sans-serif',
    fontSize: '24px',
    color: '#ffe9bd',
    align: 'center',
  }).setOrigin(0.5).setDepth(depth + 1).setAlpha(0);

  scene.tweens.add({
    targets: [noticeBg, noticeTxt],
    alpha: 1,
    duration: 160,
    ease: 'Quad.easeOut',
  });
  scene.time.delayedCall(1700, () => {
    scene.tweens.add({
      targets: [noticeBg, noticeTxt],
      alpha: 0,
      duration: 220,
      ease: 'Quad.easeIn',
      onComplete: () => {
        noticeBg.destroy();
        noticeTxt.destroy();
      },
    });
  });
}

function getOrangeDoneKey(gs, roomId) {
  return `${gs.day}_${roomId}_orangeInteraction`;
}

function canShowOrangeEntry(gs) {
  const week = Number(gs?.day);
  if (!Number.isFinite(week)) return false;
  const flags = gs?.orange?.flags ?? {};
  const isGodMode = Boolean(gs?.flags?.godModeEnabled);
  if (flags[`week${week}_orange_locked`] && !isGodMode) return false;
  if (isGodMode) return true;
  if (week <= 1) return true;
  for (let prevWeek = week - 1; prevWeek >= 1; prevWeek -= 1) {
    if (!getOrangeLocation(prevWeek)) continue;
    return flags[`week${prevWeek}_orange_result`] === 'success';
  }
  return true;
}

function buildChangeSummary(cost, changes) {
  const deltas = new Map();
  const addDelta = (label, delta) => {
    deltas.set(label, (deltas.get(label) ?? 0) + delta);
  };

  if (cost) {
    addDelta('行动力', -cost);
  }

  changes.forEach((change) => {
    addDelta(EFFECT_LABELS[change.path] ?? change.path, change.delta);
  });

  const changeLines = [...deltas.entries()]
    .filter(([, delta]) => delta !== 0)
    .map(([label, delta]) => describeDelta(label, delta));

  return changeLines.length
    ? `${changeLines.join('，')}。`
    : '没有额外变化。';
}

const REQUIREMENT_LABELS = {
  professional: '专业理解',
  communication: '沟通能力',
  physicalExp: '体能经验',
};

function getRequirementValue(gs, key) {
  return Number(gs?.attrs?.[key]) || 0;
}

function formatRequirement(requirement) {
  const attrs = requirement?.attrs ?? {};
  return Object.entries(attrs)
    .map(([key, value]) => `${REQUIREMENT_LABELS[key] ?? key} ≥ ${value}`)
    .join(' 且 ');
}

function formatCurrentRequirement(gs, requirement) {
  const attrs = requirement?.attrs ?? {};
  return Object.entries(attrs)
    .map(([key, value]) => `${REQUIREMENT_LABELS[key] ?? key} ${getRequirementValue(gs, key)}/${value}`)
    .join('，');
}

function isRequirementMet(gs, requirement) {
  const attrs = requirement?.attrs ?? {};
  return Object.entries(attrs)
    .every(([key, value]) => getRequirementValue(gs, key) >= value);
}

function playStoryLines(scene, lines, onDone) {
  scene.story.play([{ type: 'dialog', lines }], onDone);
}

function getWeek6RoomIntroLines(gs, roomId, event) {
  const intro = event.intro ?? [];
  if (roomId !== 'sensoryRoom') return intro;

  const sensoryCgSeen = Boolean(gs?.collections?.items?.sensory_cg);
  if (!sensoryCgSeen) return intro;

  return intro.filter((line) => {
    const text = String(line ?? '');
    return text !== '__BG:sensory_cg__'
      && text !== '__COLLECT:sensory_cg__'
      && text !== '获得CG：最高点的秋千（可在收集系统查看）';
  });
}

export function shouldPlayWeek6RoomEntry(gs, roomId, scene = null) {
  if (Number(gs?.day) !== 6) return false;
  const event = WEEK6_OBSERVATION_EVENTS?.[roomId];
  if (!event) return false;
  const done = gs.dayProgress?.week6RoomEntryDone ?? {};
  return !done[roomId];
}

export function playWeek6RoomEntry(scene, gs, roomId, onDone) {
  const roomEvents = WEEK6_OBSERVATION_EVENTS?.[roomId];
  const event = roomEvents ? Object.values(roomEvents)[0] : null;
  if (!event) {
    onDone?.();
    return;
  }

  const finish = (choice) => {
    const requirement = event.requirements?.[choice.id] ?? choice.requirement;
    if (requirement && !isRequirementMet(gs, requirement)) {
      playStoryLines(scene, [
        '你现在还接不住这个判断。',
        `需要：${formatRequirement(requirement)}`,
        `当前：${formatCurrentRequirement(gs, requirement)}`,
      ], onDone);
      return;
    }

    const changes = applyEffects(gs, choice.effects || {});
    gs.dayProgress ??= {};
    gs.dayProgress.week6RoomEntryDone ??= {};
    gs.dayProgress.week6RoomEntryDone[roomId] = true;
    gs.dayProgress.week6RoomEntryChoice ??= {};
    gs.dayProgress.week6RoomEntryChoice[roomId] = choice.id;
    scene.hud.update(gs);

    const changeSummary = buildChangeSummary(0, changes);
    playStoryLines(scene, [...(choice.lines ?? []), changeSummary], onDone);
  };

  playStoryLines(scene, getWeek6RoomIntroLines(gs, roomId, event), () => {
    scene.choice.showVNChoice(
      ['你需要做出一个判断。'],
      (event.choices ?? []).map((choice) => {
        const requirement = event.requirements?.[choice.id] ?? choice.requirement;
        return {
          label: requirement
            ? `${choice.label}\n（需要：${formatRequirement(requirement)}）`
            : choice.label,
          action: () => finish(choice),
        };
      }),
      {
        choiceWidth: 720,
        choiceHeight: 64,
        choiceGap: 14,
        choiceStartY: 210,
        choiceFontSize: '17px',
      }
    );
  });
}

export function preloadRoomBackground(scene, roomId) {
  ResourceManager.queueImage(scene, ASSET_KEYS.activityPlaceholder, ASSET_PATHS.activityPlaceholder);
  const key = getRoomBgKey(roomId);
  const path = getRoomBgPath(roomId);
  if (key !== ASSET_KEYS.activityPlaceholder) {
    ResourceManager.queueImage(scene, key, path);
  }
  const orangeKey = getRoomOrangeBgKey(roomId);
  const orangePath = getRoomOrangeBgPath(roomId);
  if (orangeKey && orangePath) {
    ResourceManager.queueImage(scene, orangeKey, orangePath);
  }
}

export function setupRoom(scene, gs, title, roomId) {
  scene.isResolvingAction = false;
  scene.roomId = roomId;
  ensureDayProgressBuckets(gs);

  const roomBgKey = getRoomBgKey(roomId);

  let bgKey = ASSET_KEYS.activityPlaceholder;
  const hasOrange = isOrangeInRoom(gs.day, roomId);
  const orangeBgKey = getRoomOrangeBgKey(roomId);

  if (hasOrange && orangeBgKey && scene.textures.exists(orangeBgKey)) {
    bgKey = orangeBgKey;
  } else if (scene.textures.exists(roomBgKey)) {
    bgKey = roomBgKey;
  }

  makeCoverBackground(scene, bgKey, 0.12);
  scene.hud = new HUD(scene, gs);
  scene.dialog = new DialogBox(scene);
  scene.choice = new ChoicePanel(scene);
  scene.storyBg = new StoryBackgroundController(scene);
  scene.storyPortrait = new StoryPortraitController(scene, gs);
  scene.story = new StoryPlayer(scene, scene.dialog);

  scene.events.once('shutdown', () => {
    scene.storyBg?.destroy?.();
    scene.storyPortrait?.destroy?.();
  });

  makeLabel(scene, CONTENT_CENTER_X, 98, title, {
    fontSize: '30px',
    align: 'center',
    color: '#ffffff',
  }).setOrigin(0.5).setShadow(0, 2, '#000000', 4, true, true);
}

export function addMapButton(scene, gs) {
  makeButton(scene, contentX(842), 560, 180, 44, '进入地图', () => {
    scene.scene.launch('MapScene', { gs, fromScene: scene.scene.key });
    scene.scene.bringToTop('MapScene');
  }, { fontSize: '21px', fill: 0xfffbeb, hover: 0xfef3c7 }).setDepth(10);
}

export function addRoomButtons(scene, gs, actions, { startY = 214 } = {}) {
  const rId = scene.roomId || 'activityRoom';
  const layouts = freeActionLayouts[rId] || {};
  ensureDayProgressBuckets(gs);

  const finalActions = [...actions];
  const orangeKey = getOrangeDoneKey(gs, rId);
  const schedule = getOrangeLocation(gs.day);

  if (
    schedule &&
    schedule.roomId === rId &&
    canShowOrangeEntry(gs) &&
    !gs.dayProgress.orangeInteractionDone[orangeKey]
  ) {
    finalActions.push({
      id: 'orangeInteraction',
      label: schedule.label,
      cost: 0,
      type: 'orange',
      orangeKey,
    });
  }

  finalActions.forEach((action, i) => {
    let bx = CONTENT_CENTER_X;
    let by = startY + i * 58;
    let bw = 340;
    let bh = 44;

    if (layouts[action.id]) {
      const pos = layouts[action.id];
      bx = pos.x;
      by = pos.y;
      bw = pos.w ?? 170;
      bh = pos.h ?? 58;
    }

    let apText = action.buttonHint ? `\n${action.buttonHint}` : '';
    if (!apText && action.cost && action.cost > 0) {
      apText = `\n（行动力 -${action.cost}）`;
    } else if (!apText && action.effects?.actionPoints && action.effects.actionPoints > 0) {
      apText = `\n（行动力 +${action.effects.actionPoints}）`;
    }

    const label = getActionLabel(gs, rId, action);
    const btn = makeButton(scene, bx, by, bw, bh, `${label}${apText}`, () => {
      if (action.type === 'orange') {
        if (scene.isResolvingAction) return;
        scene.isResolvingAction = true;

        const cost = action.cost ?? 0;
        if (!spendActionPoints(gs, cost)) {
          playStoryLines(scene, DIALOGS_ACTIONS.common.notEnoughActionPoints, () => {
            scene.isResolvingAction = false;
          });
          return;
        }

        ensureDayProgressBuckets(gs);
        const doneKey = action.orangeKey || getOrangeDoneKey(gs, rId);
        gs.dayProgress.orangeInteractionDone[doneKey] = true;

        // 先直接移除当前按钮，让玩家立刻看到“已经点过”。
        btn.destroy();

        if (typeof scene.runOrangeInteraction === 'function') {
          scene.runOrangeInteraction(action, () => {
            scene.isResolvingAction = false;
            scene.scene.restart({ gs });
          });
          return;
        }

        const story = getWeeklyOrangeInteraction(gs.day, rId);
        playStoryLines(scene, story?.lines ?? [
          `第${gs.day}周橙橙互动占位文本`,
        ], () => {
          scene.isResolvingAction = false;
          scene.scene.restart({ gs });
        });
        return;
      }

      runFreeAction(scene, gs, action);
    }, { fontSize: '18px', fill: 0xfffbeb, hover: 0xfef3c7 }).setDepth(10);
  });

  addMapButton(scene, gs);
}

export function runFreeAction(scene, gs, action) {
  if (scene.isResolvingAction) return;
  scene.isResolvingAction = true;

  ensureDayProgressBuckets(gs);
  const key = `${gs.day}_${scene.roomId}_${action.id}`;
  const cost = action.cost ?? 0;

  if (gs.dayProgress.freeActionDone[key] && action.alreadyDoneLines) {
    playStoryLines(scene, action.alreadyDoneLines, () => {
      scene.isResolvingAction = false;
    });
    return;
  }

  if (gs.dayProgress.freeActionDone[key]) {
    playStoryLines(scene, ['本周已经做过了。'], () => {
      scene.isResolvingAction = false;
    });
    return;
  }

  if (isCharityExhibitionAction(gs, scene.roomId, action.id) && getCharityExhibitionCount(gs) >= 3) {
    playStoryLines(scene, CHARITY_EXHIBITION_BLOCKED_LINES, () => {
      scene.isResolvingAction = false;
    });
    return;
  }

  if (!spendActionPoints(gs, cost)) {
    playStoryLines(scene, DIALOGS_ACTIONS.common.notEnoughActionPoints, () => {
      scene.isResolvingAction = false;
    });
    return;
  }

  const specialEvent = getFreeActionSpecialEvent(gs.day, scene.roomId, action.id);
  if (specialEvent) {
    runSpecialFreeAction(scene, gs, action, key, cost, specialEvent);
    return;
  }

  const changes = applyEffects(gs, action.effects || {});
  gs.dayProgress.freeActionDone[key] = true;
  const charityCount = isCharityExhibitionAction(gs, scene.roomId, action.id)
    ? incrementCharityExhibitionCount(gs)
    : 0;
  scene.hud.update(gs);

  const text = getByPath(DIALOGS_ACTIONS, action.textKey, ['[自由行动反馈 - 待写]']);
  const changeSummary = buildChangeSummary(cost, changes);

  playStoryLines(scene, [
    ...text,
    changeSummary,
    ...(charityCount === 3 ? CHARITY_EXHIBITION_WARNING_LINES : []),
  ], () => {
    scene.isResolvingAction = false;
  });
}

function runSpecialFreeAction(scene, gs, action, key, cost, specialEvent) {
  const choices = (specialEvent.choices ?? []).map((choice, choiceIndex) => ({
    label: specialEvent.requirements?.[choice.id]
      ? `${choice.label}\n（需要：${formatRequirement(specialEvent.requirements[choice.id])}）`
      : choice.label,
    action: () => {
      const requirement = specialEvent.requirements?.[choice.id] ?? choice.requirement;
      if (requirement && !isRequirementMet(gs, requirement)) {
        if (cost) {
          gs.actionPoints = Math.min(gs.maxActionPoints, gs.actionPoints + cost);
          scene.hud.update(gs);
        }
        playStoryLines(scene, [
          '你现在还接不住这个判断。',
          `需要：${formatRequirement(requirement)}`,
          `当前：${formatCurrentRequirement(gs, requirement)}`,
        ], () => {
          scene.isResolvingAction = false;
        });
        return;
      }

      const changes = applyEffects(gs, choice.effects || {});
      gs.dayProgress.freeActionDone[key] = true;
      const charityCount = isCharityExhibitionAction(gs, scene.roomId, action.id)
        ? incrementCharityExhibitionCount(gs)
        : 0;
      const hasParentAiFollowUp = markParentAiEventTriggered(gs, choice, {
        roomId: scene.roomId,
        actionId: action.id,
        choiceIndex,
      });
      scene.hud.update(gs);

      const changeSummary = buildChangeSummary(cost, changes);
      playStoryLines(scene, [
        ...(choice.lines ?? []),
        changeSummary,
        ...(charityCount === 3 ? CHARITY_EXHIBITION_WARNING_LINES : []),
      ], () => {
        if (hasParentAiFollowUp) showParentAiFollowUpNotice(scene);
        scene.isResolvingAction = false;
      });
    },
  }));

  playStoryLines(scene, specialEvent.intro ?? [], () => {
    scene.choice.showVNChoice(
      ['你需要做出一个判断。'],
      choices,
      {
        choiceWidth: 720,
        choiceHeight: 64,
        choiceGap: 14,
        choiceStartY: 210,
        choiceFontSize: '17px',
      }
    );
  });
}

