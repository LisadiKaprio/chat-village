import { BackendBoatAvatar, RaceParticipant, RaceParticipants, RaceStatus } from '../../common/src/Types.js'
import { BoatAvatar } from './BoatAvatar.js'
import { SKINS } from './Visuals'
import { assertExists } from './Helpers.js'
import seaBg from './images/sea-bg.png'
import { ANIMATIONS, Sprite } from './Sprite.js'

import boatMask from './images/boats/boat-MASK.png'

export const BOAT_AVATAR_DISPLAY_SIZE = 50
export const HORIZONTAL_LINE_WIDTH = 2
export const VERTICAL_LINE_WIDTH = 2
export const MAX_PARTICIPANTS = 4
export const PLAYER_SPACE_VERTICAL = BOAT_AVATAR_DISPLAY_SIZE
export const PLAYER_MARGIN_TOP = 2
export const PLAYER_MARGIN_BOTTOM = 2
export const RACE_LENGTH_HORIZONTAL = 325
export const CANVAS_MARGIN_VERTICAL = 5
export const CANVAS_MARGIN_HORIZONTAL = 5
export const USERNAME_HORIZONTAL_MARGIN = CANVAS_MARGIN_HORIZONTAL + 20
export const CANVAS_WIDTH = RACE_LENGTH_HORIZONTAL + (CANVAS_MARGIN_HORIZONTAL * 2)

export interface RaceField {
  bg: Sprite
  element: Element;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  currentRaceBg: CanvasImageSource | null;
  participants: RaceParticipants;
  status: RaceStatus;
  avatars: BoatAvatars;
  globalStartDate: number;
  distance: number;
  allFinished: boolean;
  timer: number;
}

type BoatAvatars = {
  [name: string]: BoatAvatar;
};


export class RaceField {
    constructor(canvas: HTMLCanvasElement) {
      this.bg = new Sprite({
        src: seaBg,
        displaySize: 400,
        cutSize: 542,
        animations: {
          idle: ANIMATIONS.static,
        },
      })
      this.canvas = canvas
      const context = canvas.getContext('2d')
      assertExists(context)
      this.ctx = context
      this.participants = {}
      this.status = RaceStatus.OFF
      this.avatars = {}
      this.globalStartDate = 0
      this.distance = RACE_LENGTH_HORIZONTAL - BOAT_AVATAR_DISPLAY_SIZE
    }

    buildCurrentRaceBg(): CanvasImageSource | null {
      const tmpCanvas = document.createElement('canvas')
      tmpCanvas.width = this.canvas.width
      tmpCanvas.height = this.canvas.height
      const tmpCtx = tmpCanvas.getContext('2d')

      // weirdly sprites can fail to render, which leaves the bg blank
      // in that case return null
      const drawn = this.bg.draw(tmpCtx)
      // if (!drawn) {
      //   return null
      // }

      tmpCtx.lineWidth = HORIZONTAL_LINE_WIDTH;
      tmpCtx.strokeStyle = "white";
      tmpCtx.font = '30px CherryBombOne-Regular'
      tmpCtx.fillStyle = "rgba(255, 255, 255, 0.75)"
      this.drawLine(tmpCtx, CANVAS_MARGIN_HORIZONTAL, CANVAS_MARGIN_VERTICAL, CANVAS_WIDTH - CANVAS_MARGIN_HORIZONTAL, CANVAS_MARGIN_VERTICAL)
      this.drawLine(tmpCtx, CANVAS_WIDTH - CANVAS_MARGIN_HORIZONTAL - BOAT_AVATAR_DISPLAY_SIZE, CANVAS_MARGIN_VERTICAL, CANVAS_WIDTH - CANVAS_MARGIN_HORIZONTAL - BOAT_AVATAR_DISPLAY_SIZE, 500 - CANVAS_MARGIN_VERTICAL)
      for (const avatar of Object.values(this.avatars)) {
        tmpCtx.fillText(
          avatar.display_name,
          USERNAME_HORIZONTAL_MARGIN,
          avatar.y + (PLAYER_SPACE_VERTICAL / 2) + PLAYER_MARGIN_TOP + (PLAYER_SPACE_VERTICAL / 4),
          this.distance
        )
        this.drawLine(tmpCtx, CANVAS_MARGIN_HORIZONTAL, avatar.y + PLAYER_SPACE_VERTICAL + PLAYER_MARGIN_BOTTOM - HORIZONTAL_LINE_WIDTH, CANVAS_WIDTH - CANVAS_MARGIN_HORIZONTAL, avatar.y + PLAYER_SPACE_VERTICAL + PLAYER_MARGIN_BOTTOM - HORIZONTAL_LINE_WIDTH)
      }
      return tmpCanvas
    }

    startRace() {
      const entries = Object.entries(this.participants);
      this.globalStartDate = Date.now();
      for (let i = 0; i < entries.length; i++) {
        const [name, participant] = entries[i];
        this.avatars[name] = this.createNewBoatAvatar(this, participant, i);
      }
    }

    resetRace() {
      this.avatars = {}
      this.participants = {}
      this.globalStartDate = 0
      this.timer = 0
    }

    update() {
      if (this.status === RaceStatus.FINISHING) return
      this.timer = +((Date.now() - this.globalStartDate) / 1_000).toFixed(0)
      if (Object.keys(this.avatars).length !== 0 && Object.values(this.avatars).find(a => a.finishTimeMs !== 0)) {
        this.status = RaceStatus.FINISHING
        this.currentRaceBg = null
      }// stop everything

      if (this.status === RaceStatus.RACING && this.globalStartDate === 0) {
        this.startRace()
        this.currentRaceBg = this.buildCurrentRaceBg()
      }
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

      for (const avatar of Object.values(this.avatars)) {
        avatar.speed = Object.values(this.participants).find(p => p.username === avatar.name).speed
        avatar.update(this.globalStartDate)
      }
    }

    draw() {
      if (!this.currentRaceBg) return
      this.ctx.drawImage(this.currentRaceBg, 0, 0)
      for (const avatar of Object.values(this.avatars)) {
        avatar.draw(this.ctx)
      }}

    drawLine(ctx: CanvasRenderingContext2D, startX: number, startY: number, endX: number, endY: number) {
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }
    
    createNewBoatAvatar(raceField: RaceField, participant: RaceParticipant, index: number) {
      const y = CANVAS_MARGIN_VERTICAL + PLAYER_MARGIN_TOP + (index * PLAYER_SPACE_VERTICAL)
      const skinSrc = SKINS.find(s => s.id === participant.skin).boatSource
      const boatAvatar = new BoatAvatar(raceField, {
        name: participant.username,
        display_name: participant.display_name,
        color: participant.color,
        speed: participant.speed,
        x: CANVAS_MARGIN_HORIZONTAL,
        y: y,
        src: skinSrc,
        mask: boatMask,
        cutSize: 50,
        displaySize: BOAT_AVATAR_DISPLAY_SIZE,
      })
      return boatAvatar
    }

    backendBoatAvatars(): BackendBoatAvatar[] {
      const arrayToReturn = []
      for (const avatar of Object.values(this.avatars)) {
        arrayToReturn.push(avatar.backendBoatAvatar())
      }
      return arrayToReturn.sort((a, b) => a.finishTimeMs - b.finishTimeMs);
    }
}