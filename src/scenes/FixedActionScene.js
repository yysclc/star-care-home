import Phaser from 'phaser';
import { ASSET_KEYS, ASSET_PATHS, GAME_W } from '../core/Constants.js';
import { normalizeState, setResumeScene } from '../core/GameState.js';
import { getByPath, describeDelta } from '../core/ValueSystem.js';
import { fixedActionsComplete, enterFreePhase } from '../core/DayManager.js';
import { performFixedActivity } from '../systems/ActivitySystem.js';
import { ROOMS } from '../data/rooms.js';
import { FIXED_ACTIVITIES } from '../data/fixedActivities.js';
import { DIALOGS_ACTIONS } from '../data/dialogs_actions.js';
import { getWeeklyFixedDialog } from '../data/dialogs_fixed.js';
import HUD from '../ui/HUD.js';
import DialogBox from '../ui/DialogBox.js';
import { makeButton, makeCoverBackground, makeLabel } from '../ui/widgets.js';
import ResourceManager from '../core/ResourceManager.js';
import AudioManager from '../systems/AudioManager.js';

export default class FixedActionScene extends Phaser.Scene {
  constructor() {
    super('FixedActionScene');
  }

  init(data) {
    this.gs = normalizeState(data?.gs);
    this.gs.dayProgress.phase = 'fixed';
    setResumeScene(this.gs, this.sys.settings.key);
  }

  preload() {
    ResourceManager.queueImage(this, ASSET_KEYS.fixedPhaseBg, ASSET_PATHS.fixedPhaseBg);
  }

  create() {
    AudioManager.playBgm('minigame_bgm');
    this.isResolvingAction = false;
    this.isMinigameOpen = false;

    makeCoverBackground(this, ASSET_KEYS.fixedPhaseBg, 0.16);
    this.hud = new HUD(this, this.gs);
    this.dialog = new DialogBox(this);
    // 后台静默预加载 week2，不阻塞当前场景
    ResourceManager.preloadNextPack(this, 'week1');
    if (fixedActionsComplete(this.gs)) {
      this.showFixedCompleteStory();
      return;
    }
    this.drawScene();
  }

  drawScene() {
    const actionIndex = Math.min((this.gs.dayProgress.fixedActionsDone ?? 0) + 1, 3);
    makeLabel(this, GAME_W / 2, 98, `固定行动阶段 ${actionIndex} / 3`, {
      fontSize: '29px',
      align: 'center',
      color: '#ffffff',
    }).setOrigin(0.5).setShadow(0, 2, '#000000', 4, true, true);

    const startY = 210;
    const gapX = 240;
    const gapY = 82;
    const startX = GAME_W / 2 - gapX;

    const fixedRooms = ROOMS.filter((room) => Boolean(FIXED_ACTIVITIES[room.id]));

    fixedRooms.forEach((room, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const x = startX + col * gapX;
      const y = startY + row * gapY;
      const unlocked = Boolean(this.gs.rooms[room.id]);
      const activity = FIXED_ACTIVITIES[room.id];
      const label = unlocked
        ? `${room.displayName}\n消耗 ${activity?.actionCost ?? '-'} 行动力`
        : `${room.displayName}\n未解锁`;

      makeButton(this, x, y, 188, 58, label, () => this.selectActivity(room.id), {
        disabled: !unlocked,
        fontSize: '16px',
        fill: 0xfffbeb,
        hover: 0xfef3c7,
      }).setDepth(10);
    });
  }

  selectActivity(roomId) {
    if (this.isResolvingAction || this.isMinigameOpen) return;

    const activity = FIXED_ACTIVITIES[roomId];

    if (!activity || !this.gs.rooms[roomId]) {
      this.dialog.show(DIALOGS_ACTIONS.common.lockedRoom);
      return;
    }

    if ((this.gs.actionPoints ?? 0) < (activity.actionCost ?? 0)) {
      this.dialog.show(DIALOGS_ACTIONS.common.notEnoughActionPoints);
      return;
    }

    if (activity.minigameSceneKey) {
      this.openMinigame(activity, roomId);
      return;
    }

    this.finishFixedActivity(roomId, null);
  }

  openMinigame(activity, roomId) {
    this.isMinigameOpen = true;

    this.events.once('minigame:complete', (minigameResult) => {
      this.isMinigameOpen = false;
      // 小游戏结果音效
      const rating = minigameResult?.rating;
      if (rating === 'success') AudioManager.playSfx('sfx_success');
      else if (rating === 'normal') AudioManager.playSfx('sfx_neutral');
      else if (rating === 'fail') AudioManager.playSfx('sfx_fail');
      this.finishFixedActivity(roomId, minigameResult);
    });

    this.scene.launch(activity.minigameSceneKey, {
      roomId,
      returnSceneKey: this.sys.settings.key,
    });

    this.scene.bringToTop(activity.minigameSceneKey);
  }

  finishFixedActivity(roomId, minigameResult = null) {
    if (this.isResolvingAction) return;
    this.isResolvingAction = true;

    const result = performFixedActivity(this.gs, roomId, minigameResult?.rating ?? null);
    if (!result.ok) {
      this.isResolvingAction = false;
      const lines = result.reason === 'not_enough_action_points'
        ? DIALOGS_ACTIONS.common.notEnoughActionPoints
        : DIALOGS_ACTIONS.common.lockedRoom;
      this.dialog.show(lines);
      return;
    }

    this.hud.update(this.gs);
this.showActivityResult(result);
  }

  showActivityResult(result) {
    console.log('[fixed result]', {
      roomId: result.roomId,
      repeatCount: result.repeatCount,
      fixedActionsDone: this.gs.dayProgress.fixedActionsDone,
      fixedActionCounts: JSON.stringify(this.gs.dayProgress.fixedActionCounts),
    });

    const actionLines = getByPath(DIALOGS_ACTIONS, result.dialogKey, ['[固定行动结果 - 待写]']);

    const ratingLabelMap = {
      success: '成功',
      normal: '普通',
      fail: '失误',
    };
    const ratingLabel = ratingLabelMap[result.minigameRating] ?? null;

    const deltaLine = [
      describeDelta('行动力', result.deltas.actionPoints),
      describeDelta('孩子信任度', result.deltas.groupTrust),
      describeDelta('孩子压力值', result.deltas.groupStress),
    ].join('，');

    const minigameSummary = ratingLabel ? `小游戏评级${ratingLabel}` : null;

    const lines = [
  ...actionLines,
  ...(minigameSummary ? [minigameSummary] : []),
  deltaLine,
];

    this.dialog.show(lines, () => {
      if (fixedActionsComplete(this.gs)) {
        this.showFixedCompleteStory();
      } else {
        this.scene.restart({ gs: this.gs });
      }
    });
  }

  showFixedCompleteStory() {
    this.dialog.show(getWeeklyFixedDialog(this.gs.day, 'afterFixedActions'), () => {
      enterFreePhase(this.gs);
      setResumeScene(this.gs, 'OfficeScene');
      this.scene.start('OfficeScene', { gs: this.gs });
    });
  }
}
