export { World, createAdvancedBubble }

import messageParticles from './images/bubble/messageParticles.png'
import emojiDetect from '@zutatensuppe/emoji-detect'

import bunny from './images/chars/bunny.png'
import cat from './images/chars/cat.png'

import { PlayerMessages, UPDATE_PERIOD } from './types/Types'
import {
  ActionType,
  Avatar,
  Behaviour,
  BehaviourName,
  BEHAVIOURS,
} from './Avatar.js'
import { Bubble, BubbleType } from './Bubble.js'
import { Emote } from './Emote.js'
import { assertExists } from './Helpers.js'
import { Player, Players, EmoteReceived, Message, PlayerState, SkinId, NonEmptyArray, Skin } from '../../common/src/Types'
// import { ServerMessages } from './types/Types.js'

const MESSAGES_ALL_OVER_THE_PLACE: boolean = false

const SKINS: NonEmptyArray<Skin> = [
  {
    id: SkinId.BUNNY,
    source: bunny
  },
  {
    id: SkinId.CAT,
    source: cat
  },
  {
    id: SkinId.DOG,
    source: bunny
  },
  {
    id: SkinId.BEAR,
    source: bunny
  },
  {
    id: SkinId.PANDA,
    source: bunny
  },
]

class World {
  constructor(gameContainer: HTMLElement, canvas: HTMLCanvasElement) {
    this.element = gameContainer
    this.canvas = canvas
    const context = canvas.getContext('2d')
    assertExists(context)
    this.ctx = context

    this.userAvatars = {}
    this.renderedEmotes = []
    this.renderedBubbles = []

    this.time = 0
  }

  feedNewData(
    users: Players,
    emotes: EmoteReceived[],
    messages: Message[],
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

    this.time += UPDATE_PERIOD
    for (const [_id, user] of Object.entries(users)) {
      // create a new user avatar.
      if (!this.userAvatars[user.username]) {
        this.userAvatars[user.username] = createNewUserAvatar(
          this,
          user,
          Math.random() * this.canvas.width,
          this.canvas.height - 125,
          user.skin
        )
      }

      this.userAvatars[user.username].isActive = (user.state === PlayerState.ACTIVE)

      // handle user commands
      this.handleCommands(user)

      if (filteredMessages[user.username]) {
        const avatar = this.userAvatars[user.username]
        this.renderedEmotes.push(...createNewEmojis(filteredMessages[user.username].map(m => m.text), avatar.x, avatar.y))
      }

      // handle user messages
      if (filteredMessages[user.username] || emotes.some((emote) => emote.name == user.username)) {
        const avatar = this.userAvatars[user.username]
        avatar.changeBehaviour(BEHAVIOURS.idle)
        avatar.pushMotivation(BEHAVIOURS.talk)
        avatar.lastChatTime = this.time
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

        // log the message in chat and add a message bubble
        if (MESSAGES_ALL_OVER_THE_PLACE && filteredMessages[user.username]) {
          for (const message of filteredMessages[user.username]) {
            this.renderedBubbles.push(
              createAdvancedBubble({
                type: 'text',
                text: message,
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                behaviourLoop: [
                  { type: 'ascend', time: 100 },
                  { type: 'dissolve', time: 30 },
                ],
              }),
            )
          }
        }
      }
    }

    for (const [_name, avatar] of Object.entries(this.userAvatars)){
      if (!users[avatar.id]){
        avatar.isActive = false
      }
    }

    // spawn new emotes since last data pull
    this.renderedEmotes.push(...createNewEmotes(emotes, this.userAvatars))
  }

  handleCommands(user: Player) {
    const commands = user.unhandled_commands
    console.log('commands is ' + JSON.stringify(commands))
    for (const { command, args, argUsers } of commands) {
      if (command === '!hug') {
        console.log('hug -> argUsers is ' + argUsers)
        this.actionBetweenUsers(BehaviourName.HUG, ActionType.HUG, user, argUsers[0])
      } else if (command == '!bonk') {
        console.log('bonk -> argUsers is ' + argUsers)
        this.actionBetweenUsers(BehaviourName.BONK, ActionType.BONK, user, argUsers[0])
      } else if (command === '!volcano') {
        this.userAvatars = {}
      } else {
        // Ignore unhandled commands.
      }
    }
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
    this.ctx.font = 'bold 16px VictorMono-Medium'
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

  randomAvatarName(besides?: string): string {
    let names: string[] = Object.keys(this.userAvatars)
    if (besides) {
      names = names.filter((name) => name != besides)
    }
    const randomIndex = Math.floor(Math.random() * names.length)
    const result = names.at(randomIndex)
    // assertExists(result)
    return result
  }
  actionBetweenUsers(
    behaviourName: BehaviourName,
    action: ActionType,
    origin: Player,
    target: string,
  ) {
    const userAvatar = this.userAvatars[origin.username]
    const behaviours = []
    const targetAvatar = this.userAvatars[target]
    console.log(targetAvatar)
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
  const skinSrc = SKINS.find(s => s.id === skin).source
  const avatar = new Avatar(world, {
    id: user.id,
    name: user.username,
    display_name: user.display_name,
    color: user.color,
    x: x,
    y: y,
    src: skinSrc,
    displaySize: 100,
  })
  return avatar
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
function createAdvancedBubble(config: any) {
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


function createNewEmojis(messages: string[], x: number, y: number) {
	const emotes: Emote[] = []
	for (const message of messages) {
		emojiDetect.detectStrings(message).map((emoji: string) => {
			const emote = new Emote({
        x: x,
        y: y,
        src: `https://cdn.betterttv.net/assets/emoji/${emoji}.svg`,
        cutSize: 1300,
        displaySize: 50,
        speedPhysicsX: Math.random() * 6 - 3,
        speedPhysicsY: -(Math.random() * 5),
        dragPhysicsY: -0.02,
      })
      emotes.push(emote)
      })
	}
	return emotes
}

function createNewEmote(emoteId: number, x: number, y: number) {
  const emote = new Emote({
    x: x,
    y: y,
    src: getEmoteImg(emoteId),
    speedPhysicsX: Math.random() * 6 - 3,
    speedPhysicsY: -(Math.random() * 5),
    dragPhysicsY: -0.02,
  })
  return emote
}

function createNewEmotes(emotes: EmoteReceived[], avatars: Avatars) {
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
function getEmoteImg(emoteId: number) {
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
  time: number;
}

interface ChatMessage {
  text: string;
  color?: string;
}
