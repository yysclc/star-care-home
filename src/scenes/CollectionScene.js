// CollectionScene.js
// 收集图鉴场景

import Phaser from 'phaser';
import { ASSET_KEYS, ASSET_PATHS, GAME_H, GAME_W, contentX } from '../core/Constants.js';
import { COLLECTION_CATEGORIES, COLLECTIONS_DATA, isCollectionObtained } from '../data/collections.js';
import { makeButton, makeLabel } from '../ui/widgets.js';
import DialogBox from '../ui/DialogBox.js';
import { getUiTheme } from '../ui/uiThemes.js';
import ResourceManager from '../core/ResourceManager.js';

const PAGE_SIZE = 8;
const CATEGORY_ORDER = ['cg', 'artwork'];

export default class CollectionScene extends Phaser.Scene {
  constructor() {
    super('CollectionScene');
  }

  init(data) {
    this.gs = data?.gs || null;
    this.fromScene = data?.fromScene || 'StartScene';
    this.themeName = data?.theme || (this.fromScene === 'StartScene' ? 'start' : 'warm');
    this.theme = getUiTheme(this.themeName);
    this.currentCategory = 'cg';
    this.currentPage = 0;
  }

  preload() {
    // 加载背景图（如果有）
    ResourceManager.queueImage(this, ASSET_KEYS.office, ASSET_PATHS.office);
  }

  create() {
    this.dialog = new DialogBox(this);
    this._drawBackground();

    // 标题
    makeLabel(this, GAME_W / 2, 104, '收 集 图 鉴', {
      fontSize: '28px',
      color: this.theme.text,
      align: 'center',
    }).setOrigin(0.5).setShadow(0, 2, this.themeName === 'start' ? '#020816' : '#ffffff', 2, true, true);

    // 收集进度
    this.progressLabel = makeLabel(this, GAME_W / 2, 138, '', {
      fontSize: '15px',
      color: this.theme.subtext,
      align: 'center',
    }).setOrigin(0.5);
    this._updateProgressLabel();

    // 返回按钮
    makeButton(this, contentX(150), 104, 108, 38, '← 返回', () => {
      this._closeOverlay();
    }, {
      fontSize: '15px',
      fill: this.theme.buttonFill,
      hover: this.theme.buttonHover,
      stroke: this.theme.buttonStroke,
      textColor: this.theme.buttonText,
      radius: 14,
    }).setDepth(10);

    // 分类标签
    this.createCategoryTabs();

    // 收集品网格
    this.createCollectionGrid();

    // 详情弹窗（初始隐藏）
    this.detailContainer = null;
    this._loadingImages = new Set();
    this._pendingPlayItemId = null;
    this._loadingText = null;
    this._preloadUnlockedImages();
  }

  _drawBackground() {
    this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, this.theme.overlay, this.theme.overlayAlpha)
      .setInteractive();

    const panelW = 820;
    const panelH = 528;
    const panelX = (GAME_W - panelW) / 2;
    const panelY = 58;

    const shadow = this.add.graphics();
    shadow.fillStyle(this.theme.shadow, this.theme.shadowAlpha);
    shadow.fillRoundedRect(panelX + 8, panelY + 10, panelW, panelH, 24);

    const panel = this.add.graphics();
    if (this.theme.panelFill2) {
      panel.fillGradientStyle(this.theme.panelFill, this.theme.panelFill, this.theme.panelFill2, this.theme.panelFill2, this.theme.panelAlpha);
    } else {
      panel.fillStyle(this.theme.panelFill, this.theme.panelAlpha);
    }
    panel.fillRoundedRect(panelX, panelY, panelW, panelH, 24);
    panel.lineStyle(3, this.theme.panelStroke, this.theme.panelStrokeAlpha);
    panel.strokeRoundedRect(panelX, panelY, panelW, panelH, 24);
    panel.lineStyle(1, this.theme.innerStroke, this.theme.innerStrokeAlpha);
    panel.strokeRoundedRect(panelX + 8, panelY + 8, panelW - 16, panelH - 16, 18);

    const header = this.add.graphics();
    header.fillStyle(this.theme.headerFill, this.theme.headerAlpha);
    header.fillRoundedRect(panelX + 24, panelY + 30, panelW - 48, 128, 18);
  }

  _closeOverlay() {
    if (this.fromScene && this.scene.isActive(this.fromScene)) {
      this.scene.stop();
      return;
    }
    this.scene.start(this.fromScene || 'StartScene', { gs: this.gs });
  }

  createCategoryTabs() {
    const categories = CATEGORY_ORDER.map(id => COLLECTION_CATEGORIES[id]).filter(Boolean);

    if (this.categoryContainer) {
      this.categoryContainer.destroy();
    }
    this.categoryContainer = this.add.container(0, 0).setDepth(10);

    const startX = GAME_W / 2 - 86;
    const startY = 176;
    const tabWidth = 148;
    const tabGap = 24;

    categories.forEach((cat, index) => {
      const x = startX + index * (tabWidth + tabGap);
      const isActive = this.currentCategory === cat.id;

      const tab = makeButton(this, x, startY, tabWidth, 34, cat.name, () => {
        this.currentCategory = cat.id;
        this.currentPage = 0;
        this._updateProgressLabel();
        this.createCollectionGrid(); // 刷新网格
        this.createCategoryTabs(); // 刷新标签
      }, {
        fontSize: '14px',
        fill: isActive ? this.theme.buttonActiveFill : this.theme.buttonFill,
        hover: isActive ? this.theme.buttonActiveFill : this.theme.buttonHover,
        stroke: this.theme.buttonStroke,
        textColor: this.theme.buttonText,
        radius: 12,
        disabled: isActive,
        disabledFill: this.theme.buttonActiveFill,
        disabledTextColor: this.theme.closeText,
      });
      tab.setDepth(10);
      this.categoryContainer.add([tab.g, tab.t, tab.zone]);
    });
  }

  createCollectionGrid() {
    // 清除旧网格
    if (this.gridContainer) {
      this.gridContainer.destroy();
    }

    this.gridContainer = this.add.container(0, 0).setDepth(5);

    const allItems = this._getCategoryItems(this.currentCategory);
    const totalPages = Math.max(1, Math.ceil(allItems.length / PAGE_SIZE));
    this.currentPage = Phaser.Math.Clamp(this.currentPage, 0, totalPages - 1);
    const items = allItems.slice(this.currentPage * PAGE_SIZE, (this.currentPage + 1) * PAGE_SIZE);

    // 网格布局
    const startX = contentX(119);
    const startY = 244;
    const cardWidth = 164;
    const cardHeight = 92;
    const labelHeight = 0;
    const cols = 4;
    const colGap = 22;
    const rowGap = 40;

    for (let index = 0; index < PAGE_SIZE; index++) {
      const item = items[index] || null;
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = startX + col * (cardWidth + colGap);
      const y = startY + row * (cardHeight + labelHeight + rowGap);

      const isObtained = item && isCollectionObtained(item.id, this.gs);

      // 16:9 缩略图背景
      const bg = this.add.graphics();
      bg.fillStyle(
        isObtained ? this.theme.buttonFill : this.theme.disabledFill,
        item ? (isObtained ? 0.96 : 0.72) : 0.34
      );
      bg.fillRect(x, y, cardWidth, cardHeight);
      bg.lineStyle(2, isObtained ? this.theme.buttonStroke : this.theme.disabledStroke, isObtained ? 0.72 : 0.48);
      bg.strokeRect(x, y, cardWidth, cardHeight);

      const contents = [];
      if (isObtained && item.image && this.textures.exists(item.id)) {
        const image = this.add.image(x + cardWidth / 2, y + cardHeight / 2, item.id);
        const scale = Math.max(cardWidth / image.width, cardHeight / image.height);
        image.setScale(scale);
        image.setCrop(
          Math.max(0, (image.width - cardWidth / scale) / 2),
          Math.max(0, (image.height - cardHeight / scale) / 2),
          Math.min(image.width, cardWidth / scale),
          Math.min(image.height, cardHeight / scale)
        );
        contents.push(image);
      } else {
        const icon = this.add.text(x + cardWidth / 2, y + cardHeight / 2, item ? '？' : '', {
          fontSize: '34px',
          color: this.theme.subtext,
          align: 'center',
        }).setOrigin(0.5);
        contents.push(icon);
      }

      // 稀有度指示（已获得才显示）
      // 交互区域
      const hitArea = this.add.rectangle(x + cardWidth / 2, y + cardHeight / 2, cardWidth, cardHeight, 0xffffff, 0);
      if (item && isObtained) {
        hitArea
          .setInteractive({ useHandCursor: true })
          .on('pointerdown', () => {
            this._playOrLoadCollectionStory(item, x + cardWidth / 2, y + cardHeight / 2);
          });
      }

      this.gridContainer.add([bg, ...contents, hitArea]);
    }

    this._createPageControls(totalPages);
  }

  _getCategoryItems(categoryId) {
    return Object.values(COLLECTIONS_DATA).filter(item => item.category === categoryId);
  }

  _getCategoryProgress(categoryId) {
    const items = this._getCategoryItems(categoryId);
    const obtained = items.filter(item => isCollectionObtained(item.id, this.gs)).length;
    const total = items.length;
    const percentage = total > 0 ? Math.round((obtained / total) * 100) : 0;
    return { obtained, total, percentage };
  }

  _updateProgressLabel() {
    if (!this.progressLabel) return;
    const progress = this._getCategoryProgress(this.currentCategory);
    const categoryName = COLLECTION_CATEGORIES[this.currentCategory]?.name ?? '收集';
    this.progressLabel.setText(`${categoryName}：${progress.obtained} / ${progress.total}（${progress.percentage}%）`);
  }

  _getUnlockedImageItems() {
    return Object.values(COLLECTIONS_DATA)
      .filter(item => item?.image && isCollectionObtained(item.id, this.gs));
  }

  _preloadUnlockedImages() {
    const toLoad = this._getUnlockedImageItems()
      .filter(item => !this.textures.exists(item.id) && !ResourceManager.isImagePending(item.id) && !this._loadingImages.has(item.id));

    if (toLoad.length === 0) return;

    toLoad.forEach((item) => {
      this._loadingImages.add(item.id);
      ResourceManager.queueImage(this, item.id, item.image);
    });

    this.load.once('complete', () => {
      toLoad.forEach((item) => this._loadingImages.delete(item.id));
      this._loadingText?.destroy();
      this._loadingText = null;

      if (this._pendingPlayItemId) {
        const pending = COLLECTIONS_DATA[this._pendingPlayItemId];
        this._pendingPlayItemId = null;
        if (pending && this.textures.exists(pending.id)) {
          this.playCollectionStory(pending);
          return;
        }
      }

      this.createCollectionGrid();
    });

    this.load.start();
  }

  _playOrLoadCollectionStory(item, x, y) {
    if (!item?.image) return;

    if (this.textures.exists(item.id)) {
      this.playCollectionStory(item);
      return;
    }

    this._pendingPlayItemId = item.id;
    this._loadingText?.destroy();
    this._loadingText = this.add.text(x, y, '正在读取...', {
      fontSize: '14px',
      color: this.theme.text,
      align: 'center',
    }).setOrigin(0.5).setDepth(20);

    if (!this._loadingImages.has(item.id)) {
      this._preloadUnlockedImages();
    }
  }

  _createPageControls(totalPages) {
    if (this.pageControls) {
      this.pageControls.destroy();
    }
    this.pageControls = this.add.container(0, 0).setDepth(10);

    if (totalPages <= 1) return;

    const pageText = this.add.text(GAME_W / 2, 552, `${this.currentPage + 1} / ${totalPages}`, {
      fontSize: '14px',
      color: this.theme.subtext,
      align: 'center',
    }).setOrigin(0.5);

    const prev = makeButton(this, GAME_W / 2 - 82, 552, 64, 30, '上一页', () => {
      this.currentPage = Math.max(0, this.currentPage - 1);
      this.createCollectionGrid();
    }, {
      fontSize: '13px',
      fill: this.theme.buttonFill,
      hover: this.theme.buttonHover,
      stroke: this.theme.buttonStroke,
      textColor: this.theme.buttonText,
      disabled: this.currentPage <= 0,
      radius: 10,
    }).setDepth(10);

    const next = makeButton(this, GAME_W / 2 + 82, 552, 64, 30, '下一页', () => {
      this.currentPage = Math.min(totalPages - 1, this.currentPage + 1);
      this.createCollectionGrid();
    }, {
      fontSize: '13px',
      fill: this.theme.buttonFill,
      hover: this.theme.buttonHover,
      stroke: this.theme.buttonStroke,
      textColor: this.theme.buttonText,
      disabled: this.currentPage >= totalPages - 1,
      radius: 10,
    }).setDepth(10);

    this.pageControls.add([prev.g, prev.t, prev.zone, pageText, next.g, next.t, next.zone]);
  }

  playCollectionStory(item) {
    if (!item?.image || !this.textures.exists(item.id)) return;
    if (this.collectionStoryContainer) {
      this.collectionStoryContainer.destroy();
    }

    this.collectionStoryContainer = this.add.container(0, 0).setDepth(60);

    const bg = this.add.image(GAME_W / 2, GAME_H / 2, item.id).setDepth(60);
    const scale = Math.max(GAME_W / bg.width, GAME_H / bg.height);
    bg.setScale(scale);

    const warmShade = this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x2a1a0d, 0.16)
      .setDepth(61);

    this.collectionStoryContainer.add([bg, warmShade]);

    const rawLines = item.dialogLines || [];
    const title = item.dialogTitle ? `${item.dialogTitle}：` : '';
    const lines = rawLines.map((line, index) => (index === 0 ? `${title}${line}` : line));

    this.dialog.show(lines, () => {
      const returnZone = this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0xffffff, 0)
        .setDepth(89)
        .setInteractive({ useHandCursor: true })
        .once('pointerdown', () => {
          this.collectionStoryContainer?.destroy();
          this.collectionStoryContainer = null;
        });
      this.collectionStoryContainer?.add(returnZone);
    }, {
      showSkip: false,
      hideSpeaker: true,
      shadeAlpha: 0,
    });
  }
}
