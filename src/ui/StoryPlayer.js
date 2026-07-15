/**
 * Plays lightweight story steps while keeping the actual text in data/*.js.
 * Supported steps:
 * - { type: 'dialog', lines: [...] }
 * - { type: 'scene', sceneKey: 'OfficeScene', data?: {...} }
 *
 * The scene-switch step is intentionally simple: it ends the current sequence
 * and starts another Scene. The target Scene decides whether to continue with
 * its own intro / hub state based on GameState flags.
 */
import { collectItem } from '../data/collections.js';

export default class StoryPlayer {
  constructor(scene, dialogBox) {
    this.scene = scene;
    this.dialog = dialogBox;
  }

  _setPlaybackActive(active) {
    if (!this.scene) return;
    this.scene._storyPlaybackActive = Boolean(active);
  }

  _createSkipButton(onSkip) {
    const viewW = this.scene.scale.width;
    const viewH = this.scene.scale.height;

    // 放在底部文本框右上方附近，避免挤到顶部 HUD。
    const x = viewW / 2 + 344;
    const y = viewH - 196;

    const bg = this.scene.add
      .rectangle(x, y, 96, 34, 0xfff0cb, 0.96)
      .setDepth(120)
      .setStrokeStyle(2, 0xa46b36, 0.95)
      .setInteractive({ useHandCursor: true });

    const label = this.scene.add.text(x, y, '跳过', {
      fontFamily: '"MaokenZhuyuan", "Microsoft YaHei", "PingFang SC", sans-serif',
      fontSize: '16px',
      color: '#5b3419',
    }).setOrigin(0.5).setDepth(121);

    bg.on('pointerover', () => bg.setFillStyle(0xffe4a6, 0.98));
    bg.on('pointerout', () => bg.setFillStyle(0xfff0cb, 0.96));
    bg.on('pointerdown', onSkip);

    return [bg, label];
  }

  _forceCloseDialogNow() {
    if (typeof this.dialog?.forceClose === 'function') {
      this.dialog.forceClose({ silent: true });
      return;
    }

    const overlays = this.scene.children.list.filter((obj) => {
      if (!obj || !obj.active) return false;
      const depth = typeof obj.depth === 'number' ? obj.depth : -1;
      return depth >= 90 && depth <= 98;
    });

    overlays.forEach((obj) => obj.destroy());
    if (this.dialog) this.dialog.open = false;
  }

  _estimateDialogPages(lines, opts = {}) {
    const cleanLines = Array.isArray(lines) ? lines : [String(lines ?? '')];
    const maxCharsPerLine = opts.maxCharsPerLine ?? 30;
    const maxLinesPerPage = opts.maxLinesPerPage ?? 2;

    let visualLineCount = 0;
    cleanLines.forEach((line) => {
      const text = String(line ?? '');
      if (text.length === 0) {
        visualLineCount += 1;
        return;
      }
      visualLineCount += Math.ceil(text.length / Math.max(maxCharsPerLine, 1));
    });

    return Math.max(1, Math.ceil(visualLineCount / Math.max(maxLinesPerPage, 1)));
  }

  _shouldAutoEnableSkip(steps) {
    const normalized = Array.isArray(steps) ? steps : [];
    const totalPages = normalized.reduce((sum, step) => {
      if (!step || step.type !== 'dialog') return sum;
      return sum + this._estimateDialogPages(step.lines, step.opts ?? {});
    }, 0);

    return totalPages > 4;
  }

  _resolveLine(line) {
    return String(line ?? '').replace(/\{player\.name\}/g, '你');
  }

  _extractBgKey(line) {
    if (!this.scene.storyBg?.isBgMarker?.(line)) return null;
    return String(line).trim().replace(/^__BG:/, '').replace(/__$/, '');
  }

  _extractCollectId(line) {
    const text = String(line ?? '').trim();
    const match = text.match(/^__COLLECT:([a-zA-Z0-9_]+)__$/);
    return match ? match[1] : null;
  }

  _splitDialogSegments(lines) {
    const rawLines = Array.isArray(lines) ? lines : [lines];
    const segments = [];
    let pendingBgKey = null;
    let pendingPortraitCmds = [];

    rawLines.forEach((line) => {
      const bgKey = this._extractBgKey(line);
      if (bgKey) {
        pendingBgKey = bgKey;
        return;
      }

      if (this.scene.storyPortrait?.isPortraitMarker?.(line)) {
        pendingPortraitCmds.push(String(line).trim());
        return;
      }

      const collectId = this._extractCollectId(line);
      if (collectId) {
        segments.push({
          bgKey: pendingBgKey,
          portraitCmds: [...pendingPortraitCmds],
          collectId,
          lines: [],
        });
        pendingBgKey = null;
        pendingPortraitCmds = [];
        return;
      }

      const resolved = this._resolveLine(line);
      const portraitCmds = [...pendingPortraitCmds];
      const autoCmd = pendingPortraitCmds.length > 0
        ? null
        : this.scene.storyPortrait?.getAutoCommandForLine?.(resolved);
      if (autoCmd) {
        portraitCmds.push(autoCmd);
      }

      segments.push({
        bgKey: pendingBgKey,
        portraitCmds,
        lines: [resolved],
      });

      pendingBgKey = null;
      pendingPortraitCmds = [];
    });

    if (pendingBgKey !== null || pendingPortraitCmds.length > 0) {
      segments.push({
        bgKey: pendingBgKey,
        portraitCmds: pendingPortraitCmds,
        lines: [],
      });
    }

    return segments;
  }

  _applyStoryVisuals(segment) {
    if (segment?.bgKey) {
      this.scene.storyBg?.setBackground?.(segment.bgKey, true);
    }

    if (segment?.portraitCmds?.length) {
      this.scene.storyPortrait?.applyCommands?.(segment.portraitCmds);
    }

    if (segment?.collectId) {
      collectItem(this.scene.gs, segment.collectId);
    }
  }

  _playDialogSegments(segments, index, onDone, onSkip, opts = {}) {
    if (index >= segments.length) {
      onDone?.();
      return;
    }

    const segment = segments[index];
    this._applyStoryVisuals(segment);

    if (!segment.lines || segment.lines.length === 0) {
      this._playDialogSegments(segments, index + 1, onDone, onSkip, opts);
      return;
    }

    this.dialog.show(segment.lines, () => {
      this._playDialogSegments(segments, index + 1, onDone, onSkip, opts);
    }, {
      ...opts,
      onSkip,
    });
  }

  play(steps, onDone, options = {}) {
    const normalized = Array.isArray(steps) ? steps : [];
    this._setPlaybackActive(true);

    let finished = false;
    const skipElems = [];

    const clearSkip = () => {
      skipElems.forEach((obj) => {
        if (obj && obj.active) obj.destroy();
      });
    };

    const finish = () => {
      if (finished) return;
      finished = true;
      this._setPlaybackActive(false);
      clearSkip();

  // 剧情结束时统一清除立绘，避免残留到办公室/地图/操作界面
      this.scene.storyPortrait?.clearAll?.(true);

      if (onDone) onDone();
    };

    const run = (index) => {
      if (finished) return;

      if (index >= normalized.length) {
        finish();
        return;
      }

      const step = normalized[index];
      if (!step) {
        run(index + 1);
        return;
      }

      if (step.type === 'scene') {
        clearSkip();
        this._setPlaybackActive(false);
        this.scene.storyPortrait?.clearAll?.(false);
        this.scene.scene.start(step.sceneKey, step.data ?? { gs: this.scene.gs });
        return;
      }

      if (step.type === 'action') {
        step.run?.();
        run(index + 1);
        return;
      }

      if (step.type === 'dialog') {
        const lines = step.lines ?? ['[剧情占位 - 待写]'];
        const skipToNextBoundary = () => {
          let nextIndex = index + 1;
          while (
            nextIndex < normalized.length &&
            (normalized[nextIndex]?.type === 'dialog' || normalized[nextIndex]?.type === 'action')
          ) {
            if (normalized[nextIndex]?.type === 'action') {
              normalized[nextIndex].run?.();
            }
            nextIndex += 1;
          }
          run(nextIndex);
        };

        const stepOpts = step.opts ?? {};
        const effectiveOnSkip = typeof stepOpts.onSkip === 'function'
          ? stepOpts.onSkip
          : skipToNextBoundary;
        const segments = this._splitDialogSegments(lines);
        this._playDialogSegments(segments, 0, () => run(index + 1), effectiveOnSkip, stepOpts);
        return;
      }

      this.dialog.show(step.lines ?? ['[Unknown story step]'], () => run(index + 1), {
        ...(step.opts ?? {}),
        onSkip: () => run(index + 1),
      });
    };

    run(0);
  }
}
