import { RaceParticipant, RaceParticipants, RaceStatus } from '../../common/src/Types.js'
import { BoatAvatar } from './BoatAvatar.js'
import { assertExists } from './Helpers.js'

export const PLAYER_SPACE_VERTICAL = 150
export const PLAYER_MARGIN_TOP = 15
export const PLAYER_MARGIN_BOTTOM = 135
export const RACE_LENGTH_HORIZONTAL = 800
export const CANVAS_MARGIN_VERTICAL = 75
export const CANVAS_MARGIN_HORIZONTAL = 75
export const AVATAR_DISPLAY_SIZE = 75

export interface RaceField {
  element: Element;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  participants: RaceParticipants;
  status: RaceStatus;
  avatars: BoatAvatars;
  hasStarted: boolean;
  distance: number;
  allFinished: boolean;
}

type BoatAvatars = {
  [name: string]: BoatAvatar;
};


export class RaceField {
    constructor(canvas: HTMLCanvasElement) {
      this.canvas = canvas
      const context = canvas.getContext('2d')
      assertExists(context)
      this.ctx = context
      this.participants = {}
      this.status = RaceStatus.OFF
      this.avatars = {}
      this.hasStarted = false
      this.distance = RACE_LENGTH_HORIZONTAL - AVATAR_DISPLAY_SIZE
    }

    startRace() {
      const entries = Object.entries(this.participants);
      for (let i = 0; i < entries.length; i++) {
        const [name, participant] = entries[i];
        this.avatars[name] = this.createNewBoatAvatar(this, participant, i);
      }
    }

    resetRace() {
      this.avatars = {}
      this.hasStarted = false
    }

    update() {
      if (this.status === RaceStatus.FINISHING) return
      if (Object.keys(this.avatars).length !== 0 && Object.values(this.avatars).every(a => a.isFinished)) {
        this.status = RaceStatus.FINISHING
      }// stop everything

      if (this.status === RaceStatus.RACING && !this.hasStarted) {
        this.startRace()
        this.hasStarted = true;
      }
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

      for (const avatar of Object.values(this.avatars)) {
        avatar.update()
        avatar.draw(this.ctx)
      }
    }
    
    createNewBoatAvatar(raceField: RaceField, participant: RaceParticipant, index: number) {
      const y = CANVAS_MARGIN_VERTICAL + PLAYER_MARGIN_TOP + (index * PLAYER_SPACE_VERTICAL)
      const boatAvatar = new BoatAvatar(raceField, {
        name: participant.username,
        display_name: participant.display_name,
        color: participant.color,
        speed: participant.speed,
        x: CANVAS_MARGIN_HORIZONTAL,
        y: y,
        src: template,
        displaySize: AVATAR_DISPLAY_SIZE,
      })
      return boatAvatar
    }
}