export { BEHAVIOURS, Avatar, Behaviour }
import { assertExists } from './Helpers.js'
import { ANIMATIONS, Sprite } from './Sprite.js'
import { createAdvancedBubble, World } from './World.js'
import heartParticles from './images/bubble/heartParticles.png'
import { SkinId } from '../../common/src/Types.js'
import { AvatarDecorationId } from '../../common/src/Visuals.js'
import { Chance } from 'chance'


export const AVATAR_DISPLAY_SIZE = 150
export const FISH_AVATAR_DISPLAY_SIZE = 150
export const DANCE_INTENSITY = 0.01
export const DANCE_HEIGHT = 15

export enum BehaviourName {
  BONK = 'bonk',
  BONKED = 'bonked',
  HUG = 'hug',
  HUGGED = 'hugged',
  IDLE = 'idle',
  SLEEP = 'sleep',
  TALK = 'talk',
  SIT = 'sit',
  DANCE = 'dance'
}

export enum ActionType {
  BONK = 'bonk',
  BONKED = 'bonked',
  GO = 'go',
  HUG = 'hug',
  HUGGED = 'hugged',
  STAND = 'stand',
  TALK = 'talk',
  WALK = 'walk',
  SIT = 'sit',
}

class Behaviour {
  constructor(name: BehaviourName, actions: Action[]) {
    this.name = name
    this.actions = actions
  }

  shift() {
    this.actions.shift()
  }

  unshift(action: Action) {
    this.actions.unshift(action)
  }

  insert(place: number, action: Action) {
    this.actions.splice(place, 0, action)
  }

  get length() {
    return this.actions.length
  }

  dbg() {
    return `${this.name} (${this.actions
      .map((action) => action.type)
      .join(', ')})`
  }
}

const BEHAVIOURS = {
  idle: new Behaviour(BehaviourName.IDLE, [
    { type: ActionType.WALK, defaultAnimation: 'walk' },
    { type: ActionType.STAND, defaultAnimation: 'idle' },
  ]),
  sit: new Behaviour(BehaviourName.SIT, [
    { type: ActionType.SIT, defaultAnimation: 'idle' },
  ]),
  talk: new Behaviour(BehaviourName.TALK, [{ type: ActionType.TALK, defaultAnimation: 'talk' }]),
  sleep: new Behaviour(BehaviourName.SLEEP, [{ type: ActionType.STAND, defaultAnimation: 'idle' }]),
}

interface Avatar {
  id?: number;
  name: string;
  display_name: string;
  world: World;
  x: number;
  y: number;
  initialPositionY: number;
  skin: SkinId;
  currentAvatarDecoration: AvatarDecorationId | null;
  toRemove: boolean;
  color: string;
  sprite: Sprite;
  decoSprite: Sprite | null;
  actionTime: number;
  speed: number;
  minWalkingTime: number;
  maxWalkingTime: number;
  minStandTime: number;
  maxStandTime: number;
  direction: 'left' | 'right';
  idleBehaviour: Behaviour;
  motivation: Behaviour[];
  currentBehaviour: Behaviour;
  behaviourLoopIndex: number;
  isActive: boolean;
  lastChatTime: number;
  chance: Chance.Chance;
  lastInteractionTime: number;
  isDancing: boolean;
  isInDanceArea: boolean;
}

interface Behaviour {
  name: BehaviourName;
  actions: Action[];
}

interface Action {
  type: ActionType;
  direction?: 'left' | 'right';
  defaultAnimation?: string;
  x?: number;
  y?: number;
  who?: Avatar;
  mirrored?: boolean;
}
class Avatar {
  constructor(world: World, config: any) {
    this.chance = new Chance()
    this.id = config.id
    this.name = config.name ?? 'NoName'
    this.display_name = config.display_name ?? 'NoName'
    this.world = world
    this.x = config.x || 0
    this.y = config.y || 150
    this.toRemove = false
    this.color = config.color || 'purple'
    this.sprite = new Sprite({
      gameObject: this,
      src: config.src,
      mask: config.mask,
      // color: this.color,
      displaySize: config.displaySize || AVATAR_DISPLAY_SIZE,
      animations: config.animations || {
        idle: ANIMATIONS.idle,
        walk: ANIMATIONS.walk,
        talk: ANIMATIONS.talk,
        hug: ANIMATIONS.hug,
        bonk: ANIMATIONS.bonk,
        bonked: ANIMATIONS.bonked,
        sit: ANIMATIONS.walk,
        dance: ANIMATIONS.dance,
      },
      currentAnimation: config.currentAnimation,
    })

    this.actionTime = config.actionTime ?? 24
    this.speed = config.speed || 1.0

    this.minWalkingTime = config.minWalkingTime || 100
    this.maxWalkingTime = config.maxWalkingTime || 800
    this.minStandTime = config.minStandTime || 100
    this.maxStandTime = config.maxStandTime || 500
    // default direction
    this.direction = 'left'

    // Behaviour is a series of actions or other behaviours
    // Motivation is a stack of behaviours that the caracter wants to do
    this.idleBehaviour = config.idleBehaviour || BEHAVIOURS.idle

    this.motivation = []
    this.currentBehaviour = config.currentBehaviour || this.idleBehaviour
    this.behaviourLoopIndex = 0

    this.isActive = true
    this.lastInteractionTime = Date.now()
    this.isDancing = false
    this.isInDanceArea = false
    this.initialPositionY = this.y
  }

  update() {
    this.actionTime -= 1
    if (this.actionTime <= 0) {
      this.advanceBehaviour()
    }
    const action = this.currentBehaviour.actions[this.behaviourLoopIndex]
    if (action.type === ActionType.WALK) {
      if (this.x >= this.world.canvas.width - AVATAR_DISPLAY_SIZE) {
        this.direction = 'left'
      }
      if (this.x <= 0) {
        this.direction = 'right'
      }
      if (this.direction == 'left') {
        this.x -= this.speed
        if (!this.isDancing && !this.isInDanceArea) this.sprite.mirrored = false
      } else if (this.direction == 'right') {
        this.x += this.speed
        if (!this.isDancing && !this.isInDanceArea) this.sprite.mirrored = true
      }
    } else if (action.type == ActionType.GO) {
      const speedMultiplier = 2.0
      // TODO: only done for x.
      const x = action.x ?? 0
      const deltaX = x - this.x
      if (deltaX > this.speed * speedMultiplier + 0.1) { // running right
        this.x += this.speed * speedMultiplier
        this.sprite.mirrored = true
      } else if (deltaX < -(this.speed * speedMultiplier + 0.1)) { // running left
        this.x -= this.speed * speedMultiplier
        this.sprite.mirrored = false
      } else {
        this.x = x
        this.actionTime = 1
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    this.sprite.draw(ctx)
    if (this.decoSprite) {
      //todo: clean up same things from before in this whole file
      this.decoSprite.currentAnimation = this.sprite.currentAnimation
      this.decoSprite.mirrored = this.sprite.mirrored
      this.decoSprite.currentAnimationFrame = this.sprite.currentAnimationFrame
      this.decoSprite.animationFrameProgress = this.sprite.animationFrameProgress
      this.decoSprite.draw(ctx)
    }
    if (this.isDancing || this.isInDanceArea) {
      this.progressBounce(DANCE_INTENSITY, DANCE_HEIGHT)
    }
    ctx.fillStyle = this.color
    ctx.strokeStyle = 'black'
    ctx.strokeText(
      this.display_name,
      this.x + this.sprite.displaySize / 2,
      this.y + this.sprite.displaySize + 10,
    )
    ctx.fillText(
      this.display_name,
      this.x + this.sprite.displaySize / 2,
      this.y + this.sprite.displaySize + 10,
    )
  }

  endAnimation() {
    // Animation that doesn't loop has ended
    // motivation doesn't necessarily has to end?
    this.popMotivation()
  }

  resetAnimationAndVerticalPosition() {
    this.sprite.setAnimation(this.currentBehaviour.actions[this.behaviourLoopIndex].defaultAnimation)
    this.y = this.initialPositionY
  }

  pushMotivation(behaviour: Behaviour) {
    // check for the ordering

    // most urgent behaviours don't get swapped out
    if (!this.canSwapBehaviour()) {
      this.motivation.push(behaviour)
      return
    }

    // instant actions
    // swap current behaviour to talk or hug immediately
    if (behaviour.name == 'talk' || behaviour.name == 'hug') {
      // didn't finish action, do it later
      this.motivation.push(this.currentBehaviour)
      this.changeBehaviour(behaviour)
      return
    } else if (this.currentBehaviour.name == 'idle') {
      // idle is the least urgent behaviour.
      this.motivation.push(this.currentBehaviour)
      this.changeBehaviour(behaviour)
      return
    } // other cases where we need to decide to swap or not...

    // don't swap by default
    this.motivation.push(behaviour)
  }

  popMotivation() {
    if (this.motivation.length == 0) {
      if (!this.isActive) {
        this.pushMotivation(BEHAVIOURS.sleep)
      } else {
        this.pushMotivation(this.idleBehaviour)
      }
    }
    const nextMotivation = this.motivation.pop()
    assertExists(nextMotivation) // We would've added a motivation if we didn't have any.
    this.changeBehaviour(nextMotivation)
  }

  changeBehaviour(behaviour: Behaviour) {
    this.currentBehaviour = behaviour
    this.behaviourLoopIndex = -1
    this.advanceBehaviour()
  }

  advanceBehaviour() {
    this.behaviourLoopIndex += 1
    if (this.behaviourLoopIndex >= this.currentBehaviour.actions.length) {
      // try to do the next thing.
      this.popMotivation()
      return
    }

    const action = this.currentBehaviour.actions[this.behaviourLoopIndex]
    if (action.type == ActionType.WALK) {
      console.log(`${this.name}: walky`)
      if (!this.isDancing && !this.isInDanceArea) this.sprite.setAnimation('walk')
      else this.sprite.setAnimation('dance')
      this.actionTime = this.chance.integer({ min: this.minWalkingTime, max: this.maxWalkingTime })
      const direction = this.chance.pickone(['left', 'right'])
      this.direction = direction
    } else if (action.type == ActionType.STAND) {
      if (!this.isDancing && !this.isInDanceArea) this.sprite.setAnimation('idle')
      else this.sprite.setAnimation('dance')
      this.actionTime = this.chance.integer({ min: this.minStandTime, max: this.maxStandTime })
    } else if (action.type == ActionType.SIT) {
      this.sprite.setAnimation('walk')
      this.actionTime = 9999
    } else if (action.type == ActionType.TALK) {
      // play out all the frames of animation, then animation advances to next behaviour
      this.sprite.setAnimation('talk')
      this.actionTime = 9999
    } else if (action.type == ActionType.HUG) {
      if (!action.who) return
      if (!this.getCloser(action.who)) {
        if (action.who.canSwapBehaviour()) {
          // close enough for a hug, change animation of this and the other
          this.sprite.setAnimation('hug')
          this.actionTime = 500
          this.sprite.mirrored = this.x < action.who.x
          // sets sprite mirrored here, doesn't reset it
          action.who.changeBehaviour(
            new Behaviour(BehaviourName.HUGGED, [
              { type: ActionType.HUGGED, mirrored: !this.sprite.mirrored },
            ]),
          )
          this.showIcon((this.x + action.who.x) / 2)
        } else {
          this.actionTime = 25
          this.currentBehaviour.insert(this.behaviourLoopIndex, {
            type: ActionType.STAND,
          })
        }
      }
    } else if (action.type == ActionType.HUGGED) {
      this.sprite.mirrored = action.mirrored ?? false
      this.sprite.setAnimation('hug')
      this.actionTime = 500
    } else if (action.type == ActionType.BONK) {
      if (!action.who) return
      if (!this.getCloser(action.who)) {
        if (action.who.canSwapBehaviour()) {
          // close enough for a hug, change animation of this and the other
          this.sprite.setAnimation('bonk')
          this.actionTime = 300
          this.sprite.mirrored = this.x < action.who.x
          // sets sprite mirrored here, doesn't reset it
          action.who.changeBehaviour(
            new Behaviour(BehaviourName.BONKED, [
              { type: ActionType.BONKED, mirrored: this.sprite.mirrored },
            ]),
          )
        } else {
          this.actionTime = 25
          this.currentBehaviour.insert(this.behaviourLoopIndex, {
            type: ActionType.STAND,
          })
        }
      }
    } else if (action.type == ActionType.BONKED) {
      this.sprite.mirrored = !action.mirrored ?? false
      this.sprite.setAnimation('bonked')
      this.actionTime = 300
    } else if (action.type == ActionType.GO) {
      this.actionTime = 100
    }
  }

  canSwapBehaviour() {
    return (
      this.currentBehaviour.name != BehaviourName.HUG &&
      this.currentBehaviour.name != BehaviourName.HUGGED &&
      this.currentBehaviour.name != BehaviourName.BONK &&
      this.currentBehaviour.name != BehaviourName.BONKED
    )
  }

  getCloser(target: Avatar) {
    // TODO: only done for x.
    const distance = target.x - this.x
    // half of this sprite and half of the other sprite
    const targetSize = target.sprite ? target.sprite.displaySize : 0
    const padding = (this.sprite.displaySize + targetSize) / 3
    if (Math.abs(distance) > padding + 10) {
      // need to go closer to who we want to hug.
      // TODO: if too close maybe need to step away a little bit.
      if (this.currentBehaviour.name !== BehaviourName.DANCE) this.sprite.setAnimation('walk')
      this.sprite.mirrored = this.direction !== 'left' ?? false
      this.actionTime = 100
      this.currentBehaviour.insert(this.behaviourLoopIndex, {
        type: ActionType.GO,
        x: target.x - padding * Math.sign(distance),
        y: target.y,
      })
      return true
    } else {
      return false
    }
  }

  showIcon(x: number) {
    const iconSize = 50
    const iconSprite = {
      src: heartParticles,
      cutSize: 100,
      displaySize: iconSize,
    }
    this.world.renderedBubbles.push(
      createAdvancedBubble({
        type: 'icon',
        x: x + ((this.sprite.displaySize / 2) - (iconSprite.displaySize / 2)),
        y: this.y - 20,
        spriteInfo: iconSprite,
      }),
    )
  }

  progressBounce(intensity: number, height: number) {
    this.y = this.initialPositionY - height + Math.sin(Date.now() * intensity) * height
  }
}
