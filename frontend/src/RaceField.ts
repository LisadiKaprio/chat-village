import { RaceParticipants } from '../../common/src/Types.js'
import { assertExists } from './Helpers.js'


export interface RaceField {
    element: Element;
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    participants: RaceParticipants;
  }

export class RaceField {
    constructor(gameContainer: HTMLElement, canvas: HTMLCanvasElement) {
      this.element = gameContainer
      this.canvas = canvas
      const context = canvas.getContext('2d')
      assertExists(context)
      this.ctx = context
    }
}