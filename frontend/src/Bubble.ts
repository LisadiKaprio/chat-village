export { Bubble }

import { Sprite, Animation, Animations } from './Sprite.js'

class Bubble {
  constructor(config: IconBubbleConfig | TextBubbleConfig) {
    // username the bubble (can be) attached to, setting it will make the bubble move along
    this.attachedTo = config.attachedTo
    this.toRemove = false
    this.x = config.x || 0
    this.y = config.y || 950
    this.color = config.color || 'black'

    // type is either "text" or "icon",
    // config would provide either text or sprite depending on the type
    this.type = config.type
    if (config.type == BubbleType.ICON) {
      this.sprite = new Sprite({
        gameObject: this,
        src: config.src,
        mask: config.mask,
        cutSize: config.cutSize,
        displaySize: config.displaySize,
        color: this.color,
        animations: config.animations || {
          idle: new Animation({
            frames: [
              [1, 1],
              [2, 1],
            ],
            doesLoop: true,
          }),
        },
      })
    } else if (config.type == BubbleType.TEXT) {
      this.text = config.text
    }

    // Behaviours
    this.behaviours = {
      idle: [
        { type: 'oscilate', time: 75 },
        { type: 'dissolve', time: 50 },
      ],
    }
    this.behaviourLoop = config.behaviourLoop || this.behaviours['idle']
    this.behaviourLoopIndex = 0
    this.actionTime = this.behaviourLoop[this.behaviourLoopIndex].time

    // Customization
    this.speed = config.speed || 2.0
    this.opacity = 1.0
  }

  advanceBehaviour() {
    this.behaviourLoopIndex += 1
    if (this.behaviourLoopIndex >= this.behaviourLoop.length) {
      this.behaviourLoopIndex -= 1
      this.actionTime = 1
      this.toRemove = true
      return
    }

    const action = this.behaviourLoop[this.behaviourLoopIndex]
    this.actionTime = action.time
  }

  update() {
    this.actionTime -= 1
    if (this.actionTime <= 0) {
      this.advanceBehaviour()
    }
    const action = this.behaviourLoop[this.behaviourLoopIndex]
    if (action.type == 'ascend') {
      this.y -= this.speed
    } else if (action.type == 'oscilate') {
      const numberOfCycles = 1.0
      // if numberOfCycles = 0.5, then
      // will always play the second half, so we need to offset the progress back half a cycle
      const cycleOffset = 0
      const fullCycleSteps = action.time / numberOfCycles
      const thisCycleStep = ((this.actionTime - 1) % fullCycleSteps) + 1
      // precent completion
      const cycleProgress =
        (fullCycleSteps - thisCycleStep) / fullCycleSteps - cycleOffset
      const oscillation = Math.sin(cycleProgress * Math.PI * 2)
      this.y -= oscillation * this.speed
    } else if (action.type == 'dissolve') {
      this.opacity = this.actionTime / action.time
      //this.y -= this.speed;
      // TODO: disappear
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    let xOffset = 0
    // If its attached to something, move the text to the updated position of the entity its attached to.
    if (this.attachedTo) {
      xOffset =
        -this.x + this.attachedTo.x + this.attachedTo.sprite.displaySize / 2
    }
    ctx.globalAlpha = this.opacity
    if (this.type == 'text') {
      ctx.fillStyle = this.color
      ctx.fillText(this.text!, this.x + xOffset, this.y)
    } else if (this.type == 'icon') {
      this.sprite!.draw(ctx, xOffset)
    } else {
      console.error('Unhandled bubble type')
      console.error(this)
    }
    ctx.globalAlpha = 1.0
  }
}

export enum BubbleType {
  ICON = 'icon',
  TEXT = 'text',
}

interface BubbleConfig {
  attachedTo?: any // ? TODO
  x?: number
  y?: number
  color?: string
  behaviourLoop?: any[] // ? TODO
  speed?: number
}

interface IconBubbleConfig extends BubbleConfig {
  type: BubbleType.ICON
  src: any // ? TODO
  mask?: any // ? TODO
  cutSize: number
  displaySize: number
  animations?: Animations
}

interface TextBubbleConfig extends BubbleConfig {
  type: BubbleType.TEXT
  text: string
}

interface Bubble {
  attachedTo: any; // ?
  toRemove: boolean;
  x: number;
  y: number;
  color: string;
  type: BubbleType;
  src: string;
  mask: string;
  cutSize: number;
  displaySize: number;
  sprite?: Sprite;
  text?: string;
  behaviours: any; // TODO
  behaviourLoop: any;
  behaviourLoopIndex: number;
  actionTime: number;
  speed: number;
  opacity: number;
}
