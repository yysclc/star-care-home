import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  PARENT_AI_EVENT_BINDINGS,
  PARENT_COMMUNICATION_PREMISES,
  PARENT_COMMUNICATION_PREMISE_STATUS,
  createParentAiSession,
  getParentAiSampleReplies,
  getPendingParentAiOutcomes,
  resolveParentAiEventOutcome,
} from '../parent-ai-core/index.js';
import { createInitialState } from '../src/core/GameState.js';
import { getFreeActionSpecialEvent } from '../src/data/freeActionSpecialEvents.js';

const ROOT = resolve(import.meta.dirname, '..');
const COMPLEX_OUTCOME_IDS = new Set([
  'xiaoli_sunlight:three_light_zones',
  'week2_sandpit_parallel_play:add_visual_turn_line',
  'week3_picture_book_emotion:children_choose_book',
  'week3_structured_movement:low_intensity_then_build',
  'week4_charity_exhibition:child_assent_first',
  'week4_group_interaction:add_second_material_set',
  'week5_blocks_puzzle_prompting:hint_edge_pieces',
  'week7_final_observation:prioritize_overlooked_children',
]);

function minimalOutcome(outcome) {
  return {
    id: outcome.id,
    eventId: outcome.eventId,
    week: outcome.week,
    roomId: outcome.roomId,
    actionId: outcome.actionId,
    choiceId: outcome.choiceId,
    choiceLabel: outcome.choiceLabel,
    keyLines: outcome.keyLines,
    effects: outcome.effects,
    choiceTrustImpact: outcome.choiceTrustImpact,
  };
}

async function main() {
  const officeSceneSource = await readFile(resolve(ROOT, 'src/scenes/OfficeScene.js'), 'utf8');
  const agentEnsembleSource = await readFile(resolve(ROOT, 'parent-ai-core/agentEnsemble.mjs'), 'utf8');
  assert.equal(
    officeSceneSource.includes('getParentAiSampleReplies'),
    false,
    'Game scene must not use standalone sample-reply buttons.',
  );
  assert.equal(
    officeSceneSource.includes('_showParentAiReplyOptions'),
    false,
    'Game scene must not expose Parent AI as fixed reply options.',
  );
  assert.equal(
    /_formatParentAiResultLine\(\s*result/.test(officeSceneSource),
    false,
    'Game scene must not display coach feedback after each Parent AI turn.',
  );
  const parentAiSubmitSource = officeSceneSource.slice(
    officeSceneSource.indexOf('async _submitParentAiReply'),
    officeSceneSource.indexOf('_formatParentAiTaskList'),
  );
  assert.equal(
    parentAiSubmitSource.includes('chat.setCloseEnabled(false)'),
    false,
    'Parent AI requests must not lock the chat close button.',
  );
  assert.equal(
    officeSceneSource.includes('_parentAiPendingTurns'),
    true,
    'Parent AI requests must remain attached to their session while the chat is closed.',
  );
  assert.equal(
    agentEnsembleSource.includes('normalizedResult.parentReply = buildGroundedParentReply'),
    false,
    'The model-generated parent reply must not be replaced by a local scripted reply.',
  );
  assert.equal(
    agentEnsembleSource.includes('必需任务全 complete 且不是 harmful 时，shouldEnd=true'),
    false,
    'Parent AI must not use checklist completion as the primary ending condition.',
  );
  assert.equal(
    agentEnsembleSource.includes('trustCanResolve'),
    true,
    'Parent AI ending must be driven by trust recovery.',
  );
  assert.equal(
    /buildEvaluatorPrompt\(profile\)[\s\S]*?reasoningEffort:\s*'low'/.test(agentEnsembleSource),
    true,
    'Evaluator agents should use low reasoning effort for latency.',
  );
  assert.equal(
    /buildEvaluatorPrompt\(profile\)[\s\S]*?responseSchema:\s*EVALUATOR_TURN_RESPONSE_SCHEMA/.test(agentEnsembleSource),
    true,
    'Evaluator agents must use the lightweight evaluator schema.',
  );
  assert.equal(
    /buildEvaluatorPrompt\(profile\)[\s\S]*?maxOutputTokens:\s*16384/.test(agentEnsembleSource),
    true,
    'Evaluator agents should have enough output budget for reasoning plus JSON.',
  );
  assert.equal(
    agentEnsembleSource.includes('你只提交判定票，不生成 parentReply'),
    true,
    'Evaluator prompt must not ask evaluator agents to generate parent replies.',
  );
  assert.equal(
    agentEnsembleSource.includes('hasSubstantiveOpenQuestion'),
    true,
    'Parent AI must judge whether there is still a substantive open question.',
  );
  assert.equal(
    /systemPrompt:\s*AGGREGATOR_PROMPT[\s\S]*?reasoningEffort:\s*'medium'/.test(agentEnsembleSource),
    true,
    'Aggregator should keep medium reasoning effort because it generates the final parent reply.',
  );
  assert.equal(
    agentEnsembleSource.includes('currentPlayerReply: payload.currentPlayerReply ?? payload.playerReply'),
    true,
    'Aggregator payload must expose the current player reply at the top level.',
  );
  assert.equal(
    agentEnsembleSource.includes('questionFocus: selectedOutcome?.questionFocus'),
    true,
    'Aggregator payload must expose the event question focus at the top level.',
  );

  assert.equal(PARENT_COMMUNICATION_PREMISE_STATUS, 'approved_for_game');
  assert.equal(PARENT_AI_EVENT_BINDINGS.length, 11);
  assert.equal(PARENT_COMMUNICATION_PREMISES.length, 32);

  const actualComplexIds = new Set(
    PARENT_COMMUNICATION_PREMISES
      .filter((premise) => premise.difficultyTier === 'complex')
      .map((premise) => premise.outcomeId),
  );
  assert.deepEqual(actualComplexIds, COMPLEX_OUTCOME_IDS);

  let checkedOutcomes = 0;
  for (const binding of PARENT_AI_EVENT_BINDINGS) {
    const event = getFreeActionSpecialEvent(binding.week, binding.roomId, binding.actionId);
    assert.ok(event, `Missing canonical event: ${binding.eventId}`);
    assert.equal(event.choices.length, binding.choiceIds.length, `Choice count mismatch: ${binding.eventId}`);

    for (let choiceIndex = 0; choiceIndex < binding.choiceIds.length; choiceIndex += 1) {
      const outcome = resolveParentAiEventOutcome({
        week: binding.week,
        roomId: binding.roomId,
        actionId: binding.actionId,
        choiceIndex,
        choice: event.choices[choiceIndex],
      });
      assert.ok(outcome?.parentInitiatedEligible, `Outcome is not game-ready: ${outcome?.id}`);
      assert.ok(outcome.parentMessage, `Missing parent opener: ${outcome.id}`);
      assert.ok(outcome.informationChannels.length, `Missing information channel: ${outcome.id}`);

      const session = createParentAiSession({
        week: binding.week,
        eventIds: [binding.eventId],
        eventOutcomes: [minimalOutcome(outcome)],
        parentStyleId: 'anxious',
      });
      assert.equal(session.messages.at(-1)?.text, outcome.parentMessage, `Wrong opener: ${outcome.id}`);
      if (outcome.choiceTrustImpact > 0) {
        assert.ok(session.trust >= 60, `Good choice should start with higher parent trust: ${outcome.id}`);
      } else if (outcome.choiceTrustImpact < 0) {
        assert.ok(session.trust <= 40, `Poor choice should start with lower parent trust: ${outcome.id}`);
      }
      assert.equal(getParentAiSampleReplies(session).length, 3, `Wrong sample count: ${outcome.id}`);

      const gs = createInitialState();
      gs.day = binding.week;
      gs.dayProgress.parentAiTriggeredEvents = [binding.eventId];
      gs.dayProgress.parentAiTriggeredOutcomes = [minimalOutcome(outcome)];
      const pending = getPendingParentAiOutcomes(gs, { week: binding.week });
      assert.equal(pending.length, 1, `Outcome is not reachable from game state: ${outcome.id}`);
      assert.equal(pending[0].parentMessage, outcome.parentMessage, `Save hydration failed: ${outcome.id}`);
      checkedOutcomes += 1;
    }
  }

  console.log(JSON.stringify({
    status: PARENT_COMMUNICATION_PREMISE_STATUS,
    events: PARENT_AI_EVENT_BINDINGS.length,
    outcomes: checkedOutcomes,
    complexOutcomes: actualComplexIds.size,
    storySource: 'src/data/freeActionSpecialEvents.js',
    gameStateHydration: true,
    sessionOpenersMatch: true,
    gameUsesFreeTextInput: true,
    gameHidesCoachFeedback: true,
    trustAxisEnding: true,
    sampleRepliesPerOutcome: 3,
  }, null, 2));
}

await main();
