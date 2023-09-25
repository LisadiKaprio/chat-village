export { World }

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
import { Player, Players, EmoteReceived, Message, PlayerState, SkinId, FrontendCommand, CommandTrigger, FishPlayers } from '../../common/src/Types'
import { AVATAR_DECORATIONS, SKINS } from '../../common/src/Visuals'
import { Sprite } from './Sprite'
import { FishAvatar } from './FishAvatar'
// import { ServerMessages } from './types/Types.js'

const MESSAGES_ALL_OVER_THE_PLACE: boolean = false
const EMOTE_DISPLAY_SIZE = 200

class World {
  constructor(gameContainer: HTMLElement, canvas: HTMLCanvasElement) {
    this.isFishWorld = false
    this.element = gameContainer
    this.canvas = canvas
    const context = canvas.getContext('2d')
    assertExists(context)
    this.ctx = context

    this.userAvatars = {}
    this.renderedEmotes = []
    this.renderedBubbles = []
  }

  buildBg(): CanvasImageSource | null {
    const tmpCanvas = document.createElement('canvas')
    tmpCanvas.width = this.canvas.width
    tmpCanvas.height = this.canvas.height
    const tmpCtx = tmpCanvas.getContext('2d')

    if(!this.bg) return null

    // weirdly sprites can fail to render, which leaves the bg blank
    // in that case return null
    const drawn = this.bg.draw(tmpCtx)
    // if (!drawn) {
    //   return null
    // }

    return tmpCanvas
  }

  feedNewData(
    users: (Players | FishPlayers),
    emotes: EmoteReceived[],
    messages: Message[],
    commands: FrontendCommand[],
  ) {
    const filteredMessages: PlayerMessages = {}
    if(messages){
      for (const message of messages) {
        if (filteredMessages[message.name]) {
          filteredMessages[message.name].push(message)
        } else {
          filteredMessages[message.name] = [message]
        }
      }
    }

    this.feedEmotesAndMessages(users, filteredMessages, emotes)

    for (const [_id, user] of Object.entries(users)) {
      if (!this.userAvatars[user.username]) this.userAvatars[user.username] = this.createNewUserAvatar(user)

      this.updateAvatarDecoration(user)

      // decide if avatar should be rendered
      const isFishingOrCatching = user.state === PlayerState.FISHING || user.state === PlayerState.CATCHING;
      this.userAvatars[user.username].isActive = isFishingOrCatching && this.isFishWorld || user.state === PlayerState.ACTIVE && !this.isFishWorld;
    }

    for (const [name, avatar] of Object.entries(this.userAvatars)){
      const userDisappeared = (!users[avatar.id] && !this.isFishWorld) || (!users[avatar.name] && this.isFishWorld)
      if (userDisappeared) this.userDisappears(name)
    }

    if (commands && !this.isFishWorld) this.handleCommands(commands)
  }

  userDisappears(name: string) {
    delete this.userAvatars[name]
  }

  feedEmotesAndMessages(users: Players, messages: PlayerMessages, emotes: EmoteReceived[]) {
    for (const [_id, user] of Object.entries(users)) {
      if(user.state !== PlayerState.ACTIVE) {
        continue
      }
      const avatar = this.userAvatars[user.username]

      // handle emotes
      if (messages[user.username]) {
        this.renderedEmotes.push(...createNewEmojis(messages[user.username].map(m => m.text), avatar.x, avatar.y))
      }

      // handle user messages
      if (messages[user.username] || emotes.some((emote) => emote.name == user.username)) {
        if (!this.isFishWorld) this.setTalkingAnimation(avatar)
        const xpSprite = {
          src: messageParticles,
          cutSize: 100,
          displaySize: 50,
        }
        this.renderedBubbles.push(
          createAdvancedBubble({
            type: 'icon',
            x: avatar.x + ((avatar.sprite.displaySize / 2) - (xpSprite.displaySize / 2)),
            y: avatar.y,
            spriteInfo: xpSprite,
          }),
        )
      }

      // spawn new emotes since last data pull
      this.renderedEmotes.push(...createNewEmotes(emotes, this.userAvatars))
    }
  }

  setTalkingAnimation(avatar: Avatar) {
    avatar.lastInteractionTime = Date.now()
    avatar.changeBehaviour(BEHAVIOURS.idle)
    avatar.pushMotivation(BEHAVIOURS.talk)
  }

  createNewUserAvatar(user: Player) {
    const skinSrc = SKINS.find(s => s.id === user.skin).avatarSource
    const avatar = new Avatar(this, {
      id: user.id,
      name: user.username,
      display_name: user.display_name,
      color: user.color,
      x: Math.random() * this.canvas.width,
      y: this.canvas.height - AVATAR_DISPLAY_SIZE - 25, // name display size
      src: skinSrc,
      displaySize: AVATAR_DISPLAY_SIZE,
    })
    return avatar
  }

  updateAvatarDecoration(user: Player) {
    if (!user.avatar_decoration && this.userAvatars[user.username].currentAvatarDecoration) {
      this.userAvatars[user.username].currentAvatarDecoration = null
      this.userAvatars[user.username].decoSprite = null
      this.userAvatars[user.username].lastInteractionTime = Date.now()
    }
    if (user.avatar_decoration && this.userAvatars[user.username].currentAvatarDecoration !== user.avatar_decoration) {
      const avatarDecoration = AVATAR_DECORATIONS.find(d => d.id === user.avatar_decoration)
      this.userAvatars[user.username].currentAvatarDecoration = user.avatar_decoration
      this.userAvatars[user.username].decoSprite = new Sprite({
        gameObject: this.userAvatars[user.username],
        src: avatarDecoration.avatarSource,
        mask: avatarDecoration.avatarMask,
        color: this.userAvatars[user.username].color,
        displaySize: AVATAR_DISPLAY_SIZE,
        animations: this.userAvatars[user.username].sprite.animations,
        currentAnimation: this.userAvatars[user.username].sprite.currentAnimation
      })
      this.userAvatars[user.username].lastInteractionTime = Date.now()
    }
  }

  handleCommands(commands: FrontendCommand[]) {
    for (const { command, args, argPlayerUsernames, playerUsername } of commands) {
      if (command === CommandTrigger.HUG) {
        this.actionBetweenUsers(BehaviourName.HUG, ActionType.HUG, playerUsername, argPlayerUsernames[0])
      } else if (command == CommandTrigger.BONK) {
        this.actionBetweenUsers(BehaviourName.BONK, ActionType.BONK, playerUsername, argPlayerUsernames[0])
      } else if (command === CommandTrigger.VOLCANO) {
        this.userAvatars = {}
      } else {
        // Ignore unhandled commands.
      }
    }
  }

  update(_timestep?: number) {
    // clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    if (this.bg) this.bg.draw(this.ctx)
    this.ctx.textAlign = 'center'
    this.ctx.font = '16px CherryBombOne-Regular'

    this.updateAvatars()
    this.updateEmotes()
    this.updateBubbles()
  }

  updateAvatars() {
    for (const userAvatar of Object.values(this.userAvatars)) {
      this.updateSingleAvatar(userAvatar)
    }
    const avatarsToDraw = Object.values(this.userAvatars).sort((small, big) => small.lastInteractionTime - big.lastInteractionTime)
    for (const userAvatar of avatarsToDraw) {
      this.drawSingleAvatar(userAvatar)
    }
  }

  updateSingleAvatar(userAvatar: Avatar | FishAvatar) {
    if (!userAvatar.isActive) return
    userAvatar.update()
  }

  drawSingleAvatar(userAvatar: Avatar | FishAvatar) {
    if (!userAvatar.isActive) return
    userAvatar.draw(this.ctx)
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
    userAvatar.lastInteractionTime = Date.now()
    if (!targetAvatar) {
      console.log(`!!! Attention: no target avatar ${targetUsername} in walk widget >:(`)
    }
    if (targetAvatar) {
      targetAvatar.lastInteractionTime = Date.now()
      behaviours.push(new Behaviour(behaviourName, [{ type: action, who: targetAvatar }]))
    }
    if (behaviours.length > 0) {
      for (const behaviour of behaviours) {
        userAvatar.pushMotivation(behaviour)
      }
    }
  }
}

// function createTextBubble(origin: Avatar, contents: string) {
//   const xOffset = origin.sprite ? origin.sprite.displaySize / 2 : 0
//   const bubble = new Bubble({
//     type: BubbleType.TEXT,
//     //attachedTo: origin,
//     x: origin.x + xOffset,
//     y: origin.y - 0,
//     text: contents,
//   })
//   return bubble
// }

// TODO
export function createAdvancedBubble(config: any) {
  const offset = config.spriteInfo ? config.spriteInfo.displaySize / 2 : 0
  if (config.type === BubbleType.TEXT) {
    return new Bubble({
      type: config.type,
      //attachedTo: origin,
      x: config.x,
      y: config.y - offset,
      text: config.text as string,
    })
  }
  if (config.type === BubbleType.ICON) {
    return new Bubble({
      type: config.type,
      //attachedTo: origin,
      x: config.x,
      y: config.y - offset,
      displaySize: config.spriteInfo ? config.spriteInfo.displaySize : undefined,
      cutSize: config.spriteInfo ? config.spriteInfo.cutSize : undefined,
      src: config.spriteInfo ? config.spriteInfo.src : undefined,
      behaviourLoop: config.behaviourLoop,
    })
  }
  throw new Error('config type must be "text" or "icon"')
}


export function createNewEmojis(messages: string[], x: number, y: number) {
	const emotes: Emote[] = []
	for (const message of messages) {
		emojiDetect.detectStrings(message).map((emoji: string) => {
			const emote = new Emote({
        x: x,
        y: y,
        src: `https://cdn.betterttv.net/assets/emoji/${emoji}.svg`,
        cutSize: 1300,
        displaySize: (EMOTE_DISPLAY_SIZE / 3),
        speedPhysicsX: Math.random() * 6 - 3,
        speedPhysicsY: -(Math.random() * 5),
        dragPhysicsY: -0.02,
      })
      emotes.push(emote)
      })
	}
	return emotes
}

export function createNewEmote(emoteId: number, x: number, y: number) {
  const emote = new Emote({
    x: x,
    y: y,
    src: getEmoteImg(emoteId),
    speedPhysicsX: Math.random() * 6 - 3,
    speedPhysicsY: -(Math.random() * 5),
    dragPhysicsY: -0.02,
    displaySize: EMOTE_DISPLAY_SIZE,
  })
  return emote
}

export function createNewEmotes(emotes: EmoteReceived[], avatars: Avatars) {
  const newEmotes = []
  for (let i = 0; i < emotes.length; i++) {
    const avatar = avatars[emotes[i].name]
    const x = avatar.x + avatar.sprite.displaySize / 2
    const y = avatar.y - 25
    newEmotes.push(createNewEmote(emotes[i].id, x, y))
  }
  return newEmotes
}

// get (normal twitchtv) emotes
export function getEmoteImg(emoteId: number) {
  return (
    'https://static-cdn.jtvnw.net/emoticons/v2/' + emoteId + '/default/dark/2.0'
  )
}

type Avatars = {
  [name: string]: Avatar;
};

interface World {
  element: Element;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  userAvatars: Avatars;
  renderedEmotes: any[];
  renderedBubbles: any[];
  chat: ChatMessage[];
  isFishWorld: boolean;
  bg?: Sprite;
  builtBg?: CanvasImageSource
}

interface ChatMessage {
  text: string;
  color?: string;
}
