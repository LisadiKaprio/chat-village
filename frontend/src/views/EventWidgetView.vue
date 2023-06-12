<template>
  <div class="event-widget">
    <div v-if="!isRacing" class="advices-container">Type !join to enter a race.</div> 
    <div v-if="!isRacing" class="advices-container">Type !join 200 to make a higher initial bet.</div> 
    <div v-if="!isRacing" class="advices-container">{{ participantsJoined === 0 ? 'Be the first one to start the race NOW!' : `${participantsJoined} player(s) already joined the race.` }}</div> 
    <canvas class="game-canvas" ref="gameCanvas" :style="!isRacing ? 'display: none' : ''" :height="windowHeight" :width="windowWidth"></canvas>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Ref, Vue } from 'vue-facing-decorator'
import { RaceStatus, WebsocketMessageType } from '../../../common/src/Types'
import { assertExists } from '../Helpers'
import { 
  CANVAS_MARGIN_VERTICAL,
  PLAYER_SPACE_VERTICAL,
  RACE_LENGTH_HORIZONTAL,
  CANVAS_MARGIN_HORIZONTAL,
  RaceField,
CANVAS_WIDTH,
} from '../RaceField'
import { FRAMERATE, SECOND, UPDATE_PERIOD_FAST } from '../types/Types'

@Component
export default class EventWidget extends Vue {
  @Ref('gameCanvas') private gameCanvas!: HTMLCanvasElement
  @Prop({ type: String, default: null }) public channel!: string | null
  public raceField: RaceField
  private then: number
  private fpsInterval = (SECOND / FRAMERATE)

  public ws!: WebSocket
  public ws_host: string

  public async mounted (): Promise<void> {
    assertExists(this.gameCanvas)
    this.raceField = new RaceField(this.gameCanvas)
    this.ws_host = import.meta.env.VITE_WS_HOST ?? 'localhost'
    this.ws = new WebSocket(`ws://${this.ws_host}:2502/${this.channel}`)
    this.ws.onmessage = (ev: any) => {
      const { type, data } = JSON.parse(ev.data)
      if (type === WebsocketMessageType.BACKEND_RACE_INFO) {
        const { status, participants } = data
        this.raceField.status = status
        if ( status !== RaceStatus.OFF ) this.raceField.participants = participants
      }
    }

    let timeoutRaceResults: NodeJS.Timeout
    const sendRaceResults = () => {
      if (this.raceField.status === RaceStatus.FINISHING) {
        this.ws.send(JSON.stringify({ type: WebsocketMessageType.FRONTEND_RACE_INFO, data: { boatAvatars: this.raceField.backendBoatAvatars() }}))
        this.raceField.status = RaceStatus.OFF
        this.raceField.resetRace()
      }
      timeoutRaceResults = setTimeout(sendRaceResults, 2000)
    }
    sendRaceResults()

    this.startDrawing()
  }

  public get participantsJoined(): number {
    if (!this.raceField) return 0
    if (!this.raceField.participants) return 0
    return Object.keys(this.raceField.participants).length
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
    } else return 0
  }

  public get windowWidth(): number {
    return CANVAS_WIDTH
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
      this.raceField.draw()
    }
    requestAnimationFrame(this.drawAtFramerate)
  }
    
}
</script>

<style>
@font-face {
  font-family: 'CherryBombOne-Regular';
  src: url('../fonts/CherryBombOne-Regular.ttf');
  font-weight: normal;
  font-style: normal;
}
/* canvas{
  width: 500px;
  height: 500px;
} */

body {
  font-family: 'CherryBombOne-Regular';
  padding: 0;
  margin: 0;
  /* prevents unwanted scrolling */
  overflow: hidden;
}

.advices-container {
  max-width: 400px;
  margin: 4px;
  font-size: 24px;
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
