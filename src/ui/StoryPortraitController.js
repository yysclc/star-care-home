/**
 * StoryPortraitController.js
 *
 * 职责：只管理剧情立绘的显示 / 切换 / 清除，不涉及 DialogBox、存档或剧情逻辑。
 *
 * 支持的 marker 格式：
 *   __PORTRAIT:chenlan:right__
 *   __PORTRAIT:chengcheng:left__
 *   __PORTRAIT:player:left__          ← 根据 gs.player.gender 自动映射
 *   __PORTRAIT_CLEAR:left__
 *   __PORTRAIT_CLEAR:right__
 *   __PORTRAIT_CLEAR_ALL__
 *
 * key 映射：
 *   chenlan    → portrait_chenlan
 *   chengcheng → portrait_chengcheng
 *   player     → portrait_player_female | portrait_player_male（按 gs.player.gender）
 *
 * Depth 层级：
 *   背景 (StoryBackgroundController) = 0
 *   立绘 (StoryPortraitController)   = 12
 *   DialogBox shade                  = 40   ← 注：shade 会压住立绘，但立绘在 shade 和对话框之间
 *                                            实际效果：立绘在对话框打开时略被压暗（shade alpha 极低），
 *                                            视觉上仍可见，符合 VN 惯例
 *   DialogBox 主体                   = 92+
 *
 * 注意：DialogBox.shade depth=40，立绘 depth=60 会在 shade 上方渲染。
 * 如果希望立绘被 shade 压暗（更沉浸），可将 depth 改为 8。
 * 当前按需求文档设定为 60。
 */

// 立绘 marker 正则
const RE_PORTRAIT     = /^__PORTRAIT:([a-zA-Z0-9_]+):(left|right)__$/;
const RE_PORTRAIT_CLEAR     = /^__PORTRAIT_CLEAR:(left|right)__$/;
const RE_PORTRAIT_CLEAR_ALL = /^__PORTRAIT_CLEAR_ALL__$/;
const STORY_PORTRAIT_TAG = 'storyPortrait';

// 立绘在画面中的站位 x 坐标（画面宽度 840px）
const SLOT_X = { left: 250, right: 810 };

// 立绘底部 y（对齐到 DialogBox 上方）
// DialogBox top ≈ GAME_H(600) - 148 - 18 = 434，留 20px 余量
const PORTRAIT_BOTTOM_Y = 480;

// 立绘显示 depth
const PORTRAIT_DEPTH = 12;
const PORTRAIT_MAX_H = 420;
const PORTRAIT_SCALE_BY_CHAR = {
  chengcheng: 0.7,
  chengchengdad: 1.1,
};
const PORTRAIT_Y_OFFSET_BY_CHAR = {
  chengchengdad: 26,
};

// 动效时长（ms）
const TWEEN_SHOW_MS  = 200;
const TWEEN_CLEAR_MS = 150;
// 滑入偏移量（px）

export default class StoryPortraitController {
  /**
   * @param {Phaser.Scene} scene
   * @param {object}       gs     - GameState，用于读取 gs.player.gender
   */
  constructor(scene, gs) {
    this.scene = scene;
    this.gs    = gs;

    /**
     * 当前各槽位的立绘对象。
     * key: 'left' | 'right'
     * value: Phaser.GameObjects.Container | null
     */
    this._slots = { left: null, right: null };

    /**
     * 当前各槽位正在显示的角色 resolvedId（经 gender 解析后的 charId）。
     * 用于防闪烁：相同 id 不重复触发淡入动效。
     * key: 'left' | 'right'
     * value: string | null
     */
    this._currentIds = { left: null, right: null };
  }

  // ── 公开 API ──────────────────────────────────────────────────────────────

  /**
   * 判断某行是否是立绘相关 marker。
   * @param {string} line
   * @returns {boolean}
   */
  isPortraitMarker(line) {
    if (typeof line !== 'string') return false;
    const t = line.trim();
    return RE_PORTRAIT.test(t) || RE_PORTRAIT_CLEAR.test(t) || RE_PORTRAIT_CLEAR_ALL.test(t);
  }

  /**
   * 批量执行立绘指令（由 OfficeScene._playGreetingSegments 调用）。
   * @param {string[]} cmds - marker 字符串数组
   */
  applyCommands(cmds) {
    if (!Array.isArray(cmds)) return;
    cmds.forEach((cmd) => this._handleOne(cmd));
  }

  clearAll(animate = true) {
    this._clearSlot('left', animate);
    this._clearSlot('right', animate);

    this._slots.left = null;
    this._slots.right = null;
    this._currentIds.left = null;
    this._currentIds.right = null;

    const scene = this.scene;
    const portraits = scene?.children?.list?.filter((obj) => (
      obj?.getData?.(STORY_PORTRAIT_TAG) === true
    )) ?? [];

    portraits.forEach((obj) => {
      scene?.tweens?.killTweensOf?.(obj);

      if (!animate) {
        obj.destroy();
        return;
      }

      scene?.tweens?.add({
        targets:  obj,
        alpha:    0,
        duration: TWEEN_CLEAR_MS,
        ease:     'Sine.easeIn',
        onComplete: () => { obj.destroy(); },
      });
    });
  }

  /**
   * 处理单行：如果是立绘 marker 就执行并返回 true，否则返回 false。
   * @param {string} line
   * @returns {boolean}
   */
  handleMarker(line) {
    if (!this.isPortraitMarker(line)) return false;
    this._handleOne(line.trim());
    return true;
  }

  /**
   * 根据台词行首的说话人姓名牌，自动生成对应的立绘 marker 指令。
   * 只识别已有立绘的角色（陈岚、橙橙、主角），其他说话人返回 null。
   * 旁白（无姓名牌）返回 null。
   *
   * @param {string} line - 台词文本
   * @returns {string|null} marker 字符串，或 null（不需要处理）
   */
  getAutoCommandForLine(line) {
    if (typeof line !== 'string') return '__PORTRAIT_CLEAR_ALL__';

    const m = line.match(new RegExp('^\\u3010(.+?)\\u3011'));
    if (!m) return '__PORTRAIT_CLEAR_ALL__';

    const speaker = m[1].trim();

    if (speaker === '陈岚') {
      return '__PORTRAIT:chenlan:right__';
    }

    if (speaker === '周嘉宁') {
      return '__PORTRAIT:zhoujianing:right__';
    }

    if (speaker === '橙橙') {
      return '__PORTRAIT:chengcheng:left__';
    }

    if (speaker === '橙橙父亲') {
      return '__PORTRAIT:chengchengdad:right__';
    }

    if (speaker === '你') {
      return '__PORTRAIT:player:left__';
    }

    return '__PORTRAIT_CLEAR_ALL__';
  }

  /**
   * 清除所有槽位立绘并销毁资源。
   */
  destroy() {
    this.clearAll(false);
  }

  // ── 内部：marker 分发 ──────────────────────────────────────────────────────

  _handleOne(cmd) {
    // __PORTRAIT_CLEAR_ALL__
    if (RE_PORTRAIT_CLEAR_ALL.test(cmd)) {
      this.clearAll(true);
      return;
    }

    // __PORTRAIT_CLEAR:left__ / __PORTRAIT_CLEAR:right__
    const mClear = cmd.match(RE_PORTRAIT_CLEAR);
    if (mClear) {
      this._clearSlot(mClear[1], true);
      return;
    }

    // __PORTRAIT:charId:slot__
    const mShow = cmd.match(RE_PORTRAIT);
    if (mShow) {
      const charId     = mShow[1];
      const slot       = mShow[2];
      // resolvedId：player 需经 gender 解析，用于防闪烁比较
      const resolvedId = charId === 'player' ? this._resolveKey('player') : charId;
      const texKey     = this._resolveKey(charId);
      this._showPortrait(slot, texKey, charId, resolvedId);
    }
  }

  // ── 内部：key 映射 ─────────────────────────────────────────────────────────

  /**
   * 将角色 ID 映射为 Phaser texture key。
   * 'player' 根据 gs.player.gender 选择 female / male。
   */
  _resolveKey(charId) {
    if (charId === 'player') {
      const gender = this.gs?.player?.gender;
      return gender === 'female' ? 'portrait_player_female' : 'portrait_player_male';
    }
    return `portrait_${charId}`;
  }

  // ── 内部：立绘操作 ─────────────────────────────────────────────────────────

  /**
   * 在指定槽位显示立绘。
   * - 若 resolvedId 与当前槽位相同，防闪烁直接 return。
   * - 若槽位已有不同立绘，先淡出再淡入新立绘。
   *
   * @param {'left'|'right'} slot
   * @param {string}         texKey     - Phaser texture key
   * @param {string}         charId     - 原始角色 ID，用于占位文字
   * @param {string}         resolvedId - gender 解析后的唯一 ID，用于防闪烁比较
   */
  _showPortrait(slot, texKey, charId, resolvedId) {
    // 防闪烁：同一角色已在该槽位，跳过
    if (this._currentIds[slot] === resolvedId) return;

    const scene   = this.scene;
    const targetX = SLOT_X[slot] ?? SLOT_X.left;

    // 如果同槽位已有不同立绘，先淡出销毁
    if (this._slots[slot]) {
      this._clearSlot(slot, true);
    }

    // 记录当前槽位角色 ID
    this._currentIds[slot] = resolvedId;

    // 创建新立绘对象（真图 or 占位）
    const portrait = this._createPortraitObject(texKey, charId, targetX);

    this._slots[slot] = portrait;

    // 滑入方向：left 槽从左侧滑入，right 槽从右侧滑入
    portrait.setAlpha(0);
    portrait.setX(targetX);

    scene.tweens.add({
      targets:  portrait,
      alpha:    1,
      duration: TWEEN_SHOW_MS,
      ease:     'Sine.easeOut',
    });
  }

  /**
   * 清除指定槽位的立绘。
   * @param {'left'|'right'} slot
   * @param {boolean}        animate - 是否有淡出动效
   */
  _clearSlot(slot, animate) {
    const obj = this._slots[slot];
    if (!obj) {
      this._currentIds[slot] = null;
      return;
    }

    this.scene?.tweens?.killTweensOf?.(obj);

    this._slots[slot] = null;
    this._currentIds[slot] = null;   // 同步清除防闪烁记录

    if (!animate) {
      obj.destroy();
      return;
    }

    this.scene.tweens.add({
      targets:  obj,
      alpha:    0,
      duration: TWEEN_CLEAR_MS,
      ease:     'Sine.easeIn',
      onComplete: () => { obj.destroy(); },
    });
  }

  // ── 内部：对象创建 ─────────────────────────────────────────────────────────

  /**
   * 创建立绘 Container。
   * - texture 存在：显示 Image
   * - texture 不存在：显示占位半身框 + key 文本，不黑屏不报错
   *
   * Container 锚点：水平居中，底部对齐 PORTRAIT_BOTTOM_Y。
   */
  _createPortraitObject(texKey, charId, x) {
    const scene = this.scene;
    const y = PORTRAIT_BOTTOM_Y + (PORTRAIT_Y_OFFSET_BY_CHAR[charId] ?? 0);

    if (scene.textures.exists(texKey)) {
      // ── 真实立绘 ──
      const img = scene.add.image(0, 0, texKey).setOrigin(0.5, 1);

      // 等比缩放，高度上限 420px
      const fitScale = img.height > PORTRAIT_MAX_H ? PORTRAIT_MAX_H / img.height : 1;
      const characterScale = PORTRAIT_SCALE_BY_CHAR[charId] ?? 1;
      img.setScale(fitScale * characterScale);

      const container = scene.add.container(x, y, [img])
        .setDepth(PORTRAIT_DEPTH);

      container.setData(STORY_PORTRAIT_TAG, true);
      container.setName(`storyPortrait:${charId}`);

      return container;
    }

    // ── 占位立绘 ──
    console.warn(`[StoryPortrait] texture "${texKey}" 不存在，使用占位立绘（${charId}）`);

    const phW = 160;
    const phH = 300;

    const rect = scene.add.graphics();
    // 半透明深蓝-灰色半身框
    rect.fillStyle(0x2d3a55, 0.72);
    rect.fillRoundedRect(-phW / 2, -phH, phW, phH, 14);
    rect.lineStyle(2, 0x7a9abf, 0.6);
    rect.strokeRoundedRect(-phW / 2, -phH, phW, phH, 14);

    // 剪影小人轮廓（头部圆 + 身体矩形，纯装饰）
    rect.fillStyle(0x4a5f80, 0.5);
    rect.fillCircle(0, -phH + 45, 26);
    rect.fillRect(-22, -phH + 74, 44, 80);

    const label = scene.add.text(0, -36, charId, {
      fontFamily: '"MaokenZhuyuan", "Microsoft YaHei", sans-serif',
      fontSize:   '14px',
      color:      '#8bafd4',
      alpha:      0.85,
    }).setOrigin(0.5, 1);

    const container = scene.add.container(x, y, [rect, label])
      .setDepth(PORTRAIT_DEPTH);

    container.setData(STORY_PORTRAIT_TAG, true);
    container.setName(`storyPortrait:${charId}`);

    return container;
  }
}
