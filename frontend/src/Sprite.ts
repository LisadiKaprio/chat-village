export { Sprite, Animation, ANIMATIONS }
//https://www.youtube.com/watch?v=bpbghr3NnUU

import { ImageUtil } from './ImageUtil'

class Animation {
  constructor(config: { frames?: Frame[]; doesLoop?: boolean }) {
    this.frames = config.frames ?? []
    this.doesLoop = config.doesLoop ?? true
  }
}

class Sprite {
  constructor(config: SpriteConfig) {
    // TODO
    // this happens when the ImageUtil finishes loading:
    const loaded = (drawable: any) => {
      this.drawable = drawable
    }

    const util = new ImageUtil()
    if (config.mask && config.color) {
      util.asMaskedDrawable(config.src, config.mask, config.color).then(loaded)
    } else {
      util.asDrawable(config.src).then(loaded)
    }

    this.cutSize = config.cutSize || 200
    this.displaySize = config.displaySize || 150

    // configure animation and initial state
    this.animations = config.animations || {
      //"idle": [ [0,0], [1,0] ]
      idle: new Animation({
        frames: [[1, 1]],
        doesLoop: true,
      }),
    }
    this.currentAnimation = config.currentAnimation || 'idle'
    this.currentAnimationFrame = 0
    // framerate of the animation
    this.animationFrameLimit = config.animationFrameLimit || 25
    this.animationFrameProgress = this.animationFrameLimit

    this.mirrored = false
    // reference the game object
    this.gameObject = config.gameObject
  }

  // TODO: fix animations.
  setAnimation(animation: string) {
    this.currentAnimation = animation
    this.currentAnimationFrame = 0
  }

  // get current animation frame
  get frame() {
    return this.animations[this.currentAnimation].frames[
      this.currentAnimationFrame
    ]
  }

  updateAnimationProgress() {
    // Downtick frame progress
    if (this.animationFrameProgress > 0) {
      this.animationFrameProgress -= 1
      return
    }

    // Reset the counter
    this.animationFrameProgress = this.animationFrameLimit

    this.currentAnimationFrame += 1

    if (this.frame == undefined) {
      if (this.animations[this.currentAnimation].doesLoop) {
        this.currentAnimationFrame = 0
      } else {
        if (this.gameObject) {
          this.gameObject.endAnimation()
        }
        this.currentAnimationFrame = 0
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, xOffset?: number, yOffset?: number) {
    // position control (add nudge if needed)
    xOffset = xOffset ?? 0
    yOffset = yOffset ?? 0
    let x
    let y
    if (this.gameObject) {
      x = this.gameObject.x + xOffset
      y = this.gameObject.y + yOffset
    } else {
      x = xOffset
      y = yOffset
    }

    // if (!this.frame) 
    const [frameX, frameY] = this.frame

    // if(this.drawable){
    //    image = this.drawable.image();
    // } else{
    //     image = null
    // }
    const image = this.drawable ? this.drawable.image() : null
    // if there is something avaiable to be drawn
    if (image) {
      const oldTransform = ctx.getTransform()
      if (this.mirrored) {
        ctx.translate(x + this.displaySize, y)
        ctx.scale(-1, 1)
      } else {
        ctx.translate(x, y)
      }

      ctx.drawImage(
        image,
        // left cut, right cut,
        (frameX - 1) * this.cutSize,
        (frameY - 1) * this.cutSize,
        // size of the cut on x and y
        this.cutSize,
        this.cutSize,
        // position comes in here
        0,
        0,
        // display size
        this.displaySize,
        this.displaySize,
      )
      ctx.setTransform(oldTransform)
    }
    this.updateAnimationProgress()
  }
}

const ANIMATIONS = {
  static: new Animation({
    frames: [
      [1, 1],
    ],
    doesLoop: false,
  }),
  idle: new Animation({
    frames: [
      [1, 1],
      [2, 1],
    ],
    doesLoop: true,
  }),
  walk: new Animation({
    frames: [
      [3, 1],
      [4, 1],
    ],
  }),
  talk: new Animation({
    frames: [
      [1, 2],
      [2, 2],
      [3, 2],
      [2, 2],
      [3, 2],
      [2, 2],
      [3, 2],
      [1, 2],
    ],
    doesLoop: false,
  }),
  hug: new Animation({
    frames: [
      [1, 3],
      [2, 3],
    ],
    doesLoop: true,
  }),
  bonk: new Animation({
    frames: [
      [1, 4],
      [2, 4],
      [3, 4],
      [4, 4],
      [4, 4],
    ],
    doesLoop: false,
  }),
  bonked: new Animation({
    frames: [
      [1, 4],
      [1, 4],
      [1, 5],
      [2, 5],
      [3, 5],
      [4, 5],
      [3, 5],
      [4, 5],
      [3, 5],
    ],
    doesLoop: false,
  }),
}

type Frame = [number, number];
interface Animation {
  frames: Frame[];
  doesLoop: boolean;
}
export type Animations = {
  [animation: string]: Animation;
};

interface SpriteConfig {
  src: any
  mask?: any
  color?: any
  cutSize?: number
  displaySize?: number
  animations?: Animations
  currentAnimation?: string
  animationFrameLimit?: number
  gameObject?: any
}

interface Sprite {
  loaded: (drawable: any) => void;
  drawable: any; // TODO
  util: ImageUtil;
  cutSize: number;
  displaySize: number;
  animations: Animations;
  currentAnimation: string;
  currentAnimationFrame: number;
  animationFrameLimit: number;
  animationFrameProgress: number;
  mirrored: boolean;
  gameObject: any;
}
