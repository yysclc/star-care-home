#!/usr/bin/env node
import { resolve } from 'node:path';
import { runAgentPlaytest, writePlaytestArtifacts } from '../parent-ai-core/agentEnsemble.mjs';
import { PARENT_AI_EVENTS } from '../parent-ai-core/data.js';
import {
  PARENT_AI_EVENT_BINDINGS,
  resolveParentAiEventOutcome,
} from '../parent-ai-core/eventBindings.js';
import { getFreeActionSpecialEvent } from '../src/data/freeActionSpecialEvents.js';

function readArg(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index === -1 || index + 1 >= process.argv.length) return fallback;
  return process.argv[index + 1];
}

function readListArg(name, fallback) {
  const value = readArg(name, '');
  if (!value) return fallback;
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function printHelp() {
  console.log(`
Usage:
  node ./playtest-harness.mjs --out ./PLAYTEST_AGENT_ENSEMBLE_REPORT.md

Options:
  --events xiaoming_dinosaur,xiaoli_sunlight,week6_meal_sensory
  --outcomes xiaoming_dinosaur:uniform_storage_then_restore,xiaoli_sunlight:too_fast_sunlight_attempt
  --players professional_player,ordinary_player,high_risk_player
  --parent-style anxious
  --turns 4
  --provider deepseek
  --out ./PLAYTEST_AGENT_ENSEMBLE_REPORT.md
  --json ./PLAYTEST_AGENT_ENSEMBLE_REPORT.json
`);
}

if (hasFlag('--help') || hasFlag('-h')) {
  printHelp();
  process.exit(0);
}

const provider = readArg('--provider', process.env.AI_PROVIDER || 'deepseek').toLowerCase();
const apiKey = provider === 'deepseek'
  ? process.env.DEEPSEEK_API_KEY
  : process.env.GEMINI_API_KEY;
if (!apiKey) {
  const envName = provider === 'deepseek' ? 'DEEPSEEK_API_KEY' : 'GEMINI_API_KEY';
  console.error(`${envName} is not set. This harness uses real model agents and will not fall back to keyword mock.`);
  process.exit(1);
}

const model = provider === 'deepseek'
  ? process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash'
  : process.env.GEMINI_MODEL || 'gemini-3.5-flash';
const baseUrl = provider === 'deepseek'
  ? process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com'
  : undefined;
const outPath = readArg('--out', './PLAYTEST_AGENT_ENSEMBLE_REPORT.md');
const jsonPath = readArg('--json', outPath.replace(/\.md$/i, '.json'));
const selectedEventIds = readListArg('--events', PARENT_AI_EVENTS.map((event) => event.id));
const allOutcomes = PARENT_AI_EVENT_BINDINGS.flatMap((trigger) => {
  const event = getFreeActionSpecialEvent(trigger.week, trigger.roomId, trigger.actionId);
  return (event?.choices ?? [])
    .map((choice, choiceIndex) => resolveParentAiEventOutcome({
      week: trigger.week,
      roomId: trigger.roomId,
      actionId: trigger.actionId,
      choiceIndex,
      choice,
    }))
    .filter(Boolean);
});
const requestedOutcomeIds = readListArg('--outcomes', []);
const eventOutcomes = requestedOutcomeIds.length
  ? allOutcomes.filter((outcome) => requestedOutcomeIds.includes(outcome.id))
  : selectedEventIds.map((eventId) => allOutcomes.find((outcome) => outcome.eventId === eventId)).filter(Boolean);

const ineligibleOutcomes = eventOutcomes.filter((outcome) => outcome.parentInitiatedEligible !== true);
if (ineligibleOutcomes.length) {
  console.error('Playtest blocked: one or more event outcomes have no approved parent communication premise.');
  for (const outcome of ineligibleOutcomes) {
    console.error(`- ${outcome.id}: ${outcome.eligibilityReason}`);
  }
  process.exit(2);
}

if (!eventOutcomes.length) {
  console.error('No valid event outcomes selected. Use --outcomes with ids shown in the source event data.');
  process.exit(1);
}

const report = await runAgentPlaytest({
  eventIds: [...new Set(eventOutcomes.map((outcome) => outcome.eventId))],
  eventOutcomes,
  playerProfileIds: readListArg('--players', ['professional_player', 'ordinary_player', 'high_risk_player']),
  parentStyleId: readArg('--parent-style', 'anxious'),
  maxTurns: Number(readArg('--turns', '4')),
  provider,
  apiKey,
  model,
  baseUrl,
});

await writePlaytestArtifacts(report, resolve(outPath), resolve(jsonPath));

console.log(`Agent ensemble playtest complete.`);
console.log(`Markdown: ${resolve(outPath)}`);
console.log(`JSON: ${resolve(jsonPath)}`);
