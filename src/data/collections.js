// collections.js
// 收集图鉴数据：CG 回忆 8 格、孩子画作 8 格。
export const COLLECTION_CATEGORIES = {
  cg: { id: 'cg', name: 'CG回忆' },
  artwork: { id: 'artwork', name: '孩子画作' },
};

export const GLOBAL_COLLECTIONS_KEY = 'star_care_global_collections_v1';

export const TABLE_ART_DESCRIPTION = [
  '一张桌子的角落。不是整个桌子，是角落那一块。桌面上有一张纸，纸的边缘和桌边平行，差一毫米。',
  '纸的右下角有一小片阴影，是窗户那边照过来的。线条很细，铅笔削得很尖。',
  '桌角的弧度画了三遍，第一遍太钝，第二遍太尖，第三遍刚好。',
  '纸是光滑的，没有褶皱。',
  '画的时候手很稳，画到阴影那块的时候，笔尖稍微抖了一下，但橙橙还是画完了。',
  '这幅画不是“漂亮的静物”，是橙橙在确认：这张桌子在这里，这张纸在这里，光从这里照过来，这些东西是不会突然变的。',
];

export const NO_SOUND_ART_DESCRIPTION = [
  '一扇窗。窗框只画了一半，右边留白很多。窗外有一段墙，墙边有几根脚手架的线。线条很细，有几处断开，又接上。',
  '窗台上放着一副降噪耳机。耳机旁边有一支铅笔，笔尖朝向窗外，但没有碰到窗框。',
  '纸的左下角画了一小块阴影。阴影边缘很浅，像声音停下以后，房间里剩下来的安静。',
  '她画的是声音停下来的那一刻：窗还在，墙还在，耳机也在。下一次声音来的时候，房间里多了一个可以选择的东西。',
];

export const TWO_COLORS_ART_DESCRIPTION = [
  '画纸中间偏左的位置有两个颜色块。左边是蓝色边缘比较圆，右边是黄色形状更扁一点。',
  '两块颜色靠得很近但中间留着一条很窄的空白，那条空白没有被涂掉也没有被线框圈出来只是留在那里。蓝色的边缘被描了两遍第二遍比第一遍更轻，黄色那边有几处颜色重叠像是画到一半停过又接着往下涂。',
  '画面右下角画了一条很浅的横线像桌边也像书架边，横线没有贯穿整张纸停在两种颜色下面一点的位置。',
  '整幅画里没有人也没有书的完整轮廓，但如果看得久一点会想起《小蓝和小黄》的封面，只是这里的蓝和黄没有抱在一起也没有变成绿色——它们只是靠近，还保留着各自的位置。',
];

export const BACK_ART_DESCRIPTION = [
  '画面是一张被翻过来的画纸背面，纸背面是浅米白色，用很淡的灰色和米黄色擦出纸纹。右上角有一块被夹子压过的痕迹，像一个浅浅的方形印子。下边缘有几道油画棒蹭出来的灰影，不均匀，有的地方厚一点，有的地方几乎没有。',
  '画面左上方画了一个很小的金属夹，只画外轮廓和一小段阴影。夹子没有夹住正面，只压在纸背后。旁边有一条短短的透明胶带痕迹，用浅蓝灰色画出反光。',
  '整张画没有人物，也没有原画正面的内容。只有纸背、夹痕、胶带印和边缘阴影。',
  '这张画不是在画“好看的画”。她画的是：一张画如果被拿去展示，背后会怎样被夹住、被贴住、被固定住。',
];
export const TWO_CHAIRS_ART_DESCRIPTION = [
  "一把椅子靠近桌边，画得很仔细。椅背的弧度、椅腿的角度、座面下方的阴影都被描出来了。",
  "另一把椅子画在门边，线条更浅。有的地方只画了一半，像是还在试探这个位置能不能留下来。",
  "两把椅子之间有距离，但地板是同一块。画面里有半个人的轮廓，坐在门边的椅子上。",
  "如果不知道今天发生了什么，它只是两把椅子。但你知道，一把是橙橙熟悉的位置，另一把是父亲今天第一次学会坐下来的位置。"
];

export const DOOR_PERSON_BOY_ART_DESCRIPTION = [
  '画面左侧是桌角、画纸、耳机和画夹。画面右侧是门边的椅子，椅子上坐着一个年轻男性。',
  '他侧身坐着，胸前有“星星照护所”实习工牌，膝上有记录夹，脸部很简略，五官不完整。',
  '人物和桌子之间留出明显距离。地板空出来很多，线条很浅。',
  '这张画不是在画“陪伴”，也不是在画“老师和孩子一起画画”。它画的是：有一个人坐在门边，没有突然靠近，也没有离开。他知道自己该坐在哪里。',
];

export const DOOR_PERSON_GIRL_ART_DESCRIPTION = [
  '画面上方是桌角和画具，下方偏左是坐在门边的年轻女性。',
  '人物不是完整正面，只画了侧身轮廓、束起的头发、胸前工牌、手、鞋尖和靠在椅边的记录夹。',
  '桌子和人物之间留着一条斜向空白。人物没有正对桌子，也没有伸手，只是侧坐在那里。',
  '这张画画的不是“谁对谁好”，也不是“关系变亲近了”。它画的是：那个会留在门边、会等、也不会突然靠近的人。',
];

export const SECOND_PERSON_ART_DESCRIPTION = [
  '画面上还是一个人。右边的人这次没有坐在门边，他坐在房间里面，靠窗的位置，和桌子之间隔了一段距离。',
  '他没有伸手，没有低头看手机，也没有张嘴说话。脸画得简略，鞋尖朝向桌子的方向。',
  '两个人中间隔着一大片留白的地板。留白比上一张窄了一点。',
  '最上面，窗外画了一个很小很小的太阳。不是黄色的，是蓝色的。',
  '这张画不是在说关系已经变得亲密。它只是记录：第二个人也学会了坐在合适的位置，等她自己决定要不要靠近。',
];

function makePlaceholder(id, category) {
  return {
    id,
    category,
    placeholder: true,
  };
}

export const COLLECTIONS_DATA = {
  chengcheng_effort_cg: {
    id: 'chengcheng_effort_cg',
    category: 'cg',
    image: '/assets/collections/cg/chengcheng_cg.png',
    dialogTitle: 'CG回忆《橙橙的努力》',
    dialogLines: [
      '她站在绘本架前，没有急着求助，也没有被催着完成。',
      '那只抬起又放下的手，正在确认一件事能不能慢慢发生。',
    ],
  },
  chenlan_old_photo: {
    id: 'chenlan_old_photo',
    category: 'cg',
    image: '/assets/collections/cg/chenlan_old_photo.png',
    dialogTitle: 'CG回忆',
    dialogLines: ['陈岚年轻时的旧照片。'],
  },
  parent_cg: {
    id: 'parent_cg',
    category: 'cg',
    image: '/assets/collections/cg/parent_cg.png',
    dialogTitle: 'CG回忆《摆好的鞋尖》',
    dialogLines: [
      '孩子蹲在鞋柜旁边，认真地把两只鞋并排摆好，鞋尖一齐朝外。',
      '母亲没有催他，只是站在旁边看着那双鞋，也看着孩子低着头的背影。',
    ],
  },
  sensory_cg: {
    id: 'sensory_cg',
    category: 'cg',
    image: '/assets/collections/cg/sensory_cg.png',
    dialogTitle: 'CG回忆《最高点的秋千》',
    dialogLines: [
      '小凯坐在秋千上，双手死死攥住绳子，身体在最高点忽然绷紧。',
      '那股原本让他兴奋的速度，突然变成了让他承受不住的东西。',
    ],
  },
  reputation_end_cg: {
    id: 'reputation_end_cg',
    category: 'cg',
    image: '/assets/collections/cg/reputation_end.png',
    dialogTitle: 'CG回忆《新的垫子》',
    dialogLines: [
      '新的感统垫铺好了，旧地板上那条褪色的箭头没有被盖住。',
      '有个孩子低头看了一眼箭头，又看了一眼新垫子，慢慢走了过去。',
      '这一次，刘老师没有伸手带他。',
    ],
  },
  communication_end_cg: {
    id: 'communication_end_cg',
    category: 'cg',
    image: '/assets/collections/cg/communication_end.png',
    dialogTitle: 'CG回忆《新的清单》',
    dialogLines: [
      '纸页翻到新的一张。你在第一栏写下孩子今天停在门口的时间。',
      '窗外的光落在桌角。陈岚刚才写下的那行小字还在清单空白处。',
      '你把铅笔削尖了一点，然后继续写。',
    ],
  },
  chengcheng_end_cg: {
    id: 'chengcheng_end_cg',
    category: 'cg',
    image: '/assets/collections/cg/chengchengend.png',
    dialogTitle: 'CG回忆《午后的光》',
    dialogLines: [
      '走廊尽头感统室的门开着，橙橙在里面做着简单的训练。',
      '午后的光从感统室的窗户照进来，落在地面上。',
      '那一小片光停在你脚边，不热，只是亮着。',
    ],
  },
  last_end_cg: {
    id: 'last_end_cg',
    category: 'cg',
    image: '/assets/collections/cg/last_end.png',
    dialogTitle: 'CG回忆《走廊里的光》',
    dialogLines: [
      '有一个孩子从感统室跳完弹床出来，从你旁边经过，停了一下，看了你一眼。然后他继续走。',
      '你让他走过去。他没有回头，你也没有叫他。',
      '窗外的光还在移动。很慢。照在地板上的位置，和你刚来照护所的那个下午，其实差不多。',
    ],
  },

  table_art: {
    id: 'table_art',
    category: 'artwork',
    image: '/assets/collections/artwork/table_art.png',
    dialogTitle: '橙橙 画作《桌》',
    dialogLines: TABLE_ART_DESCRIPTION,
  },
  no_sound_art: {
    id: 'no_sound_art',
    category: 'artwork',
    image: '/assets/collections/artwork/no_sound_art.png',
    dialogTitle: '橙橙 画作《无声》',
    dialogLines: NO_SOUND_ART_DESCRIPTION,
  },
  two_colors_art: {
    id: 'two_colors_art',
    category: 'artwork',
    image: '/assets/collections/artwork/two_colors_art.png',
    dialogTitle: '橙橙 画作《两种颜色》',
    dialogLines: TWO_COLORS_ART_DESCRIPTION,
  },
  back_art: {
    id: 'back_art',
    category: 'artwork',
    image: '/assets/collections/artwork/back_art.png',
    dialogTitle: '橙橙 画作《背面》',
    dialogLines: BACK_ART_DESCRIPTION,
  },
  two_chairs_art: {
    id: 'two_chairs_art',
    category: 'artwork',
    image: '/assets/collections/artwork/two_chairs_art.png',
    dialogTitle: '橙橙 画作《两把椅子》',
    dialogLines: TWO_CHAIRS_ART_DESCRIPTION,
  },
  door_person_boy_art: {
    id: 'door_person_boy_art',
    category: 'artwork',
    image: '/assets/collections/artwork/week7_boy_art.png',
    dialogTitle: '橙橙 画作《门边的人》',
    dialogLines: DOOR_PERSON_BOY_ART_DESCRIPTION,
  },
  door_person_girl_art: {
    id: 'door_person_girl_art',
    category: 'artwork',
    image: '/assets/collections/artwork/week7_girl_art.png',
    dialogTitle: '橙橙 画作《门边的人》',
    dialogLines: DOOR_PERSON_GIRL_ART_DESCRIPTION,
  },
  second_person_art: {
    id: 'second_person_art',
    category: 'artwork',
    image: '/assets/collections/artwork/second_person_art.png',
    dialogTitle: '橙橙 画作《第二个人》',
    dialogLines: SECOND_PERSON_ART_DESCRIPTION,
  },
};

function readGlobalCollectionsRaw() {
  try {
    const raw = localStorage.getItem(GLOBAL_COLLECTIONS_KEY);
    if (!raw) return { items: {} };
    const parsed = JSON.parse(raw);
    return {
      items: parsed?.items && typeof parsed.items === 'object' ? parsed.items : {},
    };
  } catch {
    return { items: {} };
  }
}

function writeGlobalCollectionsRaw(state) {
  try {
    localStorage.setItem(GLOBAL_COLLECTIONS_KEY, JSON.stringify({
      version: 1,
      updatedAt: Date.now(),
      items: state?.items ?? {},
    }));
    return true;
  } catch {
    return false;
  }
}

export function getGlobalCollections() {
  return readGlobalCollectionsRaw();
}

export function unlockGlobalCollection(collectionId) {
  if (!COLLECTIONS_DATA[collectionId]) return false;

  const global = readGlobalCollectionsRaw();
  if (global.items[collectionId]) return false;

  global.items[collectionId] = {
    obtainedAt: Date.now(),
  };
  writeGlobalCollectionsRaw(global);
  return true;
}

export function syncGlobalCollectionsFromState(gs) {
  const items = gs?.collections?.items;
  if (!items || typeof items !== 'object') return false;

  let changed = false;
  const global = readGlobalCollectionsRaw();

  Object.entries(items).forEach(([id, value]) => {
    if (!value || !COLLECTIONS_DATA[id] || global.items[id]) return;
    const obtainedAt = typeof value === 'object' && value?.obtainedAt ? value.obtainedAt : Date.now();
    global.items[id] = { obtainedAt };
    changed = true;
  });

  if (changed) {
    writeGlobalCollectionsRaw(global);
  }
  return changed;
}

export function isCollectionObtained(collectionId, gs = null) {
  if (gs?.collections?.items?.[collectionId]) return true;
  return Boolean(readGlobalCollectionsRaw().items?.[collectionId]);
}

export function getCollectionsByCategory(categoryId) {
  return Object.values(COLLECTIONS_DATA).filter(item => item.category === categoryId);
}

export function getObtainedCollections(gs) {
  const obtained = {};
  const mergedItems = {
    ...readGlobalCollectionsRaw().items,
    ...(gs?.collections?.items ?? {}),
  };
  
  Object.keys(mergedItems).forEach(id => {
    if (mergedItems[id] && COLLECTIONS_DATA[id]) {
      obtained[id] = COLLECTIONS_DATA[id];
    }
  });

  return obtained;
}

export function getUnobtainedCollections(gs) {
  const obtained = getObtainedCollections(gs);
  const unobtained = {};

  Object.entries(COLLECTIONS_DATA).forEach(([id, data]) => {
    if (!obtained[id]) {
      unobtained[id] = data;
    }
  });

  return unobtained;
}

export function collectItem(gs, collectionId) {
  if (!COLLECTIONS_DATA[collectionId]) {
    console.warn(`[Collections] 未知收集品: ${collectionId}`);
    return false;
  }

  gs.collections ??= {};
  gs.collections.items ??= {};

  if (gs.collections.items[collectionId]) {
    return false;
  }

  gs.collections.items[collectionId] = {
    obtainedAt: Date.now(),
  };
  unlockGlobalCollection(collectionId);
  
  return true;
}

export function getCollectionProgress(gs) {
  const total = Object.keys(COLLECTIONS_DATA).length;
  const mergedItems = {
    ...readGlobalCollectionsRaw().items,
    ...(gs?.collections?.items ?? {}),
  };
  const obtained = Object.keys(mergedItems).filter(
    id => mergedItems[id] && COLLECTIONS_DATA[id]
  ).length;

  return { obtained, total, percentage: Math.round((obtained / total) * 100) };
}
