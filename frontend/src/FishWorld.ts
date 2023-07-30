export { FishWorld }
import { EmoteReceived, FishAvatarStatus, FishPlayer, FishPlayers, FrontendCommand, Message, Player, Players } from '../../common/src/Types.js';
import { SKINS } from '../../common/src/Visuals.js';
import { FishAvatar } from './FishAvatar.js'
import { Avatar, BEHAVIOURS, FISH_AVATAR_DISPLAY_SIZE } from './Avatar.js'
import { World } from './World'
import { ANIMATIONS, Sprite } from './Sprite.js';

import fishWorldBg from './images/fish-world/fish-world.png'

interface FishWorld extends World{
  userAvatars: FishAvatars;
  sittingSpots: {
    x: number;
    sittingAvatarName: string | null;
  }[]
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
    this.sittingSpots = [{
      x: 70,
      sittingAvatarName: null
    },{
      x: 130,
      sittingAvatarName: null
    },{
      x: 190,
      sittingAvatarName: null
    },{
      x: 250,
      sittingAvatarName: null
    },{
      x: 310,
      sittingAvatarName: null
    },{
      x: 375,
      sittingAvatarName: null
    },]
  }

  feedNewData(
    users: (FishPlayers),
    emotes: EmoteReceived[],
    messages: Message[],
    commands: FrontendCommand[],
  ) {
    super.feedNewData(users, emotes, messages, commands)

    for (const [_id, user] of Object.entries(users)) {
      if (user.hasCaught) {
        this.userAvatars[user.username].fishStatus = FishAvatarStatus.SUCCESS
      }
    }
  }

  updateAvatars() {
    for (const spot of this.sittingSpots){
      if(!spot.sittingAvatarName) continue
      this.updateSingleAvatar(this.userAvatars[spot.sittingAvatarName])
      this.drawSingleAvatar(this.userAvatars[spot.sittingAvatarName])
    }
  }

  userDisappears(name: string) {
    this.sittingSpots.find(spot => spot.sittingAvatarName === name).sittingAvatarName = null
    delete this.userAvatars[name]
  }

  pickSittingSpotIndex(): number {
    const availableSpots = this.sittingSpots.filter(spot => spot.sittingAvatarName === null);
    if (!availableSpots){
      console.log('All sitting spots are occupied!')
      return 0
    }
    const spot = availableSpots[Math.floor(Math.random() * availableSpots.length)];
    return this.sittingSpots.indexOf(spot);
  }

  createNewUserAvatar(user: FishPlayer) {
    const skinSrc = SKINS.find(s => s.id === user.skin).avatarSource
    const spotIndex = this.pickSittingSpotIndex()
    const avatar = new FishAvatar(this, {
      id: user.id,
      name: user.username,
      display_name: user.display_name,
      color: user.color,
      x: this.sittingSpots[spotIndex].x,
      y: this.canvas.height - FISH_AVATAR_DISPLAY_SIZE - 25, // name display size
      src: skinSrc,
      displaySize: FISH_AVATAR_DISPLAY_SIZE,
      idleBehaviour: BEHAVIOURS.sit,
      currentAnimation: 'sit',
      fishWaitTime: user.fishWaitTime,
    })
    this.sittingSpots[spotIndex].sittingAvatarName = avatar.name
    console.log(this.sittingSpots)
    console.log(avatar)
    return avatar
  }
}