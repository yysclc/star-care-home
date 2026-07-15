/**
 * StoryBackgroundController.js
 *
 * 职责：只管理剧情背景切换，不涉及 DialogBox 或存档逻辑。
 *
 * 支持的 marker 格式：
 *   __BG:chapter1_office_corridor__
 *   __BG:chapter1_activity_room__
 *
 * 切换效果：
 *   - 旧背景向左滑出 + 淡出（250ms）
 *   - 新背景从右侧滑入 + 淡入（300ms）
 *   - 普通背景 depth=0；CG / 画作展示图 depth=80，盖住 HUD 和按钮但低于 DialogBox
 *   - 如果 texture 不存在，显示纯色矩形占位（避免黑屏）
 */
import { COLLECTIONS_DATA } from '../data/collections.js';

const OVERLAY_BG_KEYS = new Set(
  Object.values(COLLECTIONS_DATA)
    .filter((item) => item?.image)
    .map((item) => item.id)
);

export default class StoryBackgroundController {
  constructor(scene) {
    this.scene = scene;
    this._current = null;   // 当前背景对象（Image 或 Graphics container）
    this._busy = false;

    /** 游戏画面宽高，用于缩放 / 定位 */
    this._W = scene.scale.width;
    this._H = scene.scale.height;
  }

  // ── 公开 API ──────────────────────────────────────────────────────────────

  /**
   * 判断某行是否是 BG marker。
   * @param {string} line
   * @returns {boolean}
   */
  isBgMarker(line) {
    return typeof line === 'string' && /^__BG:[a-zA-Z0-9_]+__$/.test(line.trim());
  }

  /**
   * 处理一行：如果是 BG marker 就执行切换并返回 true，否则返回 false。
   * @param {string} line
   * @returns {boolean} 是否消费了这一行
   */
  handleMarker(line) {
    if (!this.isBgMarker(line)) return false;
    const key = line.trim().replace(/^__BG:/, '').replace(/__$/, '');
    this.setBackground(key, true);
    return true;
  }

  /**
   * 切换到指定背景。
   * @param {string}  bgKey      - Phaser texture key
   * @param {boolean} transition - 是否使用滑入/淡出动画，默认 true
   */
  setBackground(bgKey, transition = true) {
    const scene = this.scene;
    const W = this._W;
    const H = this._H;

    // 创建新背景对象（Image 或占位矩形）
    const newBg = this._createBgObject(bgKey, W, H);

    if (!transition || !this._current) {
      // 无动画：直接显示新背景，销毁旧的
      if (this._current) this._current.destroy();
      this._current = newBg;
      newBg.setAlpha(1);
      return;
    }

    // 新背景：从右侧 W px 处滑入 + 淡入
    newBg.setAlpha(0);
    if (newBg.setX) newBg.setX(W + W / 2);

    const oldBg = this._current;
    this._current = newBg;

    // 旧背景：向左滑出 + 淡出
    scene.tweens.add({
      targets: oldBg,
      x: -(W / 2),
      alpha: 0,
      duration: 260,
      ease: 'Sine.easeIn',
      onComplete: () => { oldBg?.destroy(); },
    });

    // 新背景：滑入 + 淡入
    scene.tweens.add({
      targets: newBg,
      x: W / 2,
      alpha: 1,
      duration: 300,
      ease: 'Sine.easeOut',
    });
  }

  /**
   * 销毁当前背景，释放资源。
   */
  destroy() {
    if (this._current) {
      this._current.destroy();
      this._current = null;
    }
  }

  // ── 内部工具 ──────────────────────────────────────────────────────────────

  /**
   * 创建背景对象。
   * - 如果 texture 已加载：使用 Image，铺满全屏。
   * - 否则：Graphics 占位矩形 + 文字提示，不黑屏。
   */
  _createBgObject(bgKey, W, H) {
    const scene = this.scene;
    const depth = OVERLAY_BG_KEYS.has(bgKey) ? 80 : 0;

    if (bgKey === 'black') {
      return scene.add.rectangle(W / 2, H / 2, W, H, 0x000000, 1)
        .setDepth(depth);
    }

    if (scene.textures.exists(bgKey)) {
      const img = scene.add.image(W / 2, H / 2, bgKey)
        .setDepth(depth);

      // 等比缩放以铺满画布
      const scaleX = W / img.width;
      const scaleY = H / img.height;
      img.setScale(Math.max(scaleX, scaleY));

      return img;
    }

    // 占位：半透明深色矩形 + key 文字
    console.warn(`[StoryBG] texture "${bgKey}" 不存在，使用占位背景`);

    const container = scene.add.container(W / 2, H / 2).setDepth(depth);

    const rect = scene.add.graphics();
    rect.fillStyle(0x1a2540, 0.85);
    rect.fillRect(-W / 2, -H / 2, W, H);
    container.add(rect);

    const label = scene.add.text(0, 0, `[背景占位: ${bgKey}]`, {
      fontFamily: '"MaokenZhuyuan", "Microsoft YaHei", sans-serif',
      fontSize: '18px',
      color: '#8899bb',
      alpha: 0.6,
    }).setOrigin(0.5);
    container.add(label);

    return container;
  }
}
