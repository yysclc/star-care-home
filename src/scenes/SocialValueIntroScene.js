import Phaser from 'phaser';
import { GAME_H, GAME_W } from '../core/Constants.js';
import { normalizeState } from '../core/GameState.js';
import { makeLabel, makeStartButton } from '../ui/widgets.js';

export default class SocialValueIntroScene extends Phaser.Scene {
  constructor() {
    super('SocialValueIntroScene');
  }

  init(data) {
    this.gs = normalizeState(data?.gs);
  }

  create() {
    this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x020816, 1);
    this.createSkyEffects();

    const pages = [
      [
        '这是一个关于理解、照护与靠近的游戏。',
        '你将扮演一名新来到照护所的老师，在日常选择中认识自闭症谱系障碍儿童不同的感知、沟通与表达方式。',
      ],
      [
        '这里没有一种“正确的人生模板”，只有一次次更具体的看见。',
        '你也可以随时回到标题界面，查看“ASD资料馆”，了解更多背景知识与参考资料。',
        '准备好后，进入这段旅程。',
      ],
    ];

    const content = makeLabel(this, GAME_W / 2, 270, '', {
      fontSize: '25px',
      color: '#fff3d2',
      align: 'center',
      lineSpacing: 14,
      wordWrap: { width: 980, useAdvancedWrap: true },
    }).setOrigin(0.5).setAlpha(0).setDepth(10);
    content.setShadow(0, 2, '#2a1604', 5, true, true);

    let isLeaving = false;
    const nextBtn = makeStartButton(this, GAME_W / 2, 558, 255, 58, '继续', () => {
      if (isLeaving) return;
      isLeaving = true;
      this.cameras.main.fadeOut(420, 0, 0, 0);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.scene.start('PrologueScene', { gs: this.gs });
      });
    }, { primary: true, fontSize: '25px' }).setAlpha(0).setDepth(20);

    const showPage = (index) => {
      content.setText(pages[index].join('\n\n'));
      content.setAlpha(0);
      this.tweens.add({
        targets: content,
        alpha: 1,
        duration: 1200,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          if (index < pages.length - 1) {
            this.time.delayedCall(2200, () => {
              this.tweens.add({
                targets: content,
                alpha: 0,
                duration: 520,
                ease: 'Sine.easeInOut',
                onComplete: () => showPage(index + 1),
              });
            });
            return;
          }

          if (index === pages.length - 1) {
            this.tweens.add({
              targets: nextBtn,
              alpha: 1,
              duration: 600,
              ease: 'Sine.easeInOut',
            });
          }
        },
      });
    };

    showPage(0);
  }

  createSkyEffects() {
    const W = GAME_W;
    const H = GAME_H;
    const sky = this.add.container(0, 0).setDepth(1);

    const starPalette = [0xf8f0d8, 0xd8e6ff, 0xffffff];
    for (let i = 0; i < 92; i += 1) {
      const x = Phaser.Math.Between(30, W - 30);
      const y = Phaser.Math.Between(18, H - 18);
      const radius = Phaser.Math.FloatBetween(1.1, 2.5);
      const alpha = Phaser.Math.FloatBetween(0.25, 0.68);
      const star = this.add.circle(x, y, radius, starPalette[i % starPalette.length], alpha);
      sky.add(star);
      this.tweens.add({
        targets: star,
        alpha: alpha * Phaser.Math.FloatBetween(0.35, 0.62),
        duration: Phaser.Math.Between(1800, 3600),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: Phaser.Math.Between(0, 2200),
      });
    }

    const dust = this.add.graphics();
    dust.fillStyle(0x29486f, 0.10);
    for (let i = 0; i < 34; i += 1) {
      dust.fillCircle(
        Phaser.Math.Between(0, W),
        Phaser.Math.Between(0, H),
        Phaser.Math.FloatBetween(1, 2.4)
      );
    }
    sky.add(dust);

    const planet = this.add.container(118, H - 74).setAlpha(0.58);
    const halo = this.add.circle(0, 0, 76, 0x5f83b8, 0.08);
    const body = this.add.circle(0, 0, 48, 0x24476f, 0.72);
    const shade = this.add.circle(15, -8, 45, 0x0a1226, 0.26);
    const ring = this.add.ellipse(0, 3, 132, 30, 0xb7c7da, 0.18)
      .setStrokeStyle(2, 0xd8e6ff, 0.16);
    const bandA = this.add.ellipse(-6, -10, 82, 12, 0xd7b777, 0.13);
    const bandB = this.add.ellipse(5, 14, 74, 10, 0x9bbdd8, 0.12);
    planet.add([halo, ring, body, bandA, bandB, shade]);
    sky.add(planet);

    this.tweens.add({
      targets: planet,
      angle: 360,
      duration: 42000,
      repeat: -1,
      ease: 'Linear',
    });
    this.tweens.add({
      targets: planet,
      y: planet.y - 5,
      duration: 5200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const spawnMeteor = () => {
      if (!this.scene.isActive()) return;
      const meteor = this.add.graphics().setDepth(2).setAlpha(0);
      const startX = Phaser.Math.Between(Math.round(W * 0.58), W + 90);
      const startY = Phaser.Math.Between(28, Math.round(H * 0.36));
      const length = Phaser.Math.Between(90, 150);
      meteor.lineStyle(2, 0xf4e4b6, 0.62);
      meteor.beginPath();
      meteor.moveTo(0, 0);
      meteor.lineTo(length, -length * 0.36);
      meteor.strokePath();
      meteor.fillStyle(0xffffff, 0.72);
      meteor.fillCircle(-2, 1, 2.3);
      meteor.setPosition(startX, startY);
      sky.add(meteor);

      this.tweens.add({
        targets: meteor,
        x: startX - Phaser.Math.Between(280, 420),
        y: startY + Phaser.Math.Between(94, 148),
        alpha: { from: 0, to: 0.72 },
        duration: 980,
        ease: 'Sine.easeOut',
        onComplete: () => {
          this.tweens.add({
            targets: meteor,
            alpha: 0,
            duration: 280,
            onComplete: () => meteor.destroy(),
          });
        },
      });
    };

    const spawnMeteorCluster = () => {
      const count = Phaser.Math.Between(2, 4);
      for (let i = 0; i < count; i += 1) {
        this.time.delayedCall(i * Phaser.Math.Between(260, 520), spawnMeteor);
      }
    };

    spawnMeteorCluster();
    this.time.addEvent({
      delay: 3200,
      loop: true,
      callback: spawnMeteorCluster,
    });
  }
}
