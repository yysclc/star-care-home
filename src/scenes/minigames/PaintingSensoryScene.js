import Phaser from 'phaser';
import { GAME_H, GAME_W } from '../../core/Constants.js';

const THEME = {
  overlay: 0x6b4426,
  panel: 0xfff3d2,
  panelLight: 0xffffeb,
  stroke: 0x9a6a3a,
  strokeDark: 0x6b3f1f,
  text: '#5b3419',
  subText: '#7a4a25',
  green: 0x9fca7a,
  yellow: 0xffdc83,
  red: 0xf3aa94,
  cream: 0xfffbeb,
  button: 0xffe7aa,
  buttonHover: 0xffd980,
};

const ROUND_COUNT = 3;

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const ROUNDS = [
  {
    id: 'colorLoad',
    prompts: [
      '孩子今天对颜色比较敏感，太多颜色容易让他分心。',
      '今天绘画时，孩子对颜色刺激的承受范围比较窄。',
      '颜色太多太亮会让孩子觉得难以下手，今天需要控制一下。',
      '如果一次出现太多颜色，孩子可能会看很久，却不知道该从哪里开始。',
    ],
    leftLabel: '颜色太少',
    rightLabel: '颜色太多',
    green: [0.24, 0.42],
    greenFeedbacks: [
      '颜色数量刚刚好，孩子更容易专注，也更愿意坐下来开始。',
      '颜色清楚不杂乱，孩子找到了愿意拿起画笔的状态。',
      '颜色有选择，但不会一下子涌过来，孩子更容易进入活动。',
    ],
    yellowFeedbacks: [
      '接近合适了，孩子还需要一点时间适应，可以继续观察。',
      '颜色稍微多了一点点，但孩子还是尝试开始了。',
      '这个颜色数量勉强可以，照护者还需要留意孩子有没有退缩。',
    ],
    redFeedbacks: [
      '颜色刺激不太合适，孩子有点不知道从哪里开始。',
      '颜色太多或太少，孩子看起来有些茫然，需要重新调整。',
      '这个颜色强度对孩子今天的状态来说有点难受，先退一步。',
      '颜色一下子太满，孩子可能不是不想画，而是被画面压住了。',
    ],
  },
  {
    id: 'materialTexture',
    prompts: [
      '孩子今天不太喜欢手上沾东西，太湿太黏的材料可能让他停下来。',
      '今天的触感敏感度偏高，颜料的湿度和质地需要注意。',
      '孩子对材料的触感比较在意，太湿或太黏容易让他退缩。',
      '如果颜料黏在手上太久，孩子可能会把注意力全放在不舒服上。',
    ],
    leftLabel: '太干太单调',
    rightLabel: '太湿太黏',
    green: [0.30, 0.48],
    greenFeedbacks: [
      '触感比较温和，孩子更容易接受这次的材料。',
      '用画笔或蜡笔替代手指接触，孩子放松了不少。',
      '材料有一点变化，但不会太黏，孩子愿意继续试试看。',
    ],
    yellowFeedbacks: [
      '触感还可以接受，但旁边最好备好擦手巾，以防孩子不舒服。',
      '接近舒适区，孩子有一点点犹豫，但还是继续了。',
      '孩子能短暂尝试，但照护者还需要准备替代工具。',
    ],
    redFeedbacks: [
      '材料触感不太合适，孩子可能会想躲开或停下来。',
      '太湿了，孩子皱起眉头，需要换个方式或准备手套。',
      '触感刺激有点超出今天的范围，先调整材料再继续。',
      '孩子不碰颜料不一定是不配合，也可能是触感真的太难受。',
    ],
  },
  {
    id: 'smellLoad',
    prompts: [
      '今天材料的气味需要注意，太重的味道可能让孩子很快想离开。',
      '孩子对颜料气味比较敏感，低味材料会更容易让他留下来。',
      '如果气味太明显，孩子可能还没开始画，就已经感到不舒服。',
      '绘画室里的味道也会成为感官输入，今天要把气味控制得温和一点。',
    ],
    leftLabel: '气味很淡',
    rightLabel: '气味太重',
    green: [0.16, 0.34],
    greenFeedbacks: [
      '材料气味比较轻，孩子更容易把注意力放回绘画本身。',
      '气味没有压过活动，孩子愿意继续待在绘画桌前。',
      '低味材料让环境轻松了不少，孩子没有急着离开。',
    ],
    yellowFeedbacks: [
      '气味还不算太重，但需要继续观察孩子有没有皱眉或躲开。',
      '材料勉强可以使用，最好保持通风，别一次摆出太多。',
      '孩子还能接受，不过照护者需要留意气味会不会累积。',
    ],
    redFeedbacks: [
      '气味太明显了，孩子可能会先想躲开，而不是开始画画。',
      '这个味道对孩子今天来说有点过强，可以换低味材料或先通风。',
      '孩子的抗拒可能不是针对绘画，而是环境里的气味太难处理。',
      '气味刺激已经抢走了注意力，现在更适合先减少材料数量。',
    ],
  },
  {
    id: 'paperSound',
    prompts: [
      '今天纸张摩擦声也可能影响孩子，太刺耳的声音会让他紧张。',
      '孩子对细小声音比较敏感，纸张刮擦声需要控制一下。',
      '如果纸张声音太明显，孩子可能会一直注意那个声音，而不是画面。',
      '绘画时的声音也会成为刺激，今天需要选择更安静的材料组合。',
    ],
    leftLabel: '几乎无声',
    rightLabel: '摩擦声太大',
    green: [0.20, 0.40],
    greenFeedbacks: [
      '纸张声音比较柔和，孩子可以更安心地继续画。',
      '声音没有干扰孩子，绘画动作变得稳定了一些。',
      '材料声音刚刚好，孩子不会一直被摩擦声拉走注意力。',
    ],
    yellowFeedbacks: [
      '声音接近可以接受，但孩子如果停顿变多，就要再调整。',
      '摩擦声还不算太明显，可以继续观察孩子的表情和动作。',
      '孩子还能参与，不过材料声音已经有一点存在感了。',
    ],
    redFeedbacks: [
      '纸张摩擦声太明显，孩子可能会因为声音而停下来。',
      '这个声音对孩子今天来说有点刺，可以换纸张或换工具。',
      '孩子不是故意分心，可能是那个细小的声音一直在打扰他。',
      '声音刺激超出范围了，现在更适合先换成更柔和的材料。',
    ],
  },
  {
    id: 'tableOrder',
    prompts: [
      '孩子今天对桌面的混乱比较敏感，太多东西同时出现会让他不安。',
      '桌面上的材料太多太乱，孩子不知道先从哪里拿。',
      '今天需要保持桌面整洁，减少不必要的干扰物。',
      '如果桌面太满，孩子可能还没开始，就已经被材料数量弄乱了。',
    ],
    leftLabel: '材料太少',
    rightLabel: '材料太多太乱',
    green: [0.42, 0.60],
    greenFeedbacks: [
      '桌面材料清楚但不空，孩子知道怎么开始了。',
      '桌面整洁，孩子坐下来后很快就拿起了画笔。',
      '材料摆得有顺序，孩子更容易看见下一步可以做什么。',
    ],
    yellowFeedbacks: [
      '桌面还算有序，孩子需要稍微整理一下才能开始。',
      '材料数量接近合适，但可以再收一收，让桌面更清楚。',
      '孩子能开始尝试，但桌面还需要照护者偶尔提醒。',
    ],
    redFeedbacks: [
      '桌面状态不太合适，孩子可能会感到混乱或过载。',
      '东西太多了，孩子的目光来回转，没办法专注。',
      '桌面太乱或太空，孩子都无法顺利开始，需要重新整理。',
      '孩子没有马上动手，不一定是不愿意，而是桌面线索太乱了。',
    ],
  },
  {
    id: 'personalSpace',
    prompts: [
      '孩子今天对别人靠近比较敏感，距离太近会让他变得紧张。',
      '绘画时如果旁边的人靠得太近，孩子可能会先防备，而不是参与。',
      '今天需要给孩子一点身体空间，让支持不要变成压力。',
      '照护者可以陪在旁边，但距离和节奏也需要让孩子觉得安全。',
    ],
    leftLabel: '离得太远',
    rightLabel: '靠得太近',
    green: [0.36, 0.54],
    greenFeedbacks: [
      '距离刚刚好，孩子知道有人支持，但不会觉得被压迫。',
      '照护者在旁边陪着，却没有贴得太近，孩子比较安心。',
      '孩子保有一点空间，也能看见有人可以帮忙。',
    ],
    yellowFeedbacks: [
      '距离大致可以，但还要观察孩子有没有缩手或转身躲开。',
      '孩子能接受这个距离，不过照护者最好动作再慢一点。',
      '陪伴已经接近合适，只是还需要给孩子更多主动权。',
    ],
    redFeedbacks: [
      '距离不太合适，孩子可能会觉得被催促或被压住。',
      '靠得太近了，孩子先注意到压力，而不是绘画活动。',
      '离得太远或太近都不理想，孩子需要的是能被支持、也能保有空间。',
      '如果孩子往后退，可能是在表达需要更多距离。',
    ],
  },
  {
    id: 'paintOnHands',
    prompts: [
      '孩子今天很在意手上沾颜料，接触方式需要更温和。',
      '如果手上黏黏的感觉太强，孩子可能会一直想擦掉。',
      '今天可以减少直接用手接触，改用画笔、海绵棒或手套。',
      '孩子不喜欢手上沾颜料，不代表他不想画，可能只是需要换一种参与方式。',
    ],
    leftLabel: '完全不接触',
    rightLabel: '手上沾太多',
    green: [0.24, 0.42],
    greenFeedbacks: [
      '接触量刚刚好，孩子能参与，也知道不舒服时可以擦手。',
      '工具和擦手巾准备得合适，孩子更愿意继续尝试。',
      '没有强迫孩子直接摸颜料，他用自己的方式加入了绘画。',
    ],
    yellowFeedbacks: [
      '接触量接近可以接受，但最好把擦手巾放在看得见的位置。',
      '孩子有点犹豫，不过如果可以随时停下，他还能继续试试。',
      '这个方式还可以，但照护者要留意孩子有没有一直看自己的手。',
    ],
    redFeedbacks: [
      '手上沾太多了，孩子可能会立刻想停下来擦掉。',
      '完全不接触也可能让孩子难以参与，需要换成更温和的工具入口。',
      '接触方式不太合适，孩子的注意力都被手上的感觉拉走了。',
      '现在更适合先给擦手巾或工具选择，而不是继续要求他碰颜料。',
    ],
  },
];

const FINAL_TEXTS = {
  success: [
    '你根据孩子今天的感官状态，找到了比较舒服的绘画环境。孩子更能稳定参与绘画。',
    '你把几个感官变量调到了比较合适的位置，孩子更容易安心开始，也更愿意继续尝试。',
    '这次环境调整比较稳定。孩子不是被要求硬忍，而是在更舒服的条件下参与了活动。',
  ],
  normal: [
    '你调整出了一部分合适的环境，但还有些地方不太稳定。孩子愿意尝试，不过仍需要继续观察和支持。',
    '有些刺激已经比较合适了，但仍需要边观察边调整，让孩子慢慢进入活动。',
    '孩子有机会参与了，但照护者还需要继续看他的表情、动作和停顿，随时微调环境。',
  ],
  fail: [
    '绘画环境对孩子来说还是有些过载。现在更适合先减少刺激，给孩子一点休息和重新选择的机会。',
    '这次刺激范围还不太适合孩子。可以先停下来，减少材料或换一种接触方式。',
    '孩子的困难不一定是不愿意画，可能是环境刺激太多、太强或太乱。先退一步会更好。',
  ],
};

const INTRO_TEXTS = [
  [
    '感官支持：不是让孩子硬忍刺激，也不是把刺激全部拿掉，而是调整环境，让孩子更容易安心参与活动。',
    '',
    '绘画时，颜色太强、颜料太黏、气味太重、桌面太乱，都可能让孩子不舒服，甚至无法开始画画。',
    '',
    '规则：观察指针，点击按键，把刺激强度调整到孩子今天能接受的舒适区。',
  ],
];

export default class PaintingSensoryScene extends Phaser.Scene {
  constructor() {
    super('PaintingSensoryScene');
  }

  init(data = {}) {
    this.roomId = data.roomId ?? 'paintingRoom';
    this.returnSceneKey = data.returnSceneKey ?? 'FixedActionScene';
  }

  create() {
    this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');

    this.roundIndex = 0;
    this.roundResults = [];
    this.roundOrder = Phaser.Utils.Array.Shuffle(ROUNDS.slice()).slice(0, ROUND_COUNT);
    this.isStopped = false;
    this.pointerTween = null;
    this.pointer = null;
    this.currentJudge = null;
    this._currentRoundData = null;
    this._stopButton = null;

    this.overlay = this.add.container(0, 0).setDepth(1000);

    const blocker = this.add
      .rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, THEME.overlay, 0.42)
      .setInteractive();

    blocker.on('pointerdown', (pointer, localX, localY, event) => {
      event?.stopPropagation?.();
    });

    this.overlay.add(blocker);

    this.panelW = Math.min(720, GAME_W - 72);
    this.panelH = 560;
    this.panelX = (GAME_W - this.panelW) / 2;
    this.panelY = (GAME_H - this.panelH) / 2;

    const panel = this.add.graphics();

    panel.fillStyle(THEME.panel, 1);
    panel.fillRoundedRect(this.panelX, this.panelY, this.panelW, this.panelH, 24);

    panel.lineStyle(4, THEME.stroke, 1);
    panel.strokeRoundedRect(this.panelX, this.panelY, this.panelW, this.panelH, 24);

    panel.fillStyle(THEME.panelLight, 0.55);
    panel.fillRoundedRect(this.panelX + 16, this.panelY + 16, this.panelW - 32, 58, 18);

    this.overlay.add(panel);

    this.ui = this.add.container(0, 0);
    this.overlay.add(this.ui);

    this.events.once('shutdown', this.cleanup, this);

    this.showIntro();
  }

  cleanup() {
    if (this.pointer) {
      this.tweens.killTweensOf(this.pointer);
    }

    if (this.pointerTween) {
      this.pointerTween.stop();
      this.pointerTween = null;
    }

    if (this.overlay) {
      this.overlay.destroy(true);
      this.overlay = null;
    }

    this.ui = null;
    this.pointer = null;
    this.currentJudge = null;
    this._stopButton = null;
  }

  clearUi() {
    if (this.pointer) {
      this.tweens.killTweensOf(this.pointer);
      this.pointer = null;
    }

    if (this.pointerTween) {
      this.pointerTween.stop();
      this.pointerTween = null;
    }

    if (this.ui) {
      this.ui.removeAll(true);
    }

    this.isStopped = false;
    this.currentJudge = null;
    this._stopButton = null;
  }

  showIntro() {
    this.clearUi();

    this.addText(GAME_W / 2, this.panelY + 46, '绘画室：感官舒适区', {
      fontSize: '26px',
      align: 'center',
      origin: 0.5,
    });

    const introText = pick(INTRO_TEXTS).join('\n');

    this.addText(GAME_W / 2, this.panelY + 130, introText, {
      fontSize: '19px',
      align: 'center',
      origin: [0.5, 0],
      wordWrap: this.panelW - 140,
      lineSpacing: 12,
    });

    const startBtn = this.makeButton(
      GAME_W / 2,
      this.panelY + 460,
      200,
      52,
      '开始调整',
      () => this.showRound()
    );

    this.ui.add(startBtn);
  }

  showRound() {
    this.clearUi();

    const roundDef = this.roundOrder[this.roundIndex] ?? ROUNDS[this.roundIndex % ROUNDS.length];

    this._currentRoundData = {
      ...roundDef,
      prompt: pick(roundDef.prompts),
      greenFeedback: pick(roundDef.greenFeedbacks),
      yellowFeedback: pick(roundDef.yellowFeedbacks),
      redFeedback: pick(roundDef.redFeedbacks),
    };

    const round = this._currentRoundData;

    this.addText(GAME_W / 2, this.panelY + 46, '绘画室：感官舒适区', {
      fontSize: '26px',
      align: 'center',
      origin: 0.5,
    });

    this.addText(GAME_W / 2, this.panelY + 100, `第 ${this.roundIndex + 1} / ${this.roundOrder.length} 轮`, {
      fontSize: '20px',
      align: 'center',
      origin: 0.5,
      color: THEME.subText,
    });

    this.addText(GAME_W / 2, this.panelY + 152, round.prompt, {
      fontSize: '21px',
      align: 'center',
      origin: 0.5,
      wordWrap: this.panelW - 120,
      lineSpacing: 8,
    });

    this.drawSlider(round);

    this._stopButton = this.makeButton(
      GAME_W / 2,
      this.panelY + 456,
      180,
      48,
      '停下',
      () => this.stopPointer()
    );

    this.ui.add(this._stopButton);
  }

  drawSlider(round) {
    const sliderX = this.panelX + 92;
    const sliderY = this.panelY + 310;
    const sliderW = this.panelW - 184;
    const sliderH = 22;

    const greenStart = sliderX + sliderW * round.green[0];
    const greenEnd = sliderX + sliderW * round.green[1];

    const yellowPad = sliderW * 0.075;
    const yellowStart = Math.max(sliderX, greenStart - yellowPad);
    const yellowEnd = Math.min(sliderX + sliderW, greenEnd + yellowPad);

    this.currentJudge = {
      sliderX,
      sliderW,
      greenStart,
      greenEnd,
      yellowStart,
      yellowEnd,
    };

    this.addText(sliderX, sliderY - 54, round.leftLabel, {
      fontSize: '17px',
      origin: [0, 0.5],
      color: THEME.subText,
    });

    this.addText(sliderX + sliderW, sliderY - 54, round.rightLabel, {
      fontSize: '17px',
      origin: [1, 0.5],
      color: THEME.subText,
    });

    const bar = this.add.graphics();

    bar.fillStyle(THEME.red, 0.78);
    bar.fillRoundedRect(sliderX, sliderY - sliderH / 2, sliderW, sliderH, 12);

    bar.fillStyle(THEME.yellow, 0.95);
    bar.fillRoundedRect(yellowStart, sliderY - sliderH / 2, yellowEnd - yellowStart, sliderH, 12);

    bar.fillStyle(THEME.green, 1);
    bar.fillRoundedRect(greenStart, sliderY - sliderH / 2, greenEnd - greenStart, sliderH, 12);

    bar.lineStyle(3, THEME.strokeDark, 0.95);
    bar.strokeRoundedRect(sliderX, sliderY - sliderH / 2, sliderW, sliderH, 12);

    this.ui.add(bar);

    const pointerMark = this.add.graphics();

    pointerMark.fillStyle(THEME.strokeDark, 1);
    pointerMark.fillTriangle(-11, -30, 11, -30, 0, -8);
    pointerMark.fillCircle(0, 0, 8);

    pointerMark.lineStyle(2, THEME.cream, 0.9);
    pointerMark.strokeCircle(0, 0, 8);

    this.pointer = this.add.container(sliderX, sliderY, [pointerMark]);
    this.ui.add(this.pointer);

    this.pointerTween = this.tweens.add({
      targets: this.pointer,
      x: sliderX + sliderW,
      duration: 950,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
  }

  stopPointer() {
    if (this.isStopped || !this.pointer || !this.currentJudge) return;

    this.isStopped = true;

    if (this.pointerTween) {
      this.pointerTween.stop();
      this.pointerTween = null;
    }

    if (this._stopButton) {
      this._stopButton.setVisible(false);
    }

    const hit = this.judgePointer();
    const round = this._currentRoundData;

    this.roundResults.push({
      round: this.roundIndex + 1,
      result: hit,
      id: round.id,
    });

    const feedback =
      hit === 'green'
        ? round.greenFeedback
        : hit === 'yellow'
          ? round.yellowFeedback
          : round.redFeedback;

    const label =
      hit === 'green'
        ? '舒适区'
        : hit === 'yellow'
          ? '接近舒适区'
          : '不太合适';

    this.addText(GAME_W / 2, this.panelY + 382, `结果：${label}`, {
      fontSize: '21px',
      align: 'center',
      origin: 0.5,
      color: THEME.subText,
    });

    this.addText(GAME_W / 2, this.panelY + 424, feedback, {
      fontSize: '19px',
      align: 'center',
      origin: [0.5, 0],
      wordWrap: this.panelW - 140,
      lineSpacing: 8,
    });

    const isLast = this.roundIndex >= this.roundOrder.length - 1;

    const nextButton = this.makeButton(
      GAME_W / 2,
      this.panelY + 510,
      180,
      44,
      isLast ? '看结果' : '下一轮',
      () => {
        if (isLast) {
          this.showFinal();
          return;
        }

        this.roundIndex += 1;
        this.showRound();
      },
      { fontSize: '18px' }
    );

    this.ui.add(nextButton);
  }

  judgePointer() {
    const x = this.pointer.x;
    const j = this.currentJudge;

    if (x >= j.greenStart && x <= j.greenEnd) return 'green';
    if (x >= j.yellowStart && x <= j.yellowEnd) return 'yellow';
    return 'red';
  }

  showFinal() {
    this.clearUi();

    const rating = this.getFinalRating();
    const greenCount = this.roundResults.filter((r) => r.result === 'green').length;
    const yellowCount = this.roundResults.filter((r) => r.result === 'yellow').length;
    const redCount = this.roundResults.filter((r) => r.result === 'red').length;

    const ratingLabel =
      rating === 'success'
        ? '成功'
        : rating === 'normal'
          ? '普通'
          : '失误';

    this.addText(GAME_W / 2, this.panelY + 54, '绘画室：感官舒适区', {
      fontSize: '26px',
      align: 'center',
      origin: 0.5,
    });

    this.addText(GAME_W / 2, this.panelY + 118, `总评：${ratingLabel}`, {
      fontSize: '26px',
      align: 'center',
      origin: 0.5,
      color: THEME.subText,
    });

    this.addText(GAME_W / 2, this.panelY + 174, `绿色 ${greenCount} 次　黄色 ${yellowCount} 次　红色 ${redCount} 次`, {
      fontSize: '20px',
      align: 'center',
      origin: 0.5,
      color: THEME.subText,
    });

    this.addText(GAME_W / 2, this.panelY + 280, pick(FINAL_TEXTS[rating]), {
      fontSize: '21px',
      align: 'center',
      origin: 0.5,
      wordWrap: this.panelW - 120,
      lineSpacing: 9,
    });

    const doneButton = this.makeButton(
      GAME_W / 2,
      this.panelY + 490,
      180,
      48,
      '完成',
      () => this.completeMinigame(rating),
      { fontSize: '19px' }
    );

    this.ui.add(doneButton);
  }

  getFinalRating() {
    const total = this.roundResults.length || ROUND_COUNT;
    const green = this.roundResults.filter((r) => r.result === 'green').length;
    const yellow = this.roundResults.filter((r) => r.result === 'yellow').length;
    const red = this.roundResults.filter((r) => r.result === 'red').length;

    if (green === total || (green === total - 1 && yellow === 1 && red === 0)) return 'success';
    if (red >= Math.ceil(total / 2)) return 'fail';
    if (green >= 1) return 'normal';
    return 'fail';
  }

  completeMinigame(rating) {
    const payload = {
      roomId: this.roomId,
      minigameId: 'paintingSensory',
      rating,
      roundResults: this.roundResults,
    };

    const returnScene = this.scene.get(this.returnSceneKey);
    if (returnScene?.events) {
      returnScene.events.emit('minigame:complete', payload);
    }

    this.scene.stop();
  }

  addText(x, y, text, opts = {}) {
    const origin = opts.origin ?? 0.5;
    const originX = Array.isArray(origin) ? origin[0] : origin;
    const originY = Array.isArray(origin) ? origin[1] : origin;

    const t = this.add
      .text(x, y, text, {
        fontFamily: '"MaokenZhuyuan", "Microsoft YaHei", sans-serif',
        fontSize: opts.fontSize ?? '20px',
        color: opts.color ?? THEME.text,
        align: opts.align ?? 'left',
        lineSpacing: opts.lineSpacing ?? 0,
        wordWrap: opts.wordWrap ? { width: opts.wordWrap, useAdvancedWrap: true } : undefined,
      })
      .setOrigin(originX, originY);

    this.ui.add(t);
    return t;
  }

  makeButton(x, y, w, h, label, onClick, opts = {}) {
    const container = this.add.container(0, 0);

    const bg = this.add.graphics();
    const text = this.add
      .text(x, y, label, {
        fontFamily: '"MaokenZhuyuan", "Microsoft YaHei", sans-serif',
        fontSize: opts.fontSize ?? '18px',
        color: THEME.text,
        align: 'center',
      })
      .setOrigin(0.5);

    const zone = this.add
      .zone(x, y, w, h)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    const draw = (fill) => {
      bg.clear();
      bg.fillStyle(fill, 1);
      bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, 16);
      bg.lineStyle(3, THEME.stroke, 1);
      bg.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 16);
    };

    draw(THEME.button);

    zone.on('pointerover', () => draw(THEME.buttonHover));
    zone.on('pointerout', () => draw(THEME.button));
    zone.on('pointerdown', (pointer, localX, localY, event) => {
      event?.stopPropagation?.();
      onClick?.();
    });

    container.add([bg, text, zone]);
    return container;
  }
}