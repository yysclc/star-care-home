import { hydrateParentCommunicationOutcome } from './parentCommunicationPremises.js';

export const PARENT_AI_EVENT_BINDINGS = [
  {
    week: 1,
    eventId: 'xiaoming_dinosaur',
    roomId: 'toyRoom',
    actionId: 'tidyToys',
    choiceIds: ['uniform_storage_then_restore', 'ask_xiaoming_first', 'label_fixed_position'],
  },
  {
    week: 1,
    eventId: 'xiaoli_sunlight',
    roomId: 'outdoorYard',
    actionId: 'observeLight',
    choiceIds: ['too_fast_sunlight_attempt', 'three_light_zones', 'move_everyone_to_shade'],
  },
  {
    week: 2,
    eventId: 'week2_toy_preference',
    roomId: 'toyRoom',
    actionId: 'observePreference',
    choiceIds: ['offer_multiple_textures', 'follow_familiar_texture', 'use_sound_toy'],
  },
  {
    week: 2,
    eventId: 'week2_sandpit_parallel_play',
    roomId: 'outdoorYard',
    actionId: 'sandpit',
    choiceIds: ['require_spoken_counting', 'add_visual_turn_line', 'adult_takes_over_play'],
  },
  {
    week: 3,
    eventId: 'week3_picture_book_emotion',
    roomId: 'library',
    actionId: 'readPictureBook',
    choiceIds: ['high_arousal_story', 'repetitive_language_rhythm', 'children_choose_book'],
  },
  {
    week: 3,
    eventId: 'week3_structured_movement',
    roomId: 'sensoryRoom',
    actionId: 'structuredMovement',
    choiceIds: ['high_intensity_first', 'low_intensity_then_build', 'parallel_pacing_groups'],
  },
  {
    week: 4,
    eventId: 'week4_charity_exhibition',
    roomId: 'paintingRoom',
    actionId: 'charityExhibition',
    choiceIds: ['select_for_visual_impact', 'child_assent_first', 'internal_review_before_release'],
  },
  {
    week: 4,
    eventId: 'week4_group_interaction',
    roomId: 'activityRoom',
    actionId: 'interactGroup',
    choiceIds: ['single_queue_rule', 'add_second_material_set', 'remove_one_child_only'],
  },
  {
    week: 5,
    eventId: 'week5_blocks_puzzle_prompting',
    roomId: 'toyRoom',
    actionId: 'blocksPuzzle',
    choiceIds: ['give_exact_answer', 'hint_edge_pieces', 'rotate_puzzle_view'],
  },
  {
    week: 6,
    eventId: 'week6_meal_sensory',
    roomId: 'diningRoom',
    actionId: 'observeMeal',
    choiceIds: ['separate_mixed_food', 'verbal_choice_and_wait'],
  },
  {
    week: 7,
    eventId: 'week7_final_observation',
    roomId: 'activityRoom',
    actionId: 'observeChildren',
    choiceIds: ['record_only_visible_changes', 'one_detail_per_child', 'prioritize_overlooked_children'],
  },
].map((binding) => ({
  ...binding,
  freeActionKey: `${binding.week}_${binding.roomId}_${binding.actionId}`,
}));

function inferChoiceTrustImpact(effects = {}) {
  const trust = Number(effects['group.trust']);
  if (Number.isFinite(trust) && trust !== 0) return trust;
  const stress = Number(effects['group.stress']);
  if (Number.isFinite(stress) && stress !== 0) return stress < 0 ? 1 : -1;
  return 0;
}

export function resolveParentAiEventOutcome({
  week,
  roomId,
  actionId,
  choiceIndex,
  choice,
} = {}) {
  const binding = PARENT_AI_EVENT_BINDINGS.find((candidate) => (
    Number(candidate.week) === Number(week)
    && candidate.roomId === roomId
    && candidate.actionId === actionId
  ));
  const choiceId = binding?.choiceIds?.[choiceIndex];
  if (!binding || !choiceId) return null;
  const effects = { ...(choice?.effects ?? {}) };

  return hydrateParentCommunicationOutcome({
    id: `${binding.eventId}:${choiceId}`,
    eventId: binding.eventId,
    week: Number(binding.week),
    roomId,
    actionId,
    choiceId,
    choiceLabel: choice?.label ?? '',
    keyLines: [...(choice?.lines ?? [])],
    effects,
    choiceTrustImpact: inferChoiceTrustImpact(effects),
  });
}
