export { FishWorld }
import { EmoteReceived, FishPlayer, FishPlayers, FrontendCommand, Message, Player, Players } from '../../common/src/Types.js';
import { SKINS } from '../../common/src/Visuals.js';
import { FishAvatar } from './FishAvatar.js'
import { Avatar, BEHAVIOURS, FISH_AVATAR_DISPLAY_SIZE } from './Avatar.js'
import { World } from './World'
import { ANIMATIONS, Sprite } from './Sprite.js';

import fishWorldBg from './images/fish-world/fish-world.png'

interface FishWorld extends World{
  userAvatars: FishAvatars;
}

type FishAvatars = {
  [name: string]: FishAvatar;
};

class FishWorld extends World{
  constructor(gameContainer: HTMLElement, canvas: HTMLCanvasElement) {
    super(gameContainer, canvas)
    this.isFishWorld = true
    this.bg = new Sprite({
      src: fishWorldBg,
      displaySize: 550,
      cutSize: 550,
      animations: {
        idle: ANIMATIONS.static,
      },
    })
  }

  // feedNewData(
  //   users: (Players | FishPlayers),
  //   emotes: EmoteReceived[],
  //   messages: Message[],
  //   commands: FrontendCommand[],
  // ) {
  //   super.feedNewData(users, emotes, messages, commands)
  // }

  createNewUserAvatar(user: FishPlayer) {
    const skinSrc = SKINS.find(s => s.id === user.skin).avatarSource
    const avatar = new FishAvatar(this, {
      id: user.id,
      name: user.username,
      display_name: user.display_name,
      color: user.color,
      x: 375,
      y: this.canvas.height - FISH_AVATAR_DISPLAY_SIZE - 25, // name display size
      src: skinSrc,
      displaySize: FISH_AVATAR_DISPLAY_SIZE,
      idleBehaviour: BEHAVIOURS.sit,
      currentAnimation: 'sit',
      fishWaitTime: user.fishWaitTime,
    })
    console.log(avatar)
    return avatar
  }
}