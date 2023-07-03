export { FishField }

import messageParticles from './images/bubble/messageParticles.png'
import emojiDetect from '@zutatensuppe/emoji-detect'

import { PlayerMessages, UPDATE_PERIOD } from './types/Types'
import {
  ActionType,
  Avatar,
  AVATAR_DISPLAY_SIZE,
  Behaviour,
  BehaviourName,
  BEHAVIOURS,
} from './Avatar.js'
import { Bubble, BubbleType } from './Bubble.js'
import { Emote } from './Emote.js'
import { assertExists } from './Helpers.js'
import { Player, Players, EmoteReceived, Message, PlayerState, SkinId, FrontendCommand, CommandTrigger, FishStatesToChannel, FishStatesToUser } from '../../common/src/Types'
import { AVATAR_DECORATIONS, SKINS } from '../../common/src/Visuals'
import { Sprite } from './Sprite'
import { createAdvancedBubble, createNewEmojis, createNewEmotes, World } from './World'
// import { ServerMessages } from './types/Types.js'

const MESSAGES_ALL_OVER_THE_PLACE: boolean = false
const EMOTE_DISPLAY_SIZE = 50

class FishField extends World{
  constructor(gameContainer: HTMLElement, canvas: HTMLCanvasElement) {
    super(gameContainer, canvas)
    // this.element = gameContainer
    // this.canvas = canvas
    // const context = canvas.getContext('2d')
    // assertExists(context)
    // this.ctx = context

    // this.userAvatars = {}
    // this.renderedEmotes = []
    // this.renderedBubbles = []
  }

  feedFishData(
    allFishStates: FishStatesToUser
  ) {
    // TODO
  }

  update(_timestep?: number) {
    // clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    this.updateAvatars()
    this.updateEmotes()
    this.updateBubbles()
  }

  updateAvatars() {
    // aligns all nicknames
    this.ctx.textAlign = 'center'
    this.ctx.font = '16px CherryBombOne-Regular'
    for (const userAvatar of Object.values(this.userAvatars)) {
      if (userAvatar.isActive) {
        userAvatar.update()
        userAvatar.draw(this.ctx)
      }
    }
  }

  updateEmotes() {
    this.renderedEmotes = this.renderedEmotes.filter(
      (emote) => !emote.toRemove,
    )
    for (const emote of Object.values(this.renderedEmotes)) {
      emote.update()
      emote.sprite.draw(this.ctx)
    }
  }

  updateBubbles() {
    this.renderedBubbles = this.renderedBubbles.filter(
      (bubble) => !bubble.toRemove,
    )

    this.ctx.font = 'bold 16px VictorMono-Medium'
    for (const bubble of this.renderedBubbles) {
      bubble.update()
      bubble.draw(this.ctx)
    }
  }

  actionBetweenUsers(
    behaviourName: BehaviourName,
    action: ActionType,
    playerUsername: string,
    targetUsername: string,
  ) {
    const userAvatar = this.userAvatars[playerUsername]
    const behaviours = []
    const targetAvatar = this.userAvatars[targetUsername]
    if (targetAvatar) {
      behaviours.push(new Behaviour(behaviourName, [{ type: action, who: targetAvatar }]))
    }
    if (behaviours.length > 0) {
      for (const behaviour of behaviours) {
        userAvatar.pushMotivation(behaviour)
      }
    }
  }
}

function createNewUserAvatar(
  world: World,
  user: Player,
  x: number,
  y: number,
  skin: SkinId
) {
  const skinSrc = SKINS.find(s => s.id === skin).avatarSource
  const avatar = new Avatar(world, {
    id: user.id,
    name: user.username,
    display_name: user.display_name,
    color: user.color,
    x: x,
    y: y,
    src: skinSrc,
    displaySize: AVATAR_DISPLAY_SIZE,
  })
  return avatar
}
type Avatars = {
  [name: string]: Avatar;
};

interface ChatMessage {
  text: string;
  color?: string;
}
