import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PARENT_AI_EVENT_BINDINGS } from '../parent-ai-core/eventBindings.js';
import {
  PARENT_COMMUNICATION_PREMISES,
  PARENT_COMMUNICATION_PREMISE_STATUS,
} from '../parent-ai-core/parentCommunicationPremises.js';
import { getFreeActionSpecialEvent } from '../src/data/freeActionSpecialEvents.js';

const ROOT = resolve(import.meta.dirname, '..');
const OUTPUT = resolve(ROOT, 'PARENT_AI_32_OPTION_PARENT_OPENERS.md');
const CLEAN_SOURCE = resolve(ROOT, 'src/data/freeActionSpecialEvents.js');

const EVENT_TITLES = {
  xiaoming_dinosaur: '蟆乗・逧・ｰ乗＄鮴・,
  xiaoli_sunlight: '螳ｳ諤戊ｵｰ霑幃亠蜈蛾㈹逧・ｰ丈ｸｽ',
  week2_toy_preference: '辭滓ｉ譚占ｴｨ荳取眠邇ｩ蜈ｷ',
  week2_sandpit_parallel_play: '豐吝搗譌∫噪蟷ｶ陦梧ｸｸ謌・,
  week3_picture_book_emotion: '扈俶悽豢ｻ蜉ｨ逧・鰍螂・,
  week3_structured_movement: '扈捺桷蛹冶ｿ仙勘霑・ｸ｡',
  week4_charity_exhibition: '蜈ｬ逶雁ｱ戊ｧ井ｸｭ逧・ｽ懷刀蜻育鴫',
  week4_group_interaction: '髮・ｽ捺ｴｻ蜉ｨ驥檎噪蠖ｩ隨比ｺ画瓦',
  week5_blocks_puzzle_prompting: '遘ｯ譛ｨ諡ｼ蝗ｾ逧・署遉ｺ譁ｹ蠑・,
  week6_meal_sensory: '逕ｨ鬢蝉ｸｭ逧・─螳倅ｸ手｡ｨ霎ｾ',
  week7_final_observation: '譛蜷惹ｸ蜻ｨ逧・ｻｼ蜷郁ｧょｯ・,
};

function lineList(values) {
  return values.map((value) => `- ${value}`).join('\n');
}

function numberedList(values) {
  return values.map((value, index) => `${index + 1}. ${value}`).join('\n');
}

const CONSTRUCTION_TYPE_LABELS = {
  direct_observable_follow_up: '逶ｴ謗･蜿ｯ隗ょｯ溯ｿｽ髣ｮ',
  positive_strategy_transfer: '豁｣蜷醍ｭ也払霑∫ｧｻ',
  cross_context_strategy_transfer_with_misattribution: '霍ｨ蝨ｺ譎ｯ遲也払霑∫ｧｻ荳主ｽ貞屏蛛丞ｷｮ',
  strategy_boundary_with_parent_misattribution: '遲也払騾ら畑霎ｹ逡御ｸ主ｽ貞屏蛛丞ｷｮ',
  absence_of_expected_difficulty_with_wrong_explanation: '鬚・悄蝗ｰ髫ｾ郛ｺ蟶ｭ荳朱漠隸ｯ隗｣驥・,
  reversible_assent_with_parent_misattribution: '蜿ｯ謦､蝗槫酔諢丈ｸ主ｽ貞屏蛛丞ｷｮ',
  positive_system_effect_with_parent_misattribution: '邇ｯ蠅・髪謖∵・謨井ｸ主ｽ貞屏蛛丞ｷｮ',
  help_level_misattribution_across_tasks: '霍ｨ莉ｻ蜉｡蟶ｮ蜉ｩ螻らｺｧ霎ｨ蛻ｫ',
  longitudinal_correlation_without_causal_certainty: '郤ｵ蜷醍嶌蜈ｳ菴・屏譫懈悴螳・,
};

function assertComplete(entries) {
  const expectedIds = PARENT_AI_EVENT_BINDINGS.flatMap((binding) => (
    binding.choiceIds.map((choiceId) => `${binding.eventId}:${choiceId}`)
  ));
  const actualIds = entries.map((entry) => entry.outcomeId);
  const missing = expectedIds.filter((id) => !actualIds.includes(id));
  const extra = actualIds.filter((id) => !expectedIds.includes(id));
  const duplicate = actualIds.filter((id, index) => actualIds.indexOf(id) !== index);
  if (missing.length || extra.length || duplicate.length) {
    throw new Error(JSON.stringify({ missing, extra, duplicate }, null, 2));
  }
}

async function main() {
  assertComplete(PARENT_COMMUNICATION_PREMISES);
  const cleanHash = createHash('sha256').update(await readFile(CLEAN_SOURCE)).digest('hex');
  const output = [
    '# 32 荳ｪ邇ｩ螳ｶ騾蛾｡ｹ蟇ｹ蠎皮噪螳ｶ髟ｿ豐滄夊レ譎ｯ荳守ｬｬ荳蜿･隸・,
    '',
    '> 迥ｶ諤・ｼ壼ｷｲ謗･蜈･貂ｸ謌丈ｸ守峡遶区ｵ玖ｯ募勣縲ゆｻ･荳銀懷・莠ｫ譬ｸ蠢・｡･蜈・レ譎ｯ窶昜ｸ肴弍蜴滓ｸｸ謌城仙ｭ玲枚譯茨ｼ帛次蜑ｧ諠・ｻ榊宵蠑慕畑蜷檎岼蠖・`(2)` 蜴滉ｻｶ・梧悴陲ｫ謾ｹ蜀吶・,
    '',
    `- 謨ｰ謐ｮ迥ｶ諤・ｼ喀`${PARENT_COMMUNICATION_PREMISE_STATUS}\``,
    `- 蜴溷鴬諠・擂貅撰ｼ喀`src/data/freeActionSpecialEvents.js\``,
    `- 蜴滉ｻｶ SHA-256・喀`${cleanHash}\``,
    `- 隕・尠闌・峩・・{PARENT_AI_EVENT_BINDINGS.length} 荳ｪ莠倶ｻｶ縲・{PARENT_COMMUNICATION_PREMISES.length} 荳ｪ騾蛾｡ｹ`,
    '- 髫ｾ蠎ｦ驟咲ｽｮ・・4 荳ｪ逶ｴ謗･體ｾ譚｡縲・ 荳ｪ螟肴揩體ｾ譚｡・帛､肴揩體ｾ譚｡蜿ｪ驟咲ｽｮ蝨ｨ蜴滉ｺ倶ｻｶ荳ｭ霎・ｸ謎ｸ夂噪騾蛾｡ｹ荳翫・,
    '',
    '## 蜀吩ｽ懆ｾｹ逡・,
    '',
    '- 螳ｶ髟ｿ蜿ｪ閭ｽ莉主ｮｶ蠎ｭ隗ょｯ溘∝ｭｩ蟄千噪螟壽ｨ｡諤∬｡ｨ霎ｾ縲・囂霄ｫ迚ｩ蜩√∵ｴｻ蜉ｨ辣ｧ迚・・豁｣蠑乗ｵ∫ｨ区枚莉ｶ闔ｷ蠕嶺ｿ｡諱ｯ縲・,
    '- 螳ｶ髟ｿ隨ｬ荳蜿･隸晏・髯郁ｿｰ閾ｪ蟾ｱ遑ｮ螳樊詞謠｡逧・ｺ句ｮ橸ｼ悟・蜷題∝ｸ域ｸ螳樒・謚､謇邇ｰ蝨ｺ・御ｸ崎・逶ｴ謗･螟崎ｿｰ髫占酪蜑ｧ諠・・,
    '- 陦･蜈・レ譎ｯ蜿ｪ謠剰ｿｰ霑吩ｸｪ蟄ｩ蟄仙惠霑吩ｸ谺｡蜿醍函逧・庄隗ょｯ溯｡ｨ邇ｰ・御ｸ榊｣ｰ遘ｰ謇譛・ASD 蜆ｿ遶･驛ｽ莨壼ｦよｭ､縲・,
    '- 豕ｨ隗・∵欠蜷代∵耳霑代・・菴上∝勘菴憺㍾邇ｰ遲牙庄莉･譫・・豐滄夲ｼ帑ｸ埼ｻ倩ｮ､蟄ｩ蟄占・螳梧紛蜿｣霑ｰ蠖灘､ｩ扈丞紙縲・,
    '- 邇ｯ蠅・∵─螳倩ｴ溯差縲∝序蛹悶∝庄鬚・ｵ区ｧ蜥梧ｲ滄夊ｦ∵ｱょ宵閭ｽ菴應ｸｺ髴隕∵ｸ螳樒噪蜈ｳ閨費ｼ御ｸ咲畑荳谺｡隗ょｯ溽｡ｮ螳壼屏譫懊・,
    '- 荳肴ｳ・愆蜈ｶ莉門ｭｩ蟄千噪霄ｫ莉ｽ謌紋ｸｪ莠ｺ蜿榊ｺ斐・,
    '',
    '## 荳謎ｸ壻ｾ晄紺',
    '',
    '- NICE CG170・壽髪謖∝ｺ比ｸｪ菴灘喧・悟ｹｶ閠・剔豐滄壹∝・郤ｿ荳主｣ｰ髻ｳ縲∫､ｾ莨夂識蠅・∵ｵ∫ｨ句序蛹悶∝庄鬚・ｵ区ｧ蜥檎ｻ捺桷縲・,
    '  - https://www.nice.org.uk/guidance/cg170/chapter/Key-priorities-for-implementation',
    '- ASHA Autism Practice Portal・壽ｲ滄壽髪謖∝ｺ比ｾ昜ｸｪ莠ｺ荳取ュ蠅・ｰ・紛・悟ｹｶ莉･螳ｶ蠎ｭ蜿ゆｸ守噪莨吩ｼｴ蜈ｳ邉ｻ荳ｺ蝓ｺ遑縲・,
    '  - https://www.asha.org/Practice-Portal/Clinical-Topics/Autism/',
    '- ASHA AAC Practice Portal・壽ｲ滄壼庄閭ｽ蛹・峡謇句漢縲∝ｮ樒黄縲∝崟逕ｻ蜥悟・莉門､壽ｨ｡諤∵婿蠑擾ｼ悟ｮｶ蠎ｭ荳惹ｸ謎ｸ壼屬髦溷ｺ泌・蜷悟盾荳弱・,
    '  - https://www.asha.org/practice-portal/professional-issues/augmentative-and-alternative-communication/',
    '- Autism CRC 窶廩ow was your day?窶晢ｼ壼ｮｶ蠎ｭ縲∵蕗蟶亥柱蟄ｩ蟄仙ｯｹ荳螟ｩ扈丞紙逧・ｲ滄壽悽霄ｫ髴隕∵髪謖・ｼ御ｸ崎・鮟倩ｮ､蟄ｩ蟄蝉ｼ壼ｮ梧紛隶ｲ霑ｰ縲・,
    '  - https://www.autismcrc.com.au/knowledge-centre/reports/how-was-your-day-parent-teacher-and-child-perceptions-communication-about',
    '',
  ];

  let optionNumber = 0;
  let lastWeek = null;
  for (const binding of PARENT_AI_EVENT_BINDINGS) {
    if (lastWeek !== binding.week) {
      output.push(`# 隨ｬ ${binding.week} 蜻ｨ`, '');
      lastWeek = binding.week;
    }
    output.push(`## ${EVENT_TITLES[binding.eventId]}`, '');
    const event = getFreeActionSpecialEvent(binding.week, binding.roomId, binding.actionId);
    if (!event || event.choices.length !== binding.choiceIds.length) {
      throw new Error(`Original event mismatch: ${binding.eventId}`);
    }

    for (let choiceIndex = 0; choiceIndex < event.choices.length; choiceIndex += 1) {
      optionNumber += 1;
      const choice = event.choices[choiceIndex];
      const outcomeId = `${binding.eventId}:${binding.choiceIds[choiceIndex]}`;
      const premise = PARENT_COMMUNICATION_PREMISES.find((entry) => entry.outcomeId === outcomeId);
      if (!premise) throw new Error(`Missing premise: ${outcomeId}`);

      output.push(
        `### ${optionNumber}. ${choice.label}`,
        '',
        `**謚譛ｯ譬・ｯ・ｼ・* \`${outcomeId}\``,
        '',
        '**蜴溷鴬諠・ｯ･蛻・髪螳樣刔蜿醍函逧・ｺ具ｼ磯仙ｭ暦ｼ会ｼ・*',
        '',
        lineList(choice.lines ?? []),
        '',
        `**譫・邀ｻ蝙具ｼ・* ${CONSTRUCTION_TYPE_LABELS[premise.constructionType ?? 'direct_observable_follow_up']}`,
        '',
        `**髫ｾ蠎ｦ螻らｺｧ・・* ${premise.difficultyTier === 'complex' ? '螟肴揩' : '譬・㊥'}`,
        '',
        '**蜈ｱ莠ｫ譬ｸ蠢・｡･蜈・レ譎ｯ・亥ｷｲ謗･蜈･・会ｼ・*',
        '',
        lineList(premise.addedBackground),
        '',
        `**螳ｶ髟ｿ逧・ｿ｡諱ｯ貂驕難ｼ・* ${premise.informationChannels.join('縲・)}`,
        '',
        '**蜑榊屏蜷取棡・・*',
        '',
        numberedList(premise.causalChain),
        '',
        '**螳ｶ髟ｿ逵滓ｭ｣遏･驕鍋噪莠句ｮ橸ｼ・*',
        '',
        lineList(premise.parentKnownFacts),
        '',
        ...(premise.parentInterpretation ? [
          `**螳ｶ髟ｿ蠖灘燕逅・ｧ｣・・* ${premise.parentInterpretation}`,
          '',
        ] : []),
        ...(premise.actualRelationship ? [
          `**邉ｻ扈溷愛螳壽園萓晄紺逧・ｮ樣刔蜈ｳ邉ｻ・・* ${premise.actualRelationship}`,
          '',
        ] : []),
        ...(premise.alternativeExplanations?.length ? [
          '**莉埼怙菫晉蕗逧・・莉冶ｧ｣驥奇ｼ・*',
          '',
          lineList(premise.alternativeExplanations),
          '',
        ] : []),
        `**螳ｶ髟ｿ隸｢髣ｮ驥咲せ・・* ${premise.questionFocus}`,
        '',
        `**螳ｶ髟ｿ隨ｬ荳蜿･隸晢ｼ・*`,
        '',
        `> ${premise.parentFirstMessage}`,
        '',
        '---',
        '',
      );
    }
  }

  await writeFile(OUTPUT, `${output.join('\n')}\n`, 'utf8');
  console.log(JSON.stringify({ output: OUTPUT, options: optionNumber, sha256: cleanHash }, null, 2));
}

await main();
