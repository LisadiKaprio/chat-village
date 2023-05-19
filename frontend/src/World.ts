export { World, createAdvancedBubble }

import bunny from './images/chars/bunny.png'
import bunnyMask from './images/chars/bunny-mask.png'
import xpImage from './images/bubble/xp.png'
import emojiDetect from '@zutatensuppe/emoji-detect'

import { PlayerMessages, UPDATE_PERIOD } from './types/Types'
import {
  actionPrice,
  ActionType,
  Avatar,
  Behaviour,
  BehaviourName,
  BEHAVIOURS,
} from './Avatar.js'
import { Bubble, BubbleType } from './Bubble.js'
import { Emote } from './Emote.js'
import { assertExists } from './Helpers.js'
import { Player, Players, EmoteReceived, Message, PlayerState } from '../../common/src/Types'
// import { ServerMessages } from './types/Types.js'

const MESSAGES_ALL_OVER_THE_PLACE: boolean = false
const CHAT_RENDERING: boolean = false
const CHAT: Chat = {
  x: 20,
  y: 20,
  width: 600,
  fontSize: 22,
  lineHeight: 42,
  containerColor: '#22222210',
  maxLines: 3,
  outlineWidth: 0.4,
  outlineColor: 'black',
}
const INACTIVE_TIME: number = 1000 * 60 * 20

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

    this.chat = [{ text: 'Have a good day!', color: 'red' }]

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

    // difference between value and keys:
    // value = {name: 'kirinokirino', messageCount: 2, ... }
    // key = kirinokirino
    // key is like 1 in array[1]
    for (const [_id, user] of Object.entries(users)) {
      // create a new user avatar.
      if (!this.userAvatars[user.username]) {
        this.userAvatars[user.username] = createNewUserAvatar(
          this,
          user,
          Math.random() * this.canvas.width,
          this.canvas.height - 125,
          this.time,
        )
        this.chat.push({
          text: `Hello ${user.username}, thanks for chatting!`,
          color: user.color,
        })
      }

      if (user.state === PlayerState.OFFLINE){
        this.userAvatars[user.username].isActive = false
      }

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
        if (!avatar.isActive) {
          this.chat.push({
            text: `Welcome back ${user.username}!`,
            color: avatar.color,
          })
        }
        avatar.isActive = true
        avatar.lastChatTime = this.time
        const xpSprite = {
          src: xpImage,
          cutSize: 150,
          displaySize: 100,
        }
        this.renderedBubbles.push(
          createAdvancedBubble({
            type: 'icon',
            x: avatar.x,
            y: avatar.y,
            spriteInfo: xpSprite,
          }),
        )

        // log the message in chat and add a message bubble
        if (MESSAGES_ALL_OVER_THE_PLACE && filteredMessages[user.username]) {
          for (const message of filteredMessages[user.username]) {
            this.chat.push({ text: message.text, color: avatar.color })
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
    for (const { command, args, argUsers } of commands) {
      if (command === ActionType.HUG) {
        this.actionBetweenUsers(BehaviourName.HUG, ActionType.HUG, user, argUsers)
      } else if (command == ActionType.BONK) {
        this.actionBetweenUsers(BehaviourName.BONK, ActionType.BONK, user, argUsers)
      } else if (command === 'whoami') {
        this.chat.push({
          text: `you are ${user.username}`,
          color: 'blue',
        })
      } else if (command === 'stats') {
        this.chat.push({
          text: `${user.username} stats: ${user.points} xp.`,
          color: 'blue',
        })
      } else if (command === 'dbg') {
        console.log(user)
        const userAvatar = this.userAvatars[user.username]
        this.chat.push({
          text: `${user.username
            }'s behaviour: ${userAvatar.currentBehaviour.dbg()}, after that: ${JSON.stringify(
              userAvatar.motivation.map((motivation) => motivation.name),
            )}`,
        })
      } else if (command === 'volcano') {
        this.userAvatars = {}
        console.log(this.userAvatars)
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
    if (CHAT_RENDERING) this.updateChat()
  }

  updateAvatars() {
    // aligns all nicknames
    this.ctx.textAlign = 'center'
    this.ctx.font = 'bold 16px VictorMono-Medium'
    for (const userAvatar of Object.values(this.userAvatars)) {
      // todo: state change should be done in backend instead!
      if (
        userAvatar.isActive &&
        this.time - userAvatar.lastChatTime >= INACTIVE_TIME
      ) {
        userAvatar.isActive = false
        this.chat.push({
          text: `${userAvatar.name} hasn't written much in chat for a while now... Seems like they fell asleep!`,
          color: 'grey',
        })
      }
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

  updateChat() {
    // remove the lines that wouldn't fit in the chat
    while (this.chat.length > CHAT.maxLines) {
      this.chat.shift()
    }
    // styles applicable to all lines
    this.ctx.textAlign = 'start'
    this.ctx.font = 'bold ' + CHAT.fontSize + 'px VictorMono-Medium'
    this.ctx.lineWidth = CHAT.outlineWidth
    this.ctx.strokeStyle = CHAT.outlineColor

    for (let i = 0; i < this.chat.length; i++) {
      const logLine = this.chat[i]
      const ratio = this.ctx.measureText(logLine.text).width / CHAT.width
      let textCutTo = logLine.text.length
      if (ratio > 1) {
        textCutTo = Math.floor(logLine.text.length / ratio)
      }
      const text = logLine.text.substring(0, textCutTo)
      const y = CHAT.y + (i + 1) * CHAT.lineHeight
      const containerPadding = 12
      const containerHeight = CHAT.lineHeight - containerPadding
      this.ctx.fillStyle = CHAT.containerColor
      this.ctx.fillRect(CHAT.x, y - containerHeight + containerPadding / 2, CHAT.width, containerHeight)
      this.ctx.fillStyle = logLine.color ? logLine.color : 'grey'
      this.ctx.fillText(text, CHAT.x + 4, y, CHAT.width - 4)
      this.ctx.strokeText(text, CHAT.x + 4, y, CHAT.width - 4)
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
    potentialTargets: string[],
  ) {
    const targets =
      potentialTargets.length > 0
        ? potentialTargets
        : [this.randomAvatarName(origin.username)]
    const userAvatar = this.userAvatars[origin.username]
    const behaviours = []
    for (const name of targets) {
      if (name == origin.username) continue
      const target = this.userAvatars[name]
      if (target) {
        this.chat.push({
          text: `${origin.display_name} uses ${actionPrice(
            action,
          )}xp to ${action} ${target.display_name}`,
          color: origin.color,
        })
        behaviours.push(new Behaviour(behaviourName, [{ type: action, who: target }]))
      }
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
  time: number,
) {
  const avatar = new Avatar(world, {
    id: user.id,
    name: user.username,
    display_name: user.display_name,
    color: user.color,
    x: x,
    y: y,
    src: bunny,
    mask: bunnyMask, 
    time: time,
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

interface Chat {
  x: number;
  y: number;
  width: number;
  fontSize: number;
  containerColor: string;
  lineHeight: number;
  maxLines: number;
  outlineWidth: number;
  outlineColor: string; //"black",
}

interface ChatMessage {
  text: string;
  color?: string;
}
