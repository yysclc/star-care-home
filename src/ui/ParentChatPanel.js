import { CONTENT_CENTER_X } from '../core/Constants.js';

const DEPTH = 118;

export const PARENT_CHAT_LAYOUT = {
  panel: { x: CONTENT_CENTER_X, y: 300, width: 1040, height: 640 },
  close: { x: CONTENT_CENTER_X - 360, y: 54, size: 74, hoverSize: 80 },
  trust: { x: CONTENT_CENTER_X + 300, y: 52, width: 150, barWidth: 142 },
  playerAvatar: { x: CONTENT_CENTER_X + 355, size: 54 },
  parentAvatar: { x: CONTENT_CENTER_X - 355, size: 54 },
  messages: {
    topY: 140,
    bottomY: 484,
    maskX: CONTENT_CENTER_X - 420,
    maskY: 120,
    maskWidth: 840,
    maskHeight: 375,
    gap: 15,
    leftBubbleX: CONTENT_CENTER_X - 310,
    rightBubbleRightX: CONTENT_CENTER_X + 310,
    bubbleMaxWidth: 575,
    bubbleMinWidth: 170,
    horizontalPadding: 22,
    verticalPadding: 15,
  },
  input: {
    x: CONTENT_CENTER_X,
    y: 548,
    width: 690,
    height: 60,
  },
  send: { x: CONTENT_CENTER_X + 340, y: 548, size: 62, hoverSize: 68 },
  contacts: {
    startY: 140,
    gap: 84,
    x: CONTENT_CENTER_X,
    width: 680,
    height: 70,
  },
  replyOptions: {
    x: CONTENT_CENTER_X,
    startY: 380,
    gap: 48,
    width: 760,
    height: 42,
  },
  scrollbar: {
    x: CONTENT_CENTER_X + 425,
    y: 120,
    width: 14,
    height: 375,
    hitWidth: 44,
    thumbMinHeight: 54,
  },
};

const PARENT_AVATAR_COLORS = [0xf9d58c, 0xbfe3c0, 0xb9d7f0, 0xe7c6ef, 0xf5c8b8];
const PARENT_AVATAR_TYPES = ['flower', 'person', 'leaf', 'heart', 'home'];

function wrapText(scene, text, maxWidth, style) {
  const probe = scene.add.text(-9999, -9999, '', style);
  const chars = Array.from(text);
  const lines = [];
  let current = '';
  chars.forEach((char) => {
    const next = current + char;
    probe.setText(next);
    if (probe.width > maxWidth && current) {
      lines.push(current);
      current = char;
    } else {
      current = next;
    }
  });
  if (current) lines.push(current);
  probe.destroy();
  return lines;
}

export default class ParentChatPanel {
  constructor(scene, { onClose, onBackToContacts } = {}) {
    this.scene = scene;
    this.onClose = onClose;
    this.onBackToContacts = onBackToContacts;
    this.items = [];
    this.messageY = PARENT_CHAT_LAYOUT.messages.topY;
    this.inputAction = null;
    this.freeTextAction = null;
    this.freeTextActive = false;
    this.freeTextDisabled = false;
    this.parentAvatar = this._pickParentAvatar();
    this.currentChatAvatar = this.parentAvatar;
    this.scrollY = 0;
    this.maxScroll = 0;
    this.closeEnabled = true;
    this.satisfactionVisible = false;
    this.satisfactionValue = 50;
    this.contactHitZones = [];
    this.contactScrollDragging = false;
    this.contactScrollLastY = 0;
    this.contactScrollStartY = 0;
    this.contactScrollMoved = false;
    this.panelMode = 'contacts';

    this.container = scene.add.container(0, 0).setDepth(DEPTH);
    const blocker = scene.add
      .rectangle(scene.scale.width / 2, scene.scale.height / 2, scene.scale.width, scene.scale.height, 0x111827, 0.36)
      .setInteractive();
    const cfg = PARENT_CHAT_LAYOUT.panel;
    this.panelImage = scene.add.image(cfg.x, cfg.y, 'chat_panel').setDisplaySize(cfg.width, cfg.height);

    const closeCfg = PARENT_CHAT_LAYOUT.close;
    const close = scene.add.image(closeCfg.x, closeCfg.y, 'chat_close')
      .setDisplaySize(closeCfg.size, closeCfg.size)
      .setInteractive({ useHandCursor: true });
    close.on('pointerover', () => close.setDisplaySize(closeCfg.hoverSize, closeCfg.hoverSize));
    close.on('pointerout', () => close.setDisplaySize(closeCfg.size, closeCfg.size));
    close.on('pointerdown', () => {
      if (!this.closeEnabled) return;
      if (this.panelMode === 'chat' && this.onBackToContacts) {
        this.onBackToContacts();
        return;
      }
      this.destroy();
    });
    this.closeButton = close;

    this.messages = scene.add.container(0, 0);
    this._createMessageMask();
    this._createScrollbar();
    this.satisfactionGroup = scene.add.container(0, 0).setVisible(false);
    this.container.add([blocker, this.panelImage, this.satisfactionGroup, this.messages, close]);
    this._createInputControls();
  }

  destroy() {
    this.scene.input.off('wheel', this._onWheel, this);
    this.scene.input.off('pointermove', this._onPointerMove, this);
    this.scene.input.off('pointerup', this._onPointerUp, this);
    this.typingHandles?.forEach((handle) => handle?.remove?.());
    this.typingHandles = [];
    this.freeTextDom?.destroy();
    this.freeTextDom = null;
    this.container?.destroy();
    this.container = null;
    this.onClose?.();
  }

  clearMessages() {
    this.typingHandles?.forEach((handle) => handle?.remove?.());
    this.typingHandles = [];
    this.messages.removeAll(true);
    this.contactHitZones = [];
    this.contactScrollDragging = false;
    this.scrollY = 0;
    this.maxScroll = 0;
    this.messages.y = 0;
    this.messageY = PARENT_CHAT_LAYOUT.messages.topY;
    this._clearReplyOptions();
    this._drawScrollbar();
  }

  setParentSatisfaction(value, { label = '家长满意度' } = {}) {
    if (value === null || value === undefined) {
      this.satisfactionVisible = false;
      this.satisfactionGroup?.setVisible(false);
      return;
    }
    this.satisfactionVisible = true;
    this.satisfactionValue = Phaser.Math.Clamp(Math.round(Number(value) || 0), 0, 100);
    this.satisfactionLabel = label;
    this._drawSatisfaction();
  }

  setInputAction(action) {
    this.inputAction = action;
    if (action) this.disableFreeTextInput();
  }

  setInputPlaceholder(text = '点击查看可回复内容...') {
    this.inputPlaceholder?.setText(text);
  }

  setCloseEnabled(enabled) {
    this.closeEnabled = enabled;
    this.closeButton?.setAlpha(enabled ? 1 : 0.38);
    if (enabled) {
      this.closeButton?.setInteractive({ useHandCursor: true });
    } else {
      this.closeButton?.disableInteractive();
    }
  }

  showContacts(contacts) {
    this.setPanelMode('contacts');
    this.setParentSatisfaction(null);
    this.clearMessages();
    this.setCloseEnabled(true);
    this.setInputAction(null);
    this.setInputVisible(false);
    const cfg = PARENT_CHAT_LAYOUT.contacts;

    contacts.forEach((contact, index) => {
      const y = cfg.startY + index * cfg.gap;
      const card = this.scene.add.graphics();
      card.fillStyle(0xfff3d2, 0.94);
      card.fillRoundedRect(cfg.x - cfg.width / 2, y, cfg.width, cfg.height, 18);
      card.lineStyle(2, 0xc79552, 0.72);
      card.strokeRoundedRect(cfg.x - cfg.width / 2, y, cfg.width, cfg.height, 18);

      const avatar = this._drawParentAvatar(cfg.x - cfg.width / 2 + 52, y + cfg.height / 2, 52, contact.avatar);
      const name = this.scene.add.text(cfg.x - cfg.width / 2 + 98, y + 15, contact.name, {
        fontFamily: '"MaokenZhuyuan", "Microsoft YaHei", sans-serif',
        fontSize: '22px',
        color: '#4b3322',
      });
      const preview = this.scene.add.text(cfg.x - cfg.width / 2 + 98, y + 43, contact.preview, {
        fontFamily: '"MaokenZhuyuan", "Microsoft YaHei", sans-serif',
        fontSize: '17px',
        color: '#8a6a43',
      });
      const redDot = this.scene.add.circle(cfg.x + cfg.width / 2 - 34, y + 24, 8, 0xef4444, 1);
      const hit = this.scene.add.zone(cfg.x, y + cfg.height / 2, cfg.width, cfg.height)
        .setInteractive({ useHandCursor: true });
      let pressedOnThisContact = false;
      hit.on('pointerdown', (pointer) => {
        pressedOnThisContact = true;
        this.contactScrollDragging = true;
        this.contactScrollMoved = false;
        this.contactScrollStartY = pointer.y;
        this.contactScrollLastY = pointer.y;
      });
      hit.on('pointerover', () => {
        card.clear();
        card.fillStyle(0xffe8b7, 0.98);
        card.fillRoundedRect(cfg.x - cfg.width / 2, y, cfg.width, cfg.height, 18);
        card.lineStyle(2, 0xc79552, 0.85);
        card.strokeRoundedRect(cfg.x - cfg.width / 2, y, cfg.width, cfg.height, 18);
      });
      hit.on('pointerout', () => {
        pressedOnThisContact = false;
        card.clear();
        card.fillStyle(0xfff3d2, 0.94);
        card.fillRoundedRect(cfg.x - cfg.width / 2, y, cfg.width, cfg.height, 18);
        card.lineStyle(2, 0xc79552, 0.72);
        card.strokeRoundedRect(cfg.x - cfg.width / 2, y, cfg.width, cfg.height, 18);
      });
      hit.on('pointerup', () => {
        if (pressedOnThisContact && !this.contactScrollMoved) contact.action?.();
        pressedOnThisContact = false;
      });
      this.messages.add([card, avatar, name, preview, redDot, hit]);
      this.contactHitZones.push({ hit, localY: y + cfg.height / 2 });
    });

    if (contacts.length === 0) {
      this.addSystemMessage('暂无新的家长消息');
    } else {
      this.messageY = cfg.startY + (contacts.length - 1) * cfg.gap + cfg.height + cfg.gap;
      this._fitMessages();
    }
  }

  setPanelMode(mode) {
    this.panelMode = mode;
    const key = mode === 'contacts' ? 'chat_panel_empty' : 'chat_panel';
    this.panelImage?.setTexture(key);
    if (mode === 'contacts') this.setParentSatisfaction(null);
  }

  setChatAvatar(avatar) {
    this.currentChatAvatar = avatar ?? this._pickParentAvatar();
  }

  addParentMessage(text) {
    this.setPanelMode('chat');
    this.setInputVisible(true);
    this._addBubble({ side: 'left', text, color: 0xfff2c8, stroke: 0xc79552 });
  }

  addPlayerMessage(text) {
    this.setPanelMode('chat');
    this.setInputVisible(true);
    this._addBubble({ side: 'right', text, color: 0xcce8df, stroke: 0x71a89b });
  }

  addSystemMessage(text) {
    const y = this.messageY + 4;
    const label = this.scene.add.text(CONTENT_CENTER_X, y, text, {
      fontFamily: '"MaokenZhuyuan", "Microsoft YaHei", sans-serif',
      fontSize: '18px',
      color: '#7a5a34',
      align: 'center',
    }).setOrigin(0.5, 0);
    const w = Math.max(220, label.width + 46);
    const h = label.height + 18;
    const bg = this.scene.add.graphics();
    bg.fillStyle(0xffedbd, 0.92);
    bg.fillRoundedRect(CONTENT_CENTER_X - w / 2, y - 8, w, h, 16);
    bg.lineStyle(1, 0xc79552, 0.65);
    bg.strokeRoundedRect(CONTENT_CENTER_X - w / 2, y - 8, w, h, 16);
    this.messages.add([bg, label]);
    this.messageY += h + PARENT_CHAT_LAYOUT.messages.gap;
    this._fitMessages();
  }

  addParentTypingIndicator(baseText = '家长正在输入中') {
    this.setPanelMode('chat');
    this.setInputVisible(true);
    this._clearReplyOptions();
    this.typingHandles ??= [];

    const cfg = PARENT_CHAT_LAYOUT.messages;
    const textStyle = {
      fontFamily: '"MaokenZhuyuan", "Microsoft YaHei", sans-serif',
      fontSize: '20px',
      color: '#7a5a34',
      align: 'left',
      lineSpacing: 5,
    };
    const y = this.messageY;
    const bubbleW = 230;
    const bubbleH = 54;
    const bubbleX = cfg.leftBubbleX;
    const avatarCfg = PARENT_CHAT_LAYOUT.parentAvatar;
    const group = this.scene.add.container(0, 0);

    const avatar = this._drawParentAvatar(avatarCfg.x, y + 28, avatarCfg.size, this.currentChatAvatar);
    const bubble = this.scene.add.graphics();
    bubble.fillStyle(0xfff2c8, 0.9);
    bubble.fillRoundedRect(bubbleX, y, bubbleW, bubbleH, 18);
    bubble.lineStyle(2, 0xc79552, 0.55);
    bubble.strokeRoundedRect(bubbleX, y, bubbleW, bubbleH, 18);
    bubble.fillStyle(0xfff2c8, 0.9);
    bubble.fillTriangle(bubbleX, y + 26, bubbleX - 16, y + 34, bubbleX, y + 42);

    const label = this.scene.add.text(
      bubbleX + cfg.horizontalPadding,
      y + cfg.verticalPadding,
      `${baseText}...`,
      textStyle,
    ).setOrigin(0, 0);
    group.add([avatar, bubble, label]);
    this.messages.add(group);

    this.messageY += bubbleH + cfg.gap;
    this._fitMessages();

    let frame = 0;
    const timer = this.scene.time.addEvent({
      delay: 480,
      loop: true,
      callback: () => {
        frame = (frame + 1) % 4;
        label.setText(`${baseText}${'.'.repeat(frame || 1)}`);
      },
    });

    const handle = {
      remove: () => {
        timer.remove(false);
        group.destroy(true);
        this.typingHandles = (this.typingHandles ?? []).filter((item) => item !== handle);
      },
    };
    this.typingHandles.push(handle);
    return handle;
  }

  showReplyOptions(options) {
    this._clearReplyOptions();
    const cfg = PARENT_CHAT_LAYOUT.replyOptions;
    this.replyOptions = [];
    options.forEach((option, index) => {
      const y = cfg.startY + index * cfg.gap;
      const button = this._makeReplyButton(cfg.x, y, cfg.width, cfg.height, option.label, option.action);
      this.replyOptions.push(button);
      this.container.add(button);
    });
  }

  hideReplyOptions() {
    this._clearReplyOptions();
  }

  _createInputControls() {
    const cfg = PARENT_CHAT_LAYOUT.input;
    const inputHit = this.scene.add.zone(cfg.x, cfg.y, cfg.width, cfg.height)
      .setInteractive({ useHandCursor: true });
    const placeholder = this.scene.add.text(cfg.x - cfg.width / 2 + 38, cfg.y, '点击查看可回复内容...', {
      fontFamily: '"MaokenZhuyuan", "Microsoft YaHei", sans-serif',
      fontSize: '20px',
      color: '#9a7a56',
      align: 'left',
    }).setOrigin(0, 0.5);
    this.inputPlaceholder = placeholder;

    const sendCfg = PARENT_CHAT_LAYOUT.send;
    const send = this.scene.add.image(sendCfg.x, sendCfg.y, 'chat_send_button')
      .setDisplaySize(sendCfg.size, sendCfg.size)
      .setInteractive({ useHandCursor: true });
    send.on('pointerover', () => send.setDisplaySize(sendCfg.hoverSize, sendCfg.hoverSize));
    send.on('pointerout', () => send.setDisplaySize(sendCfg.size, sendCfg.size));

    const trigger = () => {
      if (this.freeTextActive) {
        this._submitFreeTextInput();
        return;
      }
      this.inputAction?.();
    };
    inputHit.on('pointerdown', trigger);
    send.on('pointerdown', trigger);
    this.inputHit = inputHit;
    this.sendButton = send;
    this.inputControls = [placeholder, inputHit, send];
    this.container.add(this.inputControls);
    this._createFreeTextInput();
  }

  setInputVisible(visible) {
    this.inputControls?.forEach((item) => {
      const shouldShow = visible && (!this.freeTextActive || item === this.sendButton);
      item.setVisible(shouldShow);
      if (shouldShow && item.setInteractive && item !== this.inputControls[0]) {
        item.setInteractive({ useHandCursor: true });
      } else if ((!shouldShow || !visible) && item.disableInteractive) {
        item.disableInteractive();
      }
    });
    if (this.freeTextDom) {
      this.freeTextDom.setVisible(Boolean(visible && this.freeTextActive));
      this._setFreeTextDomEnabled(visible && !this.freeTextDisabled);
    }
  }

  enableFreeTextInput({ placeholder = '\u8f93\u5165\u56de\u590d...', onSubmit } = {}) {
    this.freeTextAction = onSubmit;
    this.freeTextActive = true;
    this.freeTextDisabled = false;
    this.inputAction = null;
    this._clearReplyOptions();
    this.inputPlaceholder?.setVisible(false);
    this.inputHit?.disableInteractive();
    this.inputHit?.setVisible(false);
    this.freeTextDom?.setVisible(true);
    const textarea = this._getFreeTextNode();
    if (textarea) {
      textarea.value = '';
      textarea.placeholder = placeholder;
      textarea.disabled = false;
      textarea.focus();
    }
    this.sendButton?.setVisible(true);
    this.sendButton?.setInteractive({ useHandCursor: true });
  }

  setFreeTextInputEnabled(enabled, placeholder) {
    if (!this.freeTextActive) return;
    this.freeTextDisabled = !enabled;
    const textarea = this._getFreeTextNode();
    if (textarea) {
      textarea.disabled = !enabled;
      if (placeholder !== undefined) textarea.placeholder = placeholder;
    }
    this._setFreeTextDomEnabled(enabled);
    if (enabled) {
      this.sendButton?.setInteractive({ useHandCursor: true });
    } else {
      this.sendButton?.disableInteractive();
    }
  }

  disableFreeTextInput() {
    this.freeTextAction = null;
    this.freeTextActive = false;
    this.freeTextDisabled = false;
    const textarea = this._getFreeTextNode();
    if (textarea) {
      textarea.value = '';
      textarea.disabled = false;
    }
    this.freeTextDom?.setVisible(false);
    this.inputPlaceholder?.setVisible(true);
    this.inputHit?.setVisible(true);
    this.inputHit?.setInteractive({ useHandCursor: true });
    this.sendButton?.setInteractive({ useHandCursor: true });
  }

  _createFreeTextInput() {
    const cfg = PARENT_CHAT_LAYOUT.input;
    const textarea = document.createElement('textarea');
    textarea.className = 'parent-ai-free-text';
    textarea.placeholder = '\u8f93\u5165\u56de\u590d...';
    textarea.setAttribute('aria-label', '\u5bb6\u957f\u6c9f\u901a\u56de\u590d');
    Object.assign(textarea.style, {
      width: `${cfg.width - 96}px`,
      height: `${cfg.height - 18}px`,
      border: '0',
      outline: '0',
      resize: 'none',
      overflow: 'hidden',
      background: 'transparent',
      color: '#5b3419',
      fontFamily: '"MaokenZhuyuan", "Microsoft YaHei", sans-serif',
      fontSize: '20px',
      lineHeight: '24px',
      padding: '0',
    });
    textarea.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        this._submitFreeTextInput();
      }
    });
    textarea.addEventListener('pointerdown', (event) => event.stopPropagation());
    textarea.addEventListener('mousedown', (event) => event.stopPropagation());
    const dom = this.scene.add.dom(cfg.x - 8, cfg.y + 1, textarea).setOrigin(0.5);
    dom.setVisible(false);
    this.freeTextDom = dom;
    this.container.add(dom);
  }

  _getFreeTextNode() {
    return this.freeTextDom?.node ?? null;
  }

  _setFreeTextDomEnabled(enabled) {
    const textarea = this._getFreeTextNode();
    if (!textarea) return;
    textarea.style.opacity = enabled ? '1' : '0.58';
    textarea.style.pointerEvents = enabled ? 'auto' : 'none';
  }

  _submitFreeTextInput() {
    if (!this.freeTextActive || this.freeTextDisabled) return;
    const textarea = this._getFreeTextNode();
    const text = textarea?.value?.trim() ?? '';
    if (!text) return;
    this.freeTextAction?.(text);
  }

  _addBubble({ side, text, color, stroke }) {
    this._clearReplyOptions();
    const cfg = PARENT_CHAT_LAYOUT.messages;
    const textStyle = {
      fontFamily: '"MaokenZhuyuan", "Microsoft YaHei", sans-serif',
      fontSize: '20px',
      color: '#4b3322',
      align: 'left',
      lineSpacing: 5,
    };
    const lines = wrapText(this.scene, text, cfg.bubbleMaxWidth - cfg.horizontalPadding * 2, textStyle);
    const content = lines.join('\n');
    const label = this.scene.add.text(0, 0, content, textStyle).setOrigin(0, 0);
    const bubbleW = Math.max(cfg.bubbleMinWidth, Math.min(cfg.bubbleMaxWidth, label.width + cfg.horizontalPadding * 2));
    const bubbleH = label.height + cfg.verticalPadding * 2;
    const y = this.messageY;
    const bubbleX = side === 'left' ? cfg.leftBubbleX : cfg.rightBubbleRightX - bubbleW;
    const avatarCfg = side === 'left' ? PARENT_CHAT_LAYOUT.parentAvatar : PARENT_CHAT_LAYOUT.playerAvatar;

    const avatar = side === 'left'
      ? this._drawParentAvatar(avatarCfg.x, y + 28, avatarCfg.size, this.currentChatAvatar)
      : this.scene.add.image(avatarCfg.x, y + 30, 'chat_player_avatar').setDisplaySize(avatarCfg.size, avatarCfg.size);

    const bubble = this.scene.add.graphics();
    bubble.fillStyle(color, 0.96);
    bubble.fillRoundedRect(bubbleX, y, bubbleW, bubbleH, 18);
    bubble.lineStyle(2, stroke, 0.75);
    bubble.strokeRoundedRect(bubbleX, y, bubbleW, bubbleH, 18);
    bubble.fillStyle(color, 0.96);
    if (side === 'left') {
      bubble.fillTriangle(bubbleX, y + 26, bubbleX - 16, y + 34, bubbleX, y + 42);
    } else {
      bubble.fillTriangle(bubbleX + bubbleW, y + 26, bubbleX + bubbleW + 16, y + 34, bubbleX + bubbleW, y + 42);
    }

    label.setPosition(bubbleX + cfg.horizontalPadding, y + cfg.verticalPadding);
    this.messages.add([avatar, bubble, label]);
    this.messageY += bubbleH + cfg.gap;
    this._fitMessages();
  }

  _fitMessages() {
    this._updateScrollMetrics(true);
  }

  _createMessageMask() {
    const cfg = PARENT_CHAT_LAYOUT.messages;
    const shape = this.scene.add.graphics();
    shape.fillStyle(0xffffff, 1);
    shape.fillRect(cfg.maskX, cfg.maskY, cfg.maskWidth, cfg.maskHeight);
    shape.setVisible(false);
    this.container.add(shape);
    this.messages.setMask(shape.createGeometryMask());
  }

  _createScrollbar() {
    const cfg = PARENT_CHAT_LAYOUT.scrollbar;
    this.scrollBar = this.scene.add.graphics();
    this.scrollHit = this.scene.add.zone(cfg.x, cfg.y + cfg.height / 2, cfg.hitWidth, cfg.height)
      .setInteractive({ useHandCursor: true });
    this.thumbHit = this.scene.add.zone(cfg.x, cfg.y + cfg.thumbMinHeight / 2, cfg.hitWidth, cfg.thumbMinHeight)
      .setInteractive({ useHandCursor: true });

    this.scene.input.setDraggable(this.thumbHit);
    this.scrollHit.on('pointerdown', (pointer) => {
      if (this.maxScroll <= 0) return;
      const thumbH = this._getThumbHeight();
      const maxThumbTravel = Math.max(0, cfg.height - thumbH);
      const targetThumbY = Phaser.Math.Clamp(pointer.y - thumbH / 2, cfg.y, cfg.y + maxThumbTravel);
      this.scrollY = ((targetThumbY - cfg.y) / maxThumbTravel) * this.maxScroll;
      this._applyScroll();
    });
    this.thumbHit.on('drag', (pointer, _dragX, dragY) => {
      if (this.maxScroll <= 0) return;
      const thumbH = this._getThumbHeight();
      const maxThumbTravel = Math.max(0, cfg.height - thumbH);
      const pointerY = typeof pointer?.y === 'number' ? pointer.y : dragY;
      const targetThumbY = Phaser.Math.Clamp(pointerY - thumbH / 2, cfg.y, cfg.y + maxThumbTravel);
      this.scrollY = ((targetThumbY - cfg.y) / maxThumbTravel) * this.maxScroll;
      this._applyScroll();
    });

    this._onWheel = (_pointer, _gameObjects, _deltaX, deltaY) => {
      if (!this.container || this.maxScroll <= 0) return;
      this.scrollY += deltaY * 0.6;
      this._applyScroll();
    };
    this.scene.input.on('wheel', this._onWheel, this);
    this._onPointerMove = (pointer) => {
      if (!this.contactScrollDragging || this.maxScroll <= 0) return;
      const dy = pointer.y - this.contactScrollLastY;
      if (Math.abs(pointer.y - this.contactScrollStartY) > 8) this.contactScrollMoved = true;
      this.contactScrollLastY = pointer.y;
      this.scrollY -= dy;
      this._applyScroll();
    };
    this._onPointerUp = () => {
      this.contactScrollDragging = false;
    };
    this.scene.input.on('pointermove', this._onPointerMove, this);
    this.scene.input.on('pointerup', this._onPointerUp, this);

    this.container.add([this.scrollBar, this.scrollHit, this.thumbHit]);
    this._drawScrollbar();
  }

  _updateScrollMetrics(scrollToBottom = false) {
    const cfg = PARENT_CHAT_LAYOUT.messages;
    this.maxScroll = Math.max(0, this.messageY - cfg.bottomY);
    if (scrollToBottom) {
      this.scrollY = this.maxScroll;
    }
    this._applyScroll();
  }

  _applyScroll() {
    this.scrollY = Phaser.Math.Clamp(this.scrollY, 0, this.maxScroll);
    this.messages.y = -this.scrollY;
    this._drawScrollbar();
    this._syncContactHitZones();
  }

  _syncContactHitZones() {
    if (!this.contactHitZones?.length) return;
    const maskTop = PARENT_CHAT_LAYOUT.messages.maskY;
    const maskBottom = maskTop + PARENT_CHAT_LAYOUT.messages.maskHeight;
    this.contactHitZones.forEach(({ hit, localY }) => {
      if (!hit?.active) return;
      const worldY = localY - this.scrollY;
      const canClick = worldY >= maskTop + 10 && worldY <= maskBottom - 10;
      if (canClick && !hit.input?.enabled) {
        hit.setInteractive({ useHandCursor: true });
      } else if (!canClick && hit.input?.enabled) {
        hit.disableInteractive();
      }
    });
  }

  _getThumbHeight() {
    const cfg = PARENT_CHAT_LAYOUT.scrollbar;
    if (this.maxScroll <= 0) return cfg.height;
    return Phaser.Math.Clamp((cfg.height / (cfg.height + this.maxScroll)) * cfg.height, cfg.thumbMinHeight, cfg.height);
  }

  _drawScrollbar() {
    if (!this.scrollBar) return;
    const cfg = PARENT_CHAT_LAYOUT.scrollbar;
    const thumbH = this._getThumbHeight();
    const maxThumbTravel = Math.max(0, cfg.height - thumbH);
    const ratio = this.maxScroll > 0 ? this.scrollY / this.maxScroll : 0;
    const thumbY = cfg.y + ratio * maxThumbTravel;

    this.scrollBar.clear();
    this.scrollBar.fillStyle(0xb8894a, 0.10);
    this.scrollBar.fillRoundedRect(cfg.x - cfg.width / 2 + 1, cfg.y + 1, cfg.width, cfg.height, cfg.width / 2);
    this.scrollBar.fillStyle(0xf9e1b6, this.maxScroll > 0 ? 0.58 : 0.24);
    this.scrollBar.fillRoundedRect(cfg.x - cfg.width / 2, cfg.y, cfg.width, cfg.height, cfg.width / 2);
    this.scrollBar.lineStyle(1, 0xd9a15f, 0.34);
    this.scrollBar.strokeRoundedRect(cfg.x - cfg.width / 2, cfg.y, cfg.width, cfg.height, cfg.width / 2);

    this.scrollBar.fillStyle(0xb8894a, 0.14);
    this.scrollBar.fillRoundedRect(cfg.x - cfg.width / 2 + 1, thumbY + 2, cfg.width, thumbH, cfg.width / 2);
    this.scrollBar.fillStyle(0xf0bd74, this.maxScroll > 0 ? 0.82 : 0.38);
    this.scrollBar.fillRoundedRect(cfg.x - cfg.width / 2, thumbY, cfg.width, thumbH, cfg.width / 2);
    this.scrollBar.lineStyle(1, 0xc88a4a, 0.34);
    this.scrollBar.strokeRoundedRect(cfg.x - cfg.width / 2, thumbY, cfg.width, thumbH, cfg.width / 2);

    this.thumbHit.setPosition(cfg.x, thumbY + thumbH / 2);
    this.thumbHit.setSize(cfg.hitWidth, thumbH);
    this.thumbHit.input.hitArea.setTo(0, 0, cfg.hitWidth, thumbH);
  }

  _drawSatisfaction() {
    if (!this.satisfactionGroup) return;
    const cfg = PARENT_CHAT_LAYOUT.trust;
    const value = Phaser.Math.Clamp(this.satisfactionValue, 0, 100);
    const fillRatio = value / 100;
    const label = this.satisfactionLabel ?? '家长当前满意度';
    const color = value >= 80 ? 0x67a96b : value >= 50 ? 0xd99b43 : 0xd05b4d;

    this.satisfactionGroup.removeAll(true);

    const title = this.scene.add.text(cfg.x - cfg.width / 2, cfg.y - 10, label, {
      fontFamily: '"MaokenZhuyuan", "Microsoft YaHei", sans-serif',
      fontSize: '18px',
      color: '#6b4a2a',
      stroke: '#fff3d2',
      strokeThickness: 4,
    }).setOrigin(0, 0.5);
    const number = this.scene.add.text(cfg.x + cfg.width / 2, cfg.y - 10, `${value}`, {
      fontFamily: '"MaokenZhuyuan", "Microsoft YaHei", sans-serif',
      fontSize: '18px',
      color: '#4b3322',
      align: 'right',
      stroke: '#fff3d2',
      strokeThickness: 4,
    }).setOrigin(1, 0.5);

    const barW = cfg.barWidth ?? cfg.width;
    const barX = cfg.x - cfg.width / 2;
    const barY = cfg.y + 12;
    const barH = 12;
    const bar = this.scene.add.graphics();
    bar.fillStyle(0xe5c998, 0.7);
    bar.fillRoundedRect(barX, barY, barW, barH, 6);
    bar.fillStyle(color, 0.95);
    bar.fillRoundedRect(barX, barY, Math.max(6, barW * fillRatio), barH, 6);
    bar.lineStyle(1, 0xb7834d, 0.35);
    bar.strokeRoundedRect(barX, barY, barW, barH, 6);

    this.satisfactionGroup.add([title, number, bar]);
    this.satisfactionGroup.setVisible(this.satisfactionVisible);
  }

  _pickParentAvatar() {
    const color = Phaser.Utils.Array.GetRandom(PARENT_AVATAR_COLORS);
    const type = Phaser.Utils.Array.GetRandom(PARENT_AVATAR_TYPES);
    return { color, type };
  }

  _makeReplyButton(x, y, w, h, label, action) {
    const group = this.scene.add.container(0, 0);
    const bg = this.scene.add.rectangle(x, y, w, h, 0xfff3d2, 0.98)
      .setStrokeStyle(2, 0xb7834d, 0.9)
      .setInteractive({ useHandCursor: true });
    const text = this.scene.add.text(x, y, label, {
      fontFamily: '"MaokenZhuyuan", "Microsoft YaHei", sans-serif',
      fontSize: '17px',
      color: '#5b3419',
      align: 'center',
      wordWrap: { width: w - 34 },
    }).setOrigin(0.5);
    bg.on('pointerover', () => bg.setFillStyle(0xffe7aa, 1));
    bg.on('pointerout', () => bg.setFillStyle(0xfff3d2, 0.98));
    bg.on('pointerdown', () => action?.());
    group.add([bg, text]);
    return group;
  }

  _clearReplyOptions() {
    this.replyOptions?.forEach((item) => item.destroy());
    this.replyOptions = [];
  }

  _drawParentAvatar(x, y, size, avatarConfig = this.parentAvatar) {
    const g = this.scene.add.graphics();
    const r = size / 2;
    g.fillStyle(avatarConfig.color, 1);
    g.fillCircle(x, y, r);
    g.lineStyle(3, 0x6f8f54, 0.85);
    g.strokeCircle(x, y, r);
    g.lineStyle(3, 0x6f8f54, 1);
    g.fillStyle(0xffffff, 0.75);

    if (avatarConfig.type === 'flower') {
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI * 2 * i) / 6;
        g.fillCircle(x + Math.cos(a) * 12, y + Math.sin(a) * 12, 8);
      }
      g.fillStyle(0xf2b84b, 1);
      g.fillCircle(x, y, 7);
    } else if (avatarConfig.type === 'person') {
      g.fillStyle(0x7a5635, 1);
      g.fillCircle(x, y - 8, 11);
      g.fillRoundedRect(x - 18, y + 8, 36, 22, 12);
    } else if (avatarConfig.type === 'leaf') {
      g.fillStyle(0x6f9c65, 1);
      g.fillEllipse(x - 8, y, 20, 34);
      g.fillEllipse(x + 10, y - 2, 18, 30);
    } else if (avatarConfig.type === 'heart') {
      g.fillStyle(0xd9786b, 1);
      g.fillCircle(x - 8, y - 4, 9);
      g.fillCircle(x + 8, y - 4, 9);
      g.fillTriangle(x - 17, y, x + 17, y, x, y + 22);
    } else if (avatarConfig.type === 'star') {
      g.fillStyle(0xf6c84c, 1);
      const points = [];
      for (let i = 0; i < 10; i++) {
        const angle = -Math.PI / 2 + i * Math.PI / 5;
        const radius = i % 2 === 0 ? 21 : 9;
        points.push(new Phaser.Math.Vector2(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius));
      }
      g.fillPoints(points, true);
    } else {
      g.fillStyle(0x8b6b3f, 1);
      g.fillTriangle(x - 20, y - 2, x, y - 22, x + 20, y - 2);
      g.fillRoundedRect(x - 16, y - 2, 32, 24, 5);
    }
    return g;
  }
}
