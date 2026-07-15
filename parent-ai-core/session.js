import {
  CARE_STANDARDS,
  COMMUNICATION_TASKS,
  FALLBACK_TOPICS,
  PARENT_AI_EVENTS,
  PARENT_STYLES,
} from './data.js';
import { hydrateParentCommunicationOutcome } from './parentCommunicationPremises.js';

export { PARENT_AI_EVENT_BINDINGS as PARENT_AI_EVENT_TRIGGERS } from './eventBindings.js';

export const PARENT_AI_SAMPLE_REPLY_SETS = {
  fallback: [
    {
      id: 'professional',
      label: '说明已知情况和下一步',
      text: '您是想确认孩子今天具体经历了什么，这个问题需要说清楚。我会先核对当天记录，再告诉您我们看到了哪些行为、当时怎么处理；也请您把家里出现变化的时间和表现告诉我，我们一起看看两边的信息能不能对上。',
    },
    {
      id: 'partial',
      label: '先核对当天记录',
      text: '我先核对今天每个活动环节的记录，再把孩子当时做了什么、有没有出现变化告诉您。',
    },
    {
      id: 'harmful',
      label: '认为家长不必追问',
      text: '今天没什么特别的，您不用再追问，孩子以后会自己适应。',
    },
  ],
};

const OUTCOME_PLAYER_REPLIES = {
  'xiaoming_dinosaur:uniform_storage_then_restore': {
    professional: '您担心以后还会误收，这个担心有道理。今天我把小恐龙收到动物玩具盒后，小明反复打开原来的格子，呼吸也变急了；我发现后马上把它放了回去。接下来我会先保留这个固定位置，并在整理前核对它的用途；也想请您告诉我们，家里有没有类似的固定物品，方便我们一起观察他在什么情况下最需要这种稳定线索。',
    partial: '今天是我不了解这个固定位置，先把小恐龙收到动物玩具盒里了。小明后来反复打开原来的格子，呼吸变急，我发现后已经把它放回去。',
  },
  'xiaoming_dinosaur:ask_xiaoming_first': {
    professional: '您问得对，这个位置不能由老师擅自改变。今天小明先看向架子里面，又点了点那个角落，我们据此保留了原来的格子。接下来整理前仍会先确认他的使用习惯，也会请您补充他在家里有没有固定摆放的物品，帮助我们判断哪些安排需要保持一致。',
    partial: '今天小明看向架子里面，又点了点原来的角落，我们确认以后没有移动小恐龙。',
  },
  'xiaoming_dinosaur:label_fixed_position': {
    professional: '您担心固定位置会不会和公共收纳混在一起，这个问题需要提前说清楚。今天我们给小恐龙保留固定格，是为了维持小明已经熟悉的位置、减少突然变化；贴上名字标签主要是提醒整理玩具的成人不要误收，也把公共玩具区域另外标明，不是把公共玩具变成个人物品。家里如果原本就有他熟悉的固定摆放，先维持原样即可；只有当他找不到会明显焦虑、需要练习自己取放，或家里多位照护者容易摆错时，再考虑用照片、颜色或文字做简单提示，我们可以一起判断。',
    partial: '今天我们给小恐龙的固定格贴了标签，也准备把公共玩具区域另外标清楚。',
  },
  'xiaoli_sunlight:too_fast_sunlight_attempt': {
    professional: '您担心今天推进得太快，这个判断是对的。小丽走了两步后抬手挡眼、肩膀用力，脚也开始往后退，我们随后回到了树荫下。明天不会再直接带她往亮处走，而会从树荫和半阴的位置开始，让她随时能退回来；也请您告诉我们，她在家里遇到强光时通常会有哪些反应。',
    partial: '小丽今天走了两步后抬手挡眼，脚开始往后退，我们随后回到了树荫下。',
  },
  'xiaoli_sunlight:three_light_zones': {
    professional: '您注意到她没有完全退出阳台，这个变化值得记录；但还不能据此说她已经不怕光了。今天户外活动时，我们同时保留了树荫、半阴和阳光的位置，让她自己选择，她后来从树荫走到半阴处停下。她今晚把凳子放在明暗交界处，更像是在主动寻找能承受的位置。家里可以继续保留阴影和退路，记录光线强度以及她怎样选择，不需要催她往更亮处走。',
    partial: '今天我们给了树荫、半阴和阳光三个位置，她自己从树荫走到半阴处。今晚的表现可能和这种选择有关，但不能说她已经不怕光。',
  },
  'xiaoli_sunlight:move_everyone_to_shade': {
    professional: '您问到的是群体安排能不能照顾不同需要。今天把所有孩子都带到树荫后，现场安静了一些，但统一安排并没有让每个人都更容易参与；其他孩子的个人情况我不能展开。下次我们会同时保留树荫、半阴和活动空间，不再只用一个区域解决秩序问题，也欢迎您告诉我们小丽平时能接受什么样的光线。',
    partial: '今天把所有孩子带到树荫后，现场安静了一些，但统一安排没有同时满足不同孩子的活动需要。',
  },
  'week2_toy_preference:offer_multiple_textures': {
    professional: '您问这是偏好还是变化太多，目前一次观察还不能下结论。今天几种材质同时出现后，孩子碰了几下就把其中几块推远了。下次我们会保留熟悉的磨砂积木，只增加一种新材质并记录他的反应；也请您告诉我们，他在家里会主动靠近或避开哪些触感。',
    partial: '今天几种材质同时放到面前后，孩子碰了几下，很快把其中几块推远了。',
  },
  'week2_toy_preference:follow_familiar_texture': {
    professional: '把积木往老师这边挪，可能是在允许我加入，但只凭这一次还不能说成能力上的突破。今天我先陪他使用同样的磨砂积木，没有要求他换玩具，他后来把积木往我这边挪了一点。接下来会继续用这种低压力的方式观察；也想请您说说，他在家里允许别人加入游戏时通常会怎么做。',
    partial: '今天我先陪他使用同样的磨砂积木，没有催他换玩具，后来他把自己的积木往我这边挪了一点。',
  },
  'week2_toy_preference:use_sound_toy': {
    professional: '您担心以后还会用声音吸引他，这个问题需要明确回答。声音玩具响起后，他开始在架子前来回走，我们没有把这当成注意力被吸引，而是先停止增加刺激。之后会回到熟悉材料，再观察较小变化；也请您告诉我们，他在家里对哪些声音反应明显。',
    partial: '声音玩具响起后，他开始在架子前来回走，我们已经停止继续增加声音刺激。',
  },
  'week2_sandpit_parallel_play:require_spoken_counting': {
    professional: '您质疑为什么要加口语要求是有道理的。两个孩子原本会递铲、换位置，加入报数后动作停了，还有一个孩子离开，说明这个要求打断了原来的合作。下次我们会先保留他们已有的节奏，用视觉线或材料位置提供提示；也请您分享孩子平时不用说话时会怎样和别人一起玩。',
    partial: '两个孩子原本会递铲、换位置，加入轮流报数后动作停了，其中一个孩子离开了。',
  },
  'week2_sandpit_parallel_play:add_visual_turn_line': {
    professional: '您担心他先把材料分开是不愿分享，这个担心可以理解；但今晚他后来会沿着边界传递胶水，而且两个人一直在同一张桌上，说明边界没有让合作停止。今天沙坑里我们也加了一条视觉线，孩子们顺着线调整递铲方向。对他来说，先知道各自空间在哪里，反而可能更容易轮换。家里可以保留这条边界，同时观察他是否仍会传递共用材料和留在共同活动里。',
    partial: '今天沙坑里加了一条视觉线，孩子们没有退出，反而顺着线继续递铲。先分清空间不一定等于拒绝分享。',
  },
  'week2_sandpit_parallel_play:adult_takes_over_play': {
    professional: '您问为什么成人加入后孩子反而退出，这是今天需要复盘的地方。老师加入后沙堡很快成形，但也改变了两个孩子原来的节奏，其中一个孩子退到旁边不再动。下次我们会先在边缘提供材料或简单提示，不直接接管游戏；也请您告诉我们，孩子在家里什么时候会允许成人加入。',
    partial: '老师加入后沙堡很快搭起来了，但其中一个孩子退到旁边，不再继续动作。',
  },
  'week3_picture_book_emotion:high_arousal_story': {
    professional: '您担心选书前没有看孩子当时能不能承受，这个提醒是必要的。冒险情节开始后，有孩子捂住耳朵、身体往后缩，我们随后放慢了声音。下次会先看孩子进图书室时的状态，选择声音和情节更平稳的内容，并保留暂停或换书的选择；也请您告诉我们孩子在家里听故事时会避开什么内容。',
    partial: '冒险情节开始后，有孩子捂住耳朵、身体往后缩，我们随后把讲述声音放慢了。',
  },
  'week3_picture_book_emotion:repetitive_language_rhythm': {
    professional: '今天起作用的不是“所有自闭症孩子都喜欢重复”，而是这组孩子当时比较容易跟上稳定的句式和翻页节奏。我们会继续观察不同内容下谁更容易参与，不把一次集体反应套到每个孩子身上；也欢迎您告诉我们，孩子在家里更容易听完哪类故事。',
    partial: '重复句式一页页出现后，孩子们逐渐跟上翻页节奏，房间里的声音也慢慢减少了。',
  },
  'week3_picture_book_emotion:children_choose_book': {
    professional: '您一次摆出八本书后他全推开，确实可能是选择量太大，但这不等于他不适合自己选。今天照护所只给了少量封面让孩子比较，选书虽然花得久一些，开始阅读后靠近绘本的人反而更多。家里可以先缩到两本，允许他用看、指、推近或推开来表达；如果两本也不选，就先暂停，不需要立刻替他决定。',
    partial: '今天孩子是在少量封面中选择，不是同时面对一整排书。八本都推开可能是选项太多，不能直接说明他不适合选择。',
  },
  'week3_structured_movement:high_intensity_first': {
    professional: '您担心孩子有没有被推挤影响，这部分我们需要按个人记录继续核对。今天前半段强度较高，后面排队时确实开始有人推挤。下次高强度活动结束前会加入降速动作和结束预告，再分批排队；如果孩子回家后还有不适或反复提到这件事，请把具体表现告诉我们。',
    partial: '今天前半段活动强度较高，后面排队时确实开始有人推挤，我会继续核对孩子当时的位置和反应。',
  },
  'week3_structured_movement:low_intensity_then_build': {
    professional: '他晚上还有余力活动，不一定说明白天运动量不够。今天我们从平衡和伸展开始，再慢慢加入跳跃，原本站在门边的孩子后来才参与；结束时也没有把兴奋程度推得太高。运动支持不只是把体力耗掉，也要让孩子还能顺利穿鞋、出门和进入下一件事。我们会继续记录活动强度与离所状态，家里也可以观察睡眠、环境和身体状态，避免只凭一天确定原因。',
    partial: '今天不是少活动，而是先从低强度开始再逐步增加。晚上还能平稳活动，可能表示强度比较合适，不等于白天没运动够。',
  },
  'week3_structured_movement:parallel_pacing_groups': {
    professional: '您关心分组后有没有人持续留意每个孩子，这是安全上的关键问题。今天分成两个节奏后，孩子与活动的匹配更合适，但老师需要频繁切换注意。下次会先明确每位老师负责的区域和人数，再决定是否分组；也请您告诉我们孩子更容易在哪种活动强度下保持稳定。',
    partial: '今天分成两个节奏后，孩子与活动的匹配更合适，但老师需要频繁切换注意。',
  },
  'week4_charity_exhibition:select_for_visual_impact': {
    professional: '您担心作品在同意前已经交给媒体，这是合理的。目前这份清单必须停在内部，不能继续对外发送；今天先按视觉效果挑选，确实把传播放在了孩子意愿前面。我们会重新逐件确认孩子和家长是否同意、展示哪些信息以及怎样撤回，在确认前不会发布。',
    partial: '今天先按视觉效果整理了清单，但这份清单还需要停在内部，重新确认孩子和家长的意愿。',
  },
  'week4_charity_exhibition:child_assent_first': {
    professional: '白天的点头说明他当时愿意，但今晚把同一张画翻过去、压住，也是现在需要尊重的表达；这不是要求孩子前后必须一致。材料还在待确认阶段，我们会先把这张作品暂停，不继续进入对外清单，并记录这次撤回。之后如果要重新考虑，会再次分别询问孩子和家长，不能用白天一次同意覆盖后面的决定。',
    partial: '白天点头和今晚拒绝都是真实表达。同意可以撤回，所以这张作品现在应该先暂停，不能按白天的决定继续。',
  },
  'week4_charity_exhibition:internal_review_before_release': {
    professional: '家长会在任何材料对外发送前看到展示内容。内部审核会分别确认作品本身、照片、姓名和故事说明是否真的需要出现，能不公开的信息就不公开；孩子和家长都可以拒绝或之后撤回。我们会把最终版本发给您确认，不会用一次同意覆盖所有用途。',
    partial: '现在材料只在内部确认阶段，还没有对外发送；照片、姓名和故事说明会分别核对。',
  },
  'week4_group_interaction:single_queue_rule': {
    professional: '您担心只强调排队没有解决现场压力，这个判断有依据。今天队伍排起来后，仍有孩子身体僵住并低声抗议。下次会先增加材料、拉开桌边距离，再用清楚的等待提示安排顺序；也请您告诉我们，孩子在家里等待物品时什么提示最容易明白。',
    partial: '今天队伍排起来后，仍有孩子身体僵住并低声抗议，说明压力没有随着秩序恢复而消失。',
  },
  'week4_group_interaction:add_second_material_set': {
    professional: '您看到他把材料分开，担心这是在躲着别人；但他后来一直留在同一张桌上，也能和家里人把活动做完，这和完全退出不一样。今天照护所增加第二盒彩笔、拉开取用位置后，争抢很快减少。把材料分散是在降低拥挤和竞争，不是取消共同活动。家里可以继续看三个事实：他是否仍留在一起、是否会使用共用物品、活动能否持续。',
    partial: '今天把彩笔分到两个位置后，孩子们仍在共同活动，争抢却减少了。材料分开不一定等于回避。',
  },
  'week4_group_interaction:remove_one_child_only': {
    professional: '被带离的孩子后来得到单独陪伴，但其他孩子的个人情况我不能向外说明。今天只处理最激动的孩子后，桌边争抢仍在继续，说明材料和空间也需要调整。下次会同时安排个别安抚、增加材料和桌边分流；如果您担心自己孩子当时受到影响，我会单独核对他的记录。',
    partial: '今天最激动的孩子被带离后，桌边争抢仍在继续，说明问题不只在一个孩子身上。',
  },
  'week5_blocks_puzzle_prompting:give_exact_answer': {
    professional: '您希望下次先给一点提示，这个建议和今天的复盘一致。今天我直接指出缺口后，拼图很快完成，但孩子看了一眼就离开了。下次会先等待，再给边角或图案线索，只有孩子仍然需要帮助时才逐步增加提示；家里陪他拼图时也可以按这个顺序试。',
    partial: '今天我直接指出缺口后，拼图很快完成，但孩子看了一眼成品就离开了。',
  },
  'week5_blocks_puzzle_prompting:hint_edge_pieces': {
    professional: '他推开您直接连接轨道的手，不一定是在拒绝所有帮助；后来您只摆出两个相似接头，他仍愿意继续试，说明他可能是在保护自己完成关键动作的机会。今天拼图时我们也只提示“先找边角”，没有直接指出答案。家里可以先等待，再给视觉线索或缩小选择；只有他停止尝试、挫败持续上升时，才再增加一步帮助。',
    partial: '他接受视觉线索却推开代替操作，说明不同帮助方式对他不一样，不能直接说他什么帮助都不要。',
  },
  'week5_blocks_puzzle_prompting:rotate_puzzle_view': {
    professional: '换方向只是提供新的观察线索，没有替孩子指出答案。今天转动拼图后，孩子们自己发现了图案关系。家里也可以先调整拼图方向或指出边缘特征，再等待孩子继续；如果他停止尝试，再增加一点帮助。',
    partial: '今天只是把拼图转了一个方向，孩子们后来自己发现了图案线索。',
  },
  'week6_meal_sensory:separate_mixed_food': {
    professional: '您担心下次食物又混在一起，这需要有明确做法。今天青菜汁碰到米饭后，小宇一直没有开始吃，手指也持续用力；我们只把碰到的那一小块分开，他才先吃了两口没有混到的米饭。之后会尽量保留食物分隔，也请您告诉我们家里哪些食物混合最容易让他停下来。',
    partial: '今天青菜汁碰到米饭后，小宇一直没有开始吃；把碰到的那一小块分开后，他才慢慢吃了两口。',
  },
  'week6_meal_sensory:verbal_choice_and_wait': {
    professional: '您问他当时是不是很难处理这个口头问题，这个可能性需要认真看。今天问他想先吃什么并等待后，他仍然只看着餐盘，没有开始吃，说明困难可能不在“选哪一种”，而在食物已经混到一起。下次会先提供分隔或指认等更直接的提示；也请您告诉我们家里怎样摆放时他比较容易开始吃。',
    partial: '今天问小宇想先吃什么并等待后，他仍然只看着餐盘，没有开始吃。',
  },
  'week7_final_observation:record_only_visible_changes': {
    professional: '您看到记录很少，会怀疑孩子是不是没有被留意，这个担心是有根据的。今天复盘时我们也发现，注意力集中在变化明显的孩子身上，几个安静孩子的记录不够完整。我们会补做具体观察，记录他怎样参与、什么时候停下来以及什么支持有效；也请您把家里这周看到的变化告诉我们。',
    partial: '今天复盘时我们发现，变化明显的孩子记录得很详细，但几个安静孩子的内容不够完整。',
  },
  'week7_final_observation:one_detail_per_child': {
    professional: '这些记录会随交接一起保留，不只停在这一周。今天每个孩子至少记录了一个具体细节，下一位照护老师可以据此继续观察哪些安排有效。我们也想把您在家里看到的对应情况补进去，让交接内容同时包含两个场景。',
    partial: '今天按房间顺序观察了一轮，每个孩子都留下了一个具体细节，交接时会一并整理。',
  },
  'week7_final_observation:prioritize_overlooked_children': {
    professional: '声音是一个值得继续查的线索，但目前还不能说它就是主要原因，因为您的记录里也有一次吵闹后完全没事。今天我们补到的是：声音变大时他退到门边，留出距离后又能靠近。接下来两边可以同时记声音强度、当天活动和流程变化、睡眠或身体不适，以及什么支持有效；等出现多次一致模式后，再判断声音在其中占多大作用。',
    partial: '目前只能看出声音和部分烦躁同时出现，已有一次反例，所以还不能确定因果，需要继续把其他情况一起记录。',
  },
};

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function requiredTaskIds() {
  return COMMUNICATION_TASKS.filter((task) => task.required).map((task) => task.id);
}

function parentTrustFromEventOutcomes(eventOutcomes = [], fallbackTrust = 50) {
  const communicationTypes = eventOutcomes
    .map((outcome) => outcome?.parentCommunicationType)
    .filter(Boolean);
  if (communicationTypes.includes('complaint')) return 50;
  if (communicationTypes.includes('sharing')) return 75;

  const impacts = eventOutcomes
    .map((outcome) => {
      const explicitImpact = Number(outcome?.choiceTrustImpact);
      if (Number.isFinite(explicitImpact) && explicitImpact !== 0) return explicitImpact;
      const trust = Number(outcome?.effects?.['group.trust']);
      if (Number.isFinite(trust) && trust !== 0) return trust;
      const stress = Number(outcome?.effects?.['group.stress']);
      if (Number.isFinite(stress) && stress !== 0) return stress < 0 ? 1 : -1;
      return 0;
    })
    .filter((value) => Number.isFinite(value));
  if (!impacts.length) return clamp(Number(fallbackTrust) || 50, 0, 100);

  const averageImpact = impacts.reduce((sum, value) => sum + value, 0) / impacts.length;
  const eventAnchor = averageImpact > 0 ? 62 : averageImpact < 0 ? 38 : 50;
  const globalOffset = (clamp(Number(fallbackTrust) || 50, 0, 100) - 50) * 0.2;
  return clamp(Math.round(eventAnchor + globalOffset), 0, 100);
}

function normalizeEventIds(eventIds = []) {
  return unique(Array.isArray(eventIds) ? eventIds : [eventIds]);
}

function normalizeEventOutcomes(eventOutcomes = []) {
  const values = Array.isArray(eventOutcomes) ? eventOutcomes : [eventOutcomes];
  const seen = new Set();
  return values
    .filter((outcome) => outcome && typeof outcome === 'object' && outcome.eventId)
    .map((outcome) => hydrateParentCommunicationOutcome(cloneJson(outcome)))
    .filter((outcome) => {
      outcome.id ||= `${outcome.eventId}:${outcome.choiceId || 'unknown'}`;
      if (seen.has(outcome.id)) return false;
      seen.add(outcome.id);
      return true;
    });
}

export function resolveParentStyle(parentStyleId = 'anxious') {
  return PARENT_STYLES.find((style) => style.id === parentStyleId) ?? PARENT_STYLES[0];
}

export function resolveParentAiTopics(eventIds = [], eventOutcomes = []) {
  const ids = normalizeEventIds(eventIds);
  const outcomes = normalizeEventOutcomes(eventOutcomes);
  const topics = PARENT_AI_EVENTS
    .filter((event) => ids.includes(event.id))
    .map((event) => ({
      ...event,
      selectedOutcome: outcomes.find((outcome) => outcome.eventId === event.id) ?? null,
    }));
  return topics.length ? topics : FALLBACK_TOPICS;
}

export function getPrimaryParentAiTopic(sessionOrTopics) {
  if (Array.isArray(sessionOrTopics)) {
    return sessionOrTopics[0] ?? FALLBACK_TOPICS[0];
  }
  return resolveParentAiTopics(
    sessionOrTopics?.eventIds,
    sessionOrTopics?.eventOutcomes,
  )[0] ?? FALLBACK_TOPICS[0];
}

export function buildInitialParentMessage(topicOrTopics, parentStyle) {
  const topic = Array.isArray(topicOrTopics)
    ? topicOrTopics[0]
    : topicOrTopics;
  const resolvedTopic = topic ?? FALLBACK_TOPICS[0];
  const resolvedStyle = parentStyle ?? PARENT_STYLES[0];
  if (resolvedTopic.selectedOutcome) {
    return resolvedTopic.selectedOutcome.parentMessage ?? '';
  }
  return resolvedTopic.parentOpeners?.[resolvedStyle.id]
    ?? resolvedTopic.parentOpeners?.anxious
    ?? '老师，我想核对一下今天的照护记录。';
}

export function buildParentAiSessionKey({ week = 1, eventIds = [], eventOutcomes = [], parentStyleId = 'anxious' } = {}) {
  const outcomeIds = normalizeEventOutcomes(eventOutcomes).map((outcome) => outcome.id);
  const eventPart = (outcomeIds.length ? outcomeIds : normalizeEventIds(eventIds)).sort().join('+') || 'fallback';
  return `week${week}:${eventPart}:${parentStyleId}`;
}

export function createParentAiSession({
  week = 1,
  eventIds = [],
  eventOutcomes = [],
  parentStyleId = 'anxious',
  trust = 50,
  maxTurns = 4,
} = {}) {
  const normalizedOutcomes = normalizeEventOutcomes(eventOutcomes);
  if (normalizedOutcomes.some((outcome) => outcome.parentInitiatedEligible !== true)) {
    throw new Error('原剧情未建立家长知情渠道，不能创建家长主动发起的事件会话。');
  }
  const requestedEventIds = normalizedOutcomes.length
    ? normalizedOutcomes.map((outcome) => outcome.eventId)
    : eventIds;
  const topics = normalizedOutcomes.length
    ? resolveParentAiTopics(requestedEventIds, normalizedOutcomes)
    : FALLBACK_TOPICS;
  const normalizedEventIds = topics.map((topic) => topic.id);
  const parentStyle = resolveParentStyle(parentStyleId);
  const primaryTopic = topics[0] ?? FALLBACK_TOPICS[0];
  const id = buildParentAiSessionKey({
    week,
    eventIds: normalizedEventIds,
    eventOutcomes: normalizedOutcomes,
    parentStyleId: parentStyle.id,
  });

  return {
    id,
    week,
    eventIds: normalizedEventIds,
    eventOutcomes: normalizedOutcomes,
    parentStyleId: parentStyle.id,
    maxTurns,
    turnCount: 0,
    trust: parentTrustFromEventOutcomes(normalizedOutcomes, trust),
    completedTaskIds: [],
    taskAssessments: [],
    harmfulStreak: 0,
    harmfulSignalHistory: [],
    conversationEnded: false,
    endReason: 'continue',
    lastEvaluation: null,
    messages: [
      {
        role: 'system',
        name: '系统',
        text: normalizedEventIds.some((idValue) => idValue.startsWith('fallback'))
          ? '本周未触发特殊事件，使用原有家长沟通兜底主题。'
          : '家长发来一条消息。',
      },
      {
        role: 'parent',
        name: primaryTopic.parentName,
        text: buildInitialParentMessage(primaryTopic, parentStyle),
      },
    ],
  };
}

export function normalizeParentAiSession(session) {
  const fallback = createParentAiSession();
  const next = {
    ...fallback,
    ...(session && typeof session === 'object' ? cloneJson(session) : {}),
  };
  next.eventIds = normalizeEventIds(next.eventIds);
  next.eventOutcomes = normalizeEventOutcomes(next.eventOutcomes);
  if (!next.eventOutcomes.length && next.eventIds.some((eventId) => !eventId.startsWith('fallback'))) {
    next.eventIds = [...fallback.eventIds];
    next.messages = cloneJson(fallback.messages);
    next.completedTaskIds = [];
    next.taskAssessments = [];
    next.turnCount = 0;
  }
  next.parentStyleId = resolveParentStyle(next.parentStyleId).id;
  next.maxTurns = Math.max(1, Number(next.maxTurns) || fallback.maxTurns);
  next.turnCount = Math.max(0, Number(next.turnCount) || 0);
  next.trust = clamp(Number(next.trust) || 50, 0, 100);
  next.completedTaskIds = normalizeEventIds(next.completedTaskIds);
  next.taskAssessments = Array.isArray(next.taskAssessments) ? next.taskAssessments : [];
  next.harmfulStreak = Math.max(0, Number(next.harmfulStreak) || 0);
  next.harmfulSignalHistory = normalizeEventIds(next.harmfulSignalHistory);
  next.messages = Array.isArray(next.messages) ? next.messages : [];
  next.id = next.id || buildParentAiSessionKey({
    week: next.week,
    eventIds: next.eventIds,
    eventOutcomes: next.eventOutcomes,
    parentStyleId: next.parentStyleId,
  });
  return next;
}

export function getRequiredMissingTaskIds(session) {
  const normalized = normalizeParentAiSession(session);
  const completed = new Set(normalized.completedTaskIds);
  return requiredTaskIds().filter((taskId) => !completed.has(taskId));
}

export function buildParentTurnPayload(session, playerReply) {
  const normalized = normalizeParentAiSession(session);
  const parentStyle = resolveParentStyle(normalized.parentStyleId);
  const topics = resolveParentAiTopics(normalized.eventIds, normalized.eventOutcomes);
  return {
    week: normalized.week,
    turnCount: normalized.turnCount,
    maxTurns: normalized.maxTurns,
    communicationTasks: COMMUNICATION_TASKS,
    completedTaskIds: normalized.completedTaskIds,
    taskAssessments: normalized.taskAssessments,
    missingRequiredTaskIds: getRequiredMissingTaskIds(normalized),
    parentStyle,
    harmfulStreak: normalized.harmfulStreak,
    harmfulSignalHistory: normalized.harmfulSignalHistory,
    topics,
    careStandards: CARE_STANDARDS,
    history: normalized.messages,
    trust: normalized.trust,
    playerReply,
    currentPlayerReply: playerReply,
  };
}

export function applyParentTurnResult(session, result, playerReply = '') {
  const next = normalizeParentAiSession(session);
  const safeResult = result && typeof result === 'object' ? result : {};
  const topic = getPrimaryParentAiTopic(next);
  const trustDelta = Number(safeResult.trustDelta) || 0;

  if (playerReply) {
    next.messages.push({
      role: 'player',
      name: '照护者',
      text: playerReply,
    });
  }

  if (safeResult.parentReply) {
    next.messages.push({
      role: 'parent',
      name: topic.parentName,
      text: safeResult.parentReply,
    });
  }

  next.turnCount += 1;
  next.trust = clamp(next.trust + trustDelta, 0, 100);
  next.completedTaskIds = Array.isArray(safeResult.completedTaskIds) ? safeResult.completedTaskIds : next.completedTaskIds;
  next.taskAssessments = Array.isArray(safeResult.taskAssessments) ? safeResult.taskAssessments : next.taskAssessments;
  next.harmfulStreak = Math.max(0, Number(safeResult.harmfulStreak) || 0);
  next.harmfulSignalHistory = Array.isArray(safeResult.harmfulSignalHistory)
    ? safeResult.harmfulSignalHistory
    : next.harmfulSignalHistory;
  next.lastEvaluation = safeResult;
  next.conversationEnded = Boolean(safeResult.shouldEnd);
  next.endReason = safeResult.endReason ?? (next.conversationEnded ? 'resolved' : 'continue');
  return next;
}

export function getTriggeredParentAiEventIds(gs, { week = Number(gs?.day) || 1 } = {}) {
  return unique(getTriggeredParentAiOutcomes(gs, { week }).map((outcome) => outcome.eventId));
}

export function getTriggeredParentAiOutcomes(gs, { week = Number(gs?.day) || 1 } = {}) {
  const known = new Set(PARENT_AI_EVENTS.map((event) => event.id));
  return normalizeEventOutcomes(gs?.dayProgress?.parentAiTriggeredOutcomes)
    .filter((outcome) => Number(outcome.week) === Number(week))
    .filter((outcome) => known.has(outcome.eventId));
}

export function getPendingParentAiEventIds(gs, options = {}) {
  return unique(getPendingParentAiOutcomes(gs, options).map((outcome) => outcome.eventId));
}

export function getPendingParentAiOutcomes(gs, options = {}) {
  const completed = new Set(Array.isArray(gs?.dayProgress?.parentAiCompletedOutcomes)
    ? gs.dayProgress.parentAiCompletedOutcomes
    : []);
  return getTriggeredParentAiOutcomes(gs, options)
    .filter((outcome) => outcome.parentInitiatedEligible === true)
    .filter((outcome) => !completed.has(outcome.id));
}

export function getParentAiEventSummary(eventIdsOrOutcomes = []) {
  const values = Array.isArray(eventIdsOrOutcomes) ? eventIdsOrOutcomes : [eventIdsOrOutcomes];
  const outcomes = values.filter((value) => value && typeof value === 'object');
  const eventIds = outcomes.length ? outcomes.map((outcome) => outcome.eventId) : values;
  return resolveParentAiTopics(eventIds, outcomes)
    .filter((topic) => !topic.id.startsWith('fallback'))
    .map((topic) => topic.title)
    .join(' / ');
}

function buildGenericSampleReplies(topic) {
  const unsafe = Array.isArray(topic.unsafeReplyPatterns) && topic.unsafeReplyPatterns.length
    ? topic.unsafeReplyPatterns[0]
    : '孩子就是不配合';
  const outcomeId = topic.selectedOutcome?.id;
  const scripted = OUTCOME_PLAYER_REPLIES[outcomeId];
  if (!scripted) return cloneJson(PARENT_AI_SAMPLE_REPLY_SETS.fallback);
  return [
    {
      id: 'professional',
      label: '说明现场情况和下一步',
      text: scripted.professional,
    },
    {
      id: 'partial',
      label: '只说明当天记录',
      text: scripted.partial,
    },
    {
      id: 'harmful',
      label: '要求孩子尽快适应',
      text: `${unsafe}。照护所会按统一要求继续练，家里不用另外调整。`,
    },
  ];
}

export function getParentAiSampleReplies(session) {
  const topic = getPrimaryParentAiTopic(session);
  const replies = topic.id.startsWith('fallback')
    ? PARENT_AI_SAMPLE_REPLY_SETS.fallback
    : buildGenericSampleReplies(topic);
  return cloneJson(replies);
}
