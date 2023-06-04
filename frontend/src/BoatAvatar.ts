import { ANIMATIONS, Sprite } from './Sprite.js'
import { CANVAS_MARGIN_HORIZONTAL, RaceField } from './RaceField.js'

export interface BoatAvatar {
  name: string;
  display_name: string;
  raceField: RaceField;
  x: number;
  y: number;
  color: string;
  sprite: Sprite;
  speed: number;
  isFinished: boolean;
}

export class BoatAvatar {
  constructor(raceField: RaceField, config: any) {
    this.name = config.name ?? 'NoName'
    this.display_name = config.display_name ?? 'NoName'
    this.raceField = raceField
    this.x = config.x || 25
    this.y = config.y || 0
    this.color = config.color || 'purple'
    this.speed = config.speed || 0
    this.sprite = new Sprite({
      gameObject: this,
      src: config.src,
      mask: config.mask,
      color: this.color,
      displaySize: config.displaySize || 75,
      animations: config.animations || {
        idle: ANIMATIONS.idle,
      },
    })
    this.isFinished = false
  }

  update() {
    if (this.isFinished) return
    this.x += this.speed
    if(this.x >= (this.raceField.distance + CANVAS_MARGIN_HORIZONTAL)) {
      this.isFinished = true
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    this.sprite.draw(ctx)
    ctx.fillStyle = this.color
    ctx.fillText(
      this.display_name,
      this.x + this.sprite.displaySize / 4,
      this.y + this.sprite.displaySize + 10,
      this.sprite.displaySize
    )
  }
  
  // showIcon(x: number) {
  //   const iconSize = 50
  //   const iconSprite = {
  //     src: heartParticles,
  //     cutSize: 100,
  //     displaySize: iconSize,
  //   }
  //   this.world.renderedBubbles.push(
  //     createAdvancedBubble({
  //       type: 'icon',
  //       x: x + ((this.sprite.displaySize / 2) - (iconSprite.displaySize / 2)),
  //       y: this.y - 20,
  //       spriteInfo: iconSprite,
  //     }),
  //   )
  // }
}