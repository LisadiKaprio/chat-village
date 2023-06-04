<template>
  <div class="event-widget">
    <div v-if="!isRacing" class="advices-container">Type !join to enter a race.</div> 
    <canvas class="game-canvas" ref="gameCanvas" :height="windowHeight" :width="windowWidth"></canvas>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Ref, Vue } from 'vue-facing-decorator'
import { RaceStatus } from '../../../common/src/Types'
import { assertExists } from '../Helpers'
import { 
  CANVAS_MARGIN_VERTICAL,
  PLAYER_SPACE_VERTICAL,
  RACE_LENGTH_HORIZONTAL,
  CANVAS_MARGIN_HORIZONTAL,
  RaceField,
} from '../RaceField'
import { FRAMERATE, SECOND, UPDATE_PERIOD_FAST } from '../types/Types'

@Component
export default class EventWidget extends Vue {
  @Ref('gameCanvas') private gameCanvas!: HTMLCanvasElement
  @Prop({ type: String, default: null }) public channel!: string | null
  public raceField: RaceField
  private then: number
  private fpsInterval = (SECOND / FRAMERATE)

  public async mounted (): Promise<void> {
    assertExists(this.gameCanvas)
    this.raceField = new RaceField(this.gameCanvas)
    await this.fetchRace()
    this.startDrawing()
  }

  public get isRacing(): boolean {
    if (!this.raceField) return false
    return this.raceField.status === RaceStatus.RACING
  }

  public get isFinishingRace(): boolean {
    if (!this.raceField) return false
    return this.raceField.status === RaceStatus.FINISHING
  }

  public get raceStatus(): RaceStatus {
    if (!this.raceField) return RaceStatus.OFF
    return this.raceField.status
  }
  
  public get windowHeight(): number {
    if (!this.raceField || this.raceField.status === RaceStatus.OFF) return 0
    if(this.raceField && this.raceField.participants) {
      const playerSpace = PLAYER_SPACE_VERTICAL * Object.keys(this.raceField.participants).length
      return playerSpace + (CANVAS_MARGIN_VERTICAL * 2)
    } else return 10
  }

  public get windowWidth(): number {
    return RACE_LENGTH_HORIZONTAL + (CANVAS_MARGIN_HORIZONTAL * 2)
  }

  public async fetchRace(): Promise<void> {
    try {
      const resp = await fetch(`/api/race/${this.channel}`)
      if (resp.status === 200) {
        const { status, participants } = await resp.json()
        this.raceField.status = status
        if ( status !== RaceStatus.OFF ) this.raceField.participants = participants
      }
    } catch (error: unknown) {
      if (
        error instanceof TypeError &&
        error.message.startsWith('NetworkError')
      ) {
        // TODO: a disconnect icon or loading message.
      } else {
        throw error
      }
    }
    setTimeout(this.fetchRace, UPDATE_PERIOD_FAST)
  }

  public async notifyFinish(): Promise<void> {
    const resp = await fetch(`/api/race-result/${this.channel}`, {
      method: 'POST',
      body: JSON.stringify(this.raceField)
    })
  }

  public startDrawing() {
    // TODO: optimize with websocket to not draw when no race
    this.then = window.performance.now()
    this.drawAtFramerate()
  }

  public drawAtFramerate() {
    const now = window.performance.now()
    const elapsed = now - this.then
    if (elapsed > this.fpsInterval) {
      this.then = now - (elapsed % this.fpsInterval)
      this.raceField.update()
    }
    requestAnimationFrame(this.drawAtFramerate)
  }
    
}
</script>

<style>
@font-face {
  font-family: 'VictorMono-Medium';
  src: url('../fonts/VictorMono-Medium.woff2') format('woff2');
  font-weight: normal;
  font-style: normal;
}
/* canvas{
  width: 500px;
  height: 500px;
} */

body {
  font-family: 'VictorMono-Medium';
  padding: 0;
  margin: 0;
  /* prevents unwanted scrolling */
  overflow: hidden;
}

.advices-container {
  margin: 4px;
  font-weight: bold;
  color: white;
  text-shadow: 1px 1px 3px black;
}

.game-container {
  position: relative;
  padding: 0;
  margin: 0 auto;
}
</style>
