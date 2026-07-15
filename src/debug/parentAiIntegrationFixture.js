import { createInitialState } from '../core/GameState.js';
import { getFreeActionSpecialEvent } from '../data/freeActionSpecialEvents.js';
import {
  PARENT_AI_EVENT_BINDINGS,
  resolveParentAiEventOutcome,
} from '../../parent-ai-core/index.js';

export const DEFAULT_PARENT_AI_TEST_OUTCOME_ID = 'xiaoli_sunlight:three_light_zones';

function toStoredOutcome(outcome) {
  return {
    id: outcome.id,
    eventId: outcome.eventId,
    week: outcome.week,
    roomId: outcome.roomId,
    actionId: outcome.actionId,
    choiceId: outcome.choiceId,
    choiceLabel: outcome.choiceLabel,
    keyLines: outcome.keyLines,
  };
}

export function createParentAiIntegrationFixture(
  outcomeId = DEFAULT_PARENT_AI_TEST_OUTCOME_ID,
) {
  const binding = PARENT_AI_EVENT_BINDINGS.find((candidate) => (
    candidate.choiceIds.some((choiceId) => `${candidate.eventId}:${choiceId}` === outcomeId)
  ));
  if (!binding) throw new Error(`Unknown Parent AI outcome: ${outcomeId}`);

  const choiceIndex = binding.choiceIds.findIndex((choiceId) => (
    `${binding.eventId}:${choiceId}` === outcomeId
  ));
  const event = getFreeActionSpecialEvent(binding.week, binding.roomId, binding.actionId);
  const choice = event?.choices?.[choiceIndex];
  const outcome = resolveParentAiEventOutcome({
    week: binding.week,
    roomId: binding.roomId,
    actionId: binding.actionId,
    choiceIndex,
    choice,
  });
  if (!outcome) throw new Error(`Unable to resolve Parent AI outcome: ${outcomeId}`);

  const gs = createInitialState();
  gs.day = binding.week;
  gs.dayProgress.phase = 'free';
  gs.dayProgress.parentAiTriggeredEvents = [outcome.eventId];
  gs.dayProgress.parentAiTriggeredOutcomes = [toStoredOutcome(outcome)];
  gs.flags.day1OfficeIntroPlayed = true;
  gs.flags.day1FreePhaseIntroPlayed = true;
  gs.flags[`week${binding.week}FreePhaseIntroPlayed`] = true;
  gs.flags.week4ExhibitionPhotoChoiceDone = true;

  return gs;
}
