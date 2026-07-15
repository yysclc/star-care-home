import Phaser from 'phaser';
import { normalizeState, applyEffects } from '../../core/GameState.js';
import { describeDelta } from '../../core/ValueSystem.js';
import { FREE_ACTIONS } from '../../data/freeActions.js';
import { WEEK1_ORANGE_STORY } from '../../data/week1OrangeStory.js';
import { WEEK4_ORANGE_STORY } from '../../data/week4OrangeStory.js';
import { WEEK5_ORANGE_STORY } from '../../data/week5OrangeStory.js';
import { WEEK7_ORANGE_REQUIREMENTS, WEEK7_ORANGE_STORY } from '../../data/week7OrangeStory.js';
import { getWeeklyOrangeInteraction } from '../../data/orangeStories.js';
import { unlockGlobalCollection } from '../../data/collections.js';
import { preloadRoomBackground, setupRoom, addRoomButtons, shouldPlayWeek6RoomEntry, playWeek6RoomEntry } from './roomHelpers.js';
import AudioManager from '../../systems/AudioManager.js';

export default class ActivityRoomScene extends Phaser.Scene {
  constructor() {
    super('ActivityRoomScene');
  }

  init(data) {
    this.gs = normalizeState(data?.gs);
  }

  preload() {
    preloadRoomBackground(this, 'activityRoom');
  }

  create() {
    AudioManager.playBgm('daily_bgm');
    setupRoom(this, this.gs, '活动室', 'activityRoom');

    if (this.shouldPlayWeek4CoveredPainting()) {
      this.playWeek4CoveredPainting();
      return;
    }

    if (this.shouldPlayWeek5FolderReview()) {
      this.playWeek5FolderReview();
      return;
    }

    if (this.shouldPlayWeek5DoorChair()) {
      this.playWeek5DoorChair();
      return;
    }

    if (shouldPlayWeek6RoomEntry(this.gs, 'activityRoom', this)) {
      playWeek6RoomEntry(this, this.gs, 'activityRoom', () => {
        addRoomButtons(this, this.gs, FREE_ACTIONS.activityRoom);
      });
      return;
    }

    addRoomButtons(this, this.gs, FREE_ACTIONS.activityRoom);
  }

  shouldPlayWeek4CoveredPainting() {
    return this.gs.day === 4
      && this.gs.orange?.flags?.week4_father_call_done
      && !this.gs.orange?.flags?.week4_covered_painting_done;
  }

  playWeek4CoveredPainting() {
    this.story.play([{ type: 'dialog', lines: WEEK4_ORANGE_STORY.coveredPainting.lines }], () => {
      this.gs.orange.flags.week4_covered_painting_done = true;
      this.hud.update(this.gs);
      addRoomButtons(this, this.gs, FREE_ACTIONS.activityRoom);
    });
  }

  runOrangeInteraction(action, finishOrangeInteraction) {
    if (this.gs.day === 5) {
      this.playWeek5FatherObservation(finishOrangeInteraction);
      return;
    }

    if (this.gs.day === 7) {
      this.playWeek7ActivityNode(action, finishOrangeInteraction);
      return;
    }

    if (this.gs.day !== 1) {
      const story = getWeeklyOrangeInteraction(this.gs.day, 'activityRoom');
      this.story.play([{ type: 'dialog', lines: story?.lines ?? [
        `第${this.gs.day}周橙橙活动室互动占位文本`,
      ] }], finishOrangeInteraction);
      return;
    }

    const node = WEEK1_ORANGE_STORY.activityRoomIntro;
    this.story.play([{ type: 'dialog', lines: node.lines }], () => {
      this.choice.showVNChoice(
        ['你现在要怎么做？'],
        node.choices.map((choice) => ({
          label: choice.label,
          action: () => this.finishOrangeChoice(node, choice, finishOrangeInteraction),
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

  finishOrangeChoice(node, choice, finishOrangeInteraction) {
    const changes = applyEffects(this.gs, { 'orange.affection': choice.affectionDelta });
    this.gs.orange.flags.week1_orange_met = true;
    this.gs.orange.flags.orange_first_contact = choice.id;
    this.gs.orange.flags.day1ActivityRoomFirstInteraction = true;
    this.hud.update(this.gs);

    this.story.play([{ type: 'dialog', lines: [
      ...choice.resultLines,
      ...changes.map((change) => describeDelta('橙橙好感值', change.delta)),
    ] }], finishOrangeInteraction);
  }

  playWeek5FatherObservation(onDone) {
    const story = WEEK5_ORANGE_STORY.fatherObservation;
    this.story.play([{ type: 'dialog', lines: story.lines }], () => {
      this.choice.showVNChoice(
        ['你现在要怎么做？'],
        story.choices.map((choice) => ({
          label: choice.label,
          action: () => this.resolveWeek5FatherObservationChoice(choice, onDone),
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

  resolveWeek5FatherObservationChoice(choice, onDone) {
    if (choice.affectionDelta) {
      this.gs.orange.affection = (this.gs.orange.affection ?? 0) + choice.affectionDelta;
    }
    this.gs.orange.flags.week5_father_observation_done = true;
    this.gs.orange.flags.week5_father_observation_choice = choice.id;
    this.hud.update(this.gs);

    this.story.play([{ type: 'dialog', lines: choice.resultLines }], onDone);
  }

  shouldPlayWeek5FolderReview() {
    return this.gs.day === 5
      && this.gs.orange?.flags?.week5_father_observation_done
      && !this.gs.orange?.flags?.week5_folder_review_done;
  }

  playWeek5FolderReview() {
    this.story.play([{ type: 'dialog', lines: WEEK5_ORANGE_STORY.folderReview.lines }], () => {
      this.gs.orange.flags.week5_folder_review_done = true;
      this.hud.update(this.gs);
      addRoomButtons(this, this.gs, FREE_ACTIONS.activityRoom);
    });
  }

  shouldPlayWeek5DoorChair() {
    return this.gs.day === 5
      && this.gs.orange?.flags?.week5_father_reflection_done
      && !this.gs.orange?.flags?.week5_door_chair_done;
  }

  playWeek5DoorChair() {
    const story = WEEK5_ORANGE_STORY.doorChair;
    this.story.play([{ type: 'dialog', lines: story.lines }], () => {
      this.choice.showVNChoice(
        ['你现在要怎么做？'],
        story.choices.map((choice) => ({
          label: choice.label,
          action: () => this.resolveWeek5DoorChairChoice(choice),
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

  resolveWeek5DoorChairChoice(choice) {
    if (choice.affectionDelta) {
      this.gs.orange.affection = (this.gs.orange.affection ?? 0) + choice.affectionDelta;
    }
    this.gs.orange.flags.week5_door_chair_done = true;
    this.gs.orange.flags.week5_door_chair_choice = choice.id;
    if (choice.obtainsTwoChairsArt) {
      this.gs.orange.flags.week5_two_chairs_art_obtained = true;
      this.gs.collections.items.two_chairs_art = true;
      unlockGlobalCollection('two_chairs_art');
    }
    this.hud.update(this.gs);

    this.story.play([{ type: 'dialog', lines: choice.resultLines }], () => {
      addRoomButtons(this, this.gs, FREE_ACTIONS.activityRoom);
    });
  }

  playWeek7ActivityNode(action, finishOrangeInteraction) {
    const requirement = WEEK7_ORANGE_REQUIREMENTS.node1;
    const current = {
      orangeAffection: Number(this.gs.orange?.affection) || 0,
      professional: Number(this.gs.attrs?.professional) || 0,
      communication: Number(this.gs.attrs?.communication) || 0,
    };

    const missing = [
      ['橙橙好感', current.orangeAffection, requirement.orangeAffection],
      ['专业理解', current.professional, requirement.professional],
      ['沟通能力', current.communication, requirement.communication],
    ].filter(([, value, target]) => value < target);

    if (missing.length) {
      const doneKey = action?.orangeKey || `7_activityRoom_orangeInteraction`;
      delete this.gs.dayProgress.orangeInteractionDone[doneKey];
      this.gs.actionPoints = Math.min(this.gs.maxActionPoints, this.gs.actionPoints + (action?.cost ?? 0));
      this.hud.update(this.gs);
      this.story.play([{ type: 'dialog', lines: [
        '你现在还接不住橙橙这一次回来的变化。',
        `需要：橙橙好感 ≥ ${requirement.orangeAffection}，专业理解 ≥ ${requirement.professional}，沟通能力 ≥ ${requirement.communication}`,
        `当前：橙橙好感 ${current.orangeAffection}/${requirement.orangeAffection}，专业理解 ${current.professional}/${requirement.professional}，沟通能力 ${current.communication}/${requirement.communication}`,
      ] }], finishOrangeInteraction);
      return;
    }

    this.story.play([{ type: 'dialog', lines: WEEK7_ORANGE_STORY.node1.lines }], () => {
      this.gs.orange.flags.week7_activity_room_done = true;
      this.hud.update(this.gs);
      finishOrangeInteraction?.();
    });
  }
}
