import Phaser from 'phaser';
import { applyEffects, normalizeState } from '../../core/GameState.js';
import { FREE_ACTIONS } from '../../data/freeActions.js';
import { preloadRoomBackground, setupRoom, addRoomButtons, addMapButton, shouldPlayWeek6RoomEntry, playWeek6RoomEntry } from './roomHelpers.js';
import { GAME_W } from '../../core/Constants.js';
import { makeLabel } from '../../ui/widgets.js';
import { WEEK1_ORANGE_STORY } from '../../data/week1OrangeStory.js';
import { WEEK2_ORANGE_STORY } from '../../data/week2OrangeStory.js';
import { WEEK3_ORANGE_STORY } from '../../data/week3OrangeStory.js';
import { WEEK4_ORANGE_STORY } from '../../data/week4OrangeStory.js';
import { WEEK7_ORANGE_STORY } from '../../data/week7OrangeStory.js';
import { unlockGlobalCollection } from '../../data/collections.js';
import ResourceManager from '../../core/ResourceManager.js';
import AudioManager from '../../systems/AudioManager.js';

export default class PaintingRoomScene extends Phaser.Scene {
  constructor() {
    super('PaintingRoomScene');
  }

  init(data) {
    this.gs = normalizeState(data?.gs);
  }

  preload() {
    preloadRoomBackground(this, 'paintingRoom');
    ResourceManager.queueImage(this, 'table_art', '/assets/collections/artwork/table_art.png');
    ResourceManager.queueImage(this, 'no_sound_art', '/assets/collections/artwork/no_sound_art.png');
    ResourceManager.queueImage(this, 'two_colors_art', '/assets/collections/artwork/two_colors_art.png');
    ResourceManager.queueImage(this, 'back_art', '/assets/collections/artwork/back_art.png');
  }

  create() {
    AudioManager.playBgm('orange_theme');
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      AudioManager.stopLoopingSfx('sfx_construction');
    });
    setupRoom(this, this.gs, '绘画室', 'paintingRoom');

    if (!this.gs.rooms.paintingRoom) {
      this.showLocked();
      return;
    }

    if (this.shouldPlayWeek1OrangeFollowup()) {
      this.playWeek1OrangeFollowup();
      return;
    }

    if (this.shouldPlayWeek2HeadphonesFollowup()) {
      this.playWeek2HeadphonesFollowup();
      return;
    }

    if (this.shouldPlayWeek3FinalPainting()) {
      this.playWeek3FinalPainting();
      return;
    }

    if (this.shouldPlayWeek4ConsentCards()) {
      this.playWeek4ConsentCards();
      return;
    }

    if (this.shouldPlayWeek7PaintingNode()) {
      this.playWeek7PaintingNode();
      return;
    }

    if (shouldPlayWeek6RoomEntry(this.gs, 'paintingRoom', this)) {
      playWeek6RoomEntry(this, this.gs, 'paintingRoom', () => {
        addRoomButtons(this, this.gs, FREE_ACTIONS.paintingRoom);
      });
      return;
    }

    addRoomButtons(this, this.gs, FREE_ACTIONS.paintingRoom);
  }

  runOrangeInteraction(action, onDone) {
    if (this.gs.day === 2) {
      this.playWeek2NoiseEvent(onDone);
      return;
    }

    if (this.gs.day === 3) {
      this.playWeek3PaperChoice(onDone);
      return;
    }

    if (this.gs.day === 4) {
      this.playWeek4DisplayConsent(onDone);
      return;
    }

    onDone?.();
  }

  shouldPlayWeek1OrangeFollowup() {
    return this.gs.day === 1
      && this.gs.orange?.flags?.week1_orange_review_done
      && !this.gs.orange?.flags?.week1_painting_followup_done;
  }

  playWeek1OrangeFollowup() {
    const story = WEEK1_ORANGE_STORY.paintingRoomFollowup;
    this.story.play([{ type: 'dialog', lines: story.lines }], () => {
      this.choice.showVNChoice(
        ['你现在要怎么做？'],
        story.choices.map((choice) => ({
          label: choice.label,
          action: () => this.resolveWeek1OrangeFollowupChoice(choice),
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

  resolveWeek1OrangeFollowupChoice(choice) {
    const changes = applyEffects(this.gs, { 'orange.affection': choice.affectionDelta ?? 0 });
    this.gs.orange.flags.week1_painting_followup_done = true;
    if (choice.obtainsTable) {
      this.gs.orange.flags.week1_table_art_obtained = true;
      this.gs.collections.items.table_art = true;
      unlockGlobalCollection('table_art');
    }
    this.hud.update(this.gs);

    const changeLines = changes
      .filter((change) => change.delta !== 0)
      .map((change) => `橙橙好感值 ${change.delta > 0 ? '+' : ''}${change.delta}`);

    const returnBgLines = choice.obtainsTable ? ['__BG:bgPaintingRoom__'] : [];

    this.story.play([{ type: 'dialog', lines: [...choice.resultLines, ...changeLines, ...returnBgLines] }], () => {
      addRoomButtons(this, this.gs, FREE_ACTIONS.paintingRoom);
    });
  }

  shouldPlayWeek2HeadphonesFollowup() {
    return this.gs.day === 2
      && this.gs.orange?.flags?.week2_orange_review_done
      && this.gs.orange?.flags?.week2_noise_headphones_purchased
      && !this.gs.orange?.flags?.week2_headphones_followup_done;
  }

  playWeek2NoiseEvent(onDone) {
    AudioManager.playBgm('sensory_storm');
    AudioManager.playLoopingSfx('sfx_construction', { volume: 0.2 });
    const story = WEEK2_ORANGE_STORY.noiseEvent;
    this.story.play([{ type: 'dialog', lines: story.lines }], () => {
      this.choice.showVNChoice(
        ['你现在要怎么做？'],
        story.choices.map((choice) => ({
          label: choice.label,
          action: () => this.resolveWeek2NoiseChoice(choice, onDone),
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

  resolveWeek2NoiseChoice(choice, onDone) {
    const changes = applyEffects(this.gs, { 'orange.affection': choice.affectionDelta ?? 0 });
    this.gs.orange.flags.week2_noise_event_done = true;
    this.gs.orange.flags.week2_noise_response = choice.id;
    this.hud.update(this.gs);

    const afterChoiceLines = WEEK3_ORANGE_STORY.paperChoice.afterChoiceLines ?? [];
    this.story.play([{ type: 'dialog', lines: [...choice.resultLines, ...afterChoiceLines] }], () => {
      AudioManager.stopLoopingSfx('sfx_construction');
      AudioManager.playBgm('orange_theme');
      onDone?.();
    });
  }

  playWeek2HeadphonesFollowup() {
    const story = WEEK2_ORANGE_STORY.headphonesFollowup;
    this.story.play([{ type: 'dialog', lines: story.lines }], () => {
      this.choice.showVNChoice(
        ['你现在要怎么做？'],
        story.choices.map((choice) => ({
          label: choice.label,
          action: () => this.resolveWeek2HeadphonesChoice(choice),
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

  resolveWeek2HeadphonesChoice(choice) {
    const changes = applyEffects(this.gs, { 'orange.affection': choice.affectionDelta ?? 0 });
    this.gs.orange.flags.week2_headphones_followup_done = true;
    this.gs.orange.flags.week2_headphones_choice = choice.id;
    if (choice.obtainsNoSound) {
      this.gs.orange.flags.week2_no_sound_art_obtained = true;
      this.gs.collections.items.no_sound_art = true;
      unlockGlobalCollection('no_sound_art');
    }
    this.hud.update(this.gs);

    const changeLines = changes
      .filter((change) => change.delta !== 0)
      .map((change) => `橙橙好感值 ${change.delta > 0 ? '+' : ''}${change.delta}`);

    this.story.play([{ type: 'dialog', lines: [...choice.resultLines, ...changeLines] }], () => {
      addRoomButtons(this, this.gs, FREE_ACTIONS.paintingRoom);
    });
  }

  shouldPlayWeek3FinalPainting() {
    return this.gs.day === 3
      && this.gs.orange?.flags?.week3_orange_review_done
      && !this.gs.orange?.flags?.week3_final_choice_done;
  }

  playWeek3PaperChoice(onDone) {
    const story = WEEK3_ORANGE_STORY.paperChoice;
    this.story.play([{ type: 'dialog', lines: story.lines }], () => {
      this.choice.showVNChoice(
        ['你现在要怎么做？'],
        story.choices.map((choice) => ({
          label: choice.label,
          action: () => this.resolveWeek3PaperChoice(choice, onDone),
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

  resolveWeek3PaperChoice(choice, onDone) {
    const changes = applyEffects(this.gs, { 'orange.affection': choice.affectionDelta ?? 0 });
    this.gs.orange.flags.week3_paper_choice_done = true;
    this.gs.orange.flags.week3_paper_choice = choice.id;
    this.hud.update(this.gs);

    const changeLines = changes
      .filter((change) => change.delta !== 0)
      .map((change) => `橙橙好感值 ${change.delta > 0 ? '+' : ''}${change.delta}`);

    this.story.play([{ type: 'dialog', lines: [...choice.resultLines, ...changeLines] }], () => {
      onDone?.();
    });
  }

  playWeek3FinalPainting() {
    const story = WEEK3_ORANGE_STORY.finalPainting;
    this.story.play([{ type: 'dialog', lines: story.lines }], () => {
      this.choice.showVNChoice(
        ['你现在要怎么做？'],
        story.choices.map((choice) => ({
          label: choice.label,
          action: () => this.resolveWeek3FinalPaintingChoice(choice),
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

  resolveWeek3FinalPaintingChoice(choice) {
    const changes = applyEffects(this.gs, { 'orange.affection': choice.affectionDelta ?? 0 });
    this.gs.orange.flags.week3_final_choice_done = true;
    this.gs.orange.flags.week3_final_choice = choice.id;
    if (choice.obtainsTwoColors) {
      this.gs.orange.flags.week3_two_colors_art_obtained = true;
      this.gs.orange.flags.orange_choice_system = true;
      this.gs.collections.items.two_colors_art = true;
      unlockGlobalCollection('two_colors_art');
    }
    this.hud.update(this.gs);

    this.story.play([{ type: 'dialog', lines: choice.resultLines }], () => {
      addRoomButtons(this, this.gs, FREE_ACTIONS.paintingRoom);
    });
  }

  playWeek4DisplayConsent(onDone) {
    const story = WEEK4_ORANGE_STORY.displayConsent;
    this.story.play([{ type: 'dialog', lines: story.lines }], () => {
      this.choice.showVNChoice(
        ['你现在要怎么做？'],
        story.choices.map((choice) => ({
          label: choice.label,
          action: () => this.resolveWeek4DisplayConsentChoice(choice, onDone),
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

  resolveWeek4DisplayConsentChoice(choice, onDone) {
    const changes = applyEffects(this.gs, { 'orange.affection': choice.affectionDelta ?? 0 });
    this.gs.orange.flags.week4_display_consent_done = true;
    this.gs.orange.flags.week4_display_consent_choice = choice.id;
    this.hud.update(this.gs);

    const changeLines = changes
      .filter((change) => change.delta !== 0)
      .map((change) => `橙橙好感值 ${change.delta > 0 ? '+' : ''}${change.delta}`);

    this.story.play([{ type: 'dialog', lines: [...choice.resultLines, ...changeLines] }], () => {
      onDone?.();
    });
  }

  shouldPlayWeek4ConsentCards() {
    return this.gs.day === 4
      && this.gs.orange?.flags?.week4_covered_painting_done
      && !this.gs.orange?.flags?.week4_consent_cards_done;
  }

  shouldPlayWeek7PaintingNode() {
    return this.gs.day === 7
      && this.gs.orange?.flags?.week7_activity_room_done
      && !this.gs.orange?.flags?.week7_painting_room_done;
  }

  playWeek7PaintingNode() {
    AudioManager.playBgm('sensory_storm');
    AudioManager.playLoopingSfx('sfx_construction', { volume: 0.18 });
    this.story.play([{ type: 'dialog', lines: WEEK7_ORANGE_STORY.node2.lines }], () => {
      AudioManager.stopLoopingSfx('sfx_construction');
      AudioManager.playBgm('orange_theme');
      this.gs.orange.flags.week7_painting_room_done = true;
      this.hud.update(this.gs);
      addRoomButtons(this, this.gs, FREE_ACTIONS.paintingRoom);
    });
  }

  playWeek4ConsentCards() {
    const story = WEEK4_ORANGE_STORY.consentCards;
    this.story.play([{ type: 'dialog', lines: story.lines }], () => {
      this.choice.showVNChoice(
        ['你现在要怎么做？'],
        story.choices.map((choice) => ({
          label: choice.label,
          action: () => this.resolveWeek4ConsentCardsChoice(choice),
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

  resolveWeek4ConsentCardsChoice(choice) {
    const changes = applyEffects(this.gs, { 'orange.affection': choice.affectionDelta ?? 0 });
    this.gs.orange.flags.week4_consent_cards_done = true;
    this.gs.orange.flags.week4_consent_choice = choice.id;
    this.gs.orange.flags.orange_boundary_respected = choice.id === 'accept';
    if (choice.obtainsBackArt) {
      this.gs.orange.flags.week4_back_art_obtained = true;
      this.gs.collections.items.back_art = true;
      unlockGlobalCollection('back_art');
    }
    this.hud.update(this.gs);

    this.story.play([{ type: 'dialog', lines: choice.resultLines }], () => {
      addRoomButtons(this, this.gs, FREE_ACTIONS.paintingRoom);
    });
  }

  showLocked() {
    makeLabel(this, GAME_W / 2, 245, '尚未开放：请先回办公室，用电脑修建绘画室。', {
      fontSize: '22px', align: 'center', color: '#ffffff', wordWrap: { width: 650 },
    }).setOrigin(0.5).setShadow(0, 2, '#000000', 4, true, true);

    addMapButton(this, this.gs);
  }
}
