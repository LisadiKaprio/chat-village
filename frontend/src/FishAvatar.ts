import { Avatar, FISH_AVATAR_DISPLAY_SIZE } from './Avatar'
import { World } from './World'
import { ANIMATIONS, Sprite } from './Sprite'

import fishpole from './images/fish-world/fishpole.png'
import { FishAvatarStatus } from '../../common/src/Types'
const FISHPOLE_X_OFFSET = -FISH_AVATAR_DISPLAY_SIZE / 2
const FISHPOLE_Y_OFFSET = FISH_AVATAR_DISPLAY_SIZE / 10

const SINE_A = 0.02
const SINE_B = 9

export interface FishAvatar extends Avatar {
  fishWaitTime: number;
  fishStatus: FishAvatarStatus;
  fishpoleSprite: Sprite;
  fishStartDate: number;
  fishCatchDate: number;
}

export class FishAvatar extends Avatar {
  constructor(world: World, config: any) {
    super(world, config)
    this.fishWaitTime = config.fishWaitTime
    this.fishStartDate = Date.now()
    this.fishCatchDate = this.fishStartDate + this.fishWaitTime
    this.fishWaitTime = config.fishWaitTime
    this.fishStatus = FishAvatarStatus.FISHING
    this.fishpoleSprite = new Sprite({
      gameObject: this,
      src: fishpole,
      cutSize: FISH_AVATAR_DISPLAY_SIZE,
      displaySize: FISH_AVATAR_DISPLAY_SIZE,
      animations: {
        idle: ANIMATIONS.idle,
      },
    })
    this.initialPositionY = this.y
  }

  update() {
    if (this.fishStatus !== FishAvatarStatus.WAITING_FOR_CATCH && Date.now() >= this.fishCatchDate) {
      this.fishStatus = FishAvatarStatus.CATCHING
    }
    super.update()
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.fishStatus === FishAvatarStatus.CATCHING || this.fishStatus === FishAvatarStatus.WAITING_FOR_CATCH) {
      this.progressBounce(SINE_A, SINE_B)
    } else if (this.fishStatus === FishAvatarStatus.SUCCESS) {
      this.y = this.initialPositionY
    }
    this.fishpoleSprite.draw(ctx, FISHPOLE_X_OFFSET, FISHPOLE_Y_OFFSET)
    super.draw(ctx)
  }
}