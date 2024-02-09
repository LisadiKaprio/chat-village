<template>
  <div class="event-widget">
    <img src="..\images\cv-logo-800ms.gif">
    <v-window class="information-window information-text mt-0 mx-6" v-model="tab" v-if="!isRacing">
      <v-window-item :value="eventTabEnum.RACE_INFORMATION">
        <div>🚤 Type !join to enter a race.</div>
        <div>
          <template v-if="participantsJoined === 0">💸 Type !join 200 to make a higher initial bet.</template>
          <template v-else>⭐ Current bet: {{ currentBet }} seastars</template>
        </div>
        <div>{{ participantsJoined === 0 ? '😎 Be the first one to start the race NOW!' : `🏃‍♂️ ${participantsJoined}
          player(s) already joined the race.` }}</div>
        <div v-if="participantsJoined > 0" class="boats">
          <img src="..\images\boats\boats.png" class="boats-scroller">
          <img src="..\images\boats\boats.png" class="boats-scroller">
        </div>
      </v-window-item>
      <v-window-item :value="eventTabEnum.INTERACTION_INFORMATION">
        <div>🤗 Type !hug @user to hug.</div>
        <div>🔨 Type !bonk @user to bonk.</div>
        <div>😘 You can hug/bonk without specifying who :)</div>
      </v-window-item>
      <v-window-item :value="eventTabEnum.FISH_INFORMATION">
        <div>🐠 Type fish to start fishing.</div>
        <div>🦘 Type fish to catch the fish when your character starts jumping!</div>
      </v-window-item>
      <v-window-item :value="eventTabEnum.DANCE_INFORMATION">
        <div>💃 Type !dance to start dancing.</div>
        <div>👯‍♀️ Type !dance 300 to spend more seastars and dance longer!</div>
      </v-window-item>
    </v-window>
    <canvas class="game-canvas" ref="gameCanvas" :style="!isRacing ? 'display: none' : ''" :height="windowHeight"
      :width="windowWidth"></canvas>
    <div v-if="isRacing" class="timer">{{ raceField.timer }} sec</div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Ref, Vue } from 'vue-facing-decorator'
import { RaceStatus, WebsocketMessageType, WidgetName } from '../../../common/src/Types'
import { verifyWidgetId } from '../functions'
import { assertExists } from '../Helpers'
import {
  CANVAS_MARGIN_VERTICAL,
  PLAYER_SPACE_VERTICAL,
  RaceField,
  CANVAS_WIDTH,
} from '../RaceField'
import { FRAMERATE, SECOND } from '../types/Types'

export enum EventTab {
  RACE_INFORMATION = 'race information',
  INTERACTION_INFORMATION = 'interaction information',
  FISH_INFORMATION = 'fish information',
  DANCE_INFORMATION = 'dance information',
}

@Component
export default class EventWidget extends Vue {
  @Ref('gameCanvas') private gameCanvas!: HTMLCanvasElement
  @Prop({ type: String, default: null }) public channel!: string | null
  @Prop({ type: String, default: null }) public id!: string | null
  public raceField: RaceField
  private then: number
  private fpsInterval = (SECOND / FRAMERATE)

  public currentBet = 0

  public eventTabEnum = EventTab

  public ws!: WebSocket
  public ws_host: string

  public tab = EventTab.RACE_INFORMATION
  public tabInterval: NodeJS.Timeout | null = null
  public TAB_SWITCH_MS = 20_000

  public async mounted(): Promise<void> {
    await verifyWidgetId(WidgetName.EVENT, this.channel, this.id)
    assertExists(this.gameCanvas)
    this.raceField = new RaceField(this.gameCanvas)
    this.ws_host = import.meta.env.VITE_WS_HOST ?? 'ws://localhost:2502'
    this.ws = new WebSocket(`${this.ws_host}/ws/${this.channel}`)
    this.ws.onmessage = (ev: any) => {
      const { type, data } = JSON.parse(ev.data)
      if (type === WebsocketMessageType.BACKEND_RACE_INFO) {
        const { bet, status, participants } = data
        this.currentBet = bet
        this.raceField.status = status
        if (status !== RaceStatus.OFF) this.raceField.participants = participants
        else this.raceField.participants = []
      }
    }

    let timeoutRaceResults: NodeJS.Timeout
    const sendRaceResults = () => {
      if (this.raceField.status === RaceStatus.FINISHING) {
        this.ws.send(JSON.stringify({ type: WebsocketMessageType.FRONTEND_RACE_INFO, data: { boatAvatars: this.raceField.backendBoatAvatars() } }))
        this.raceField.status = RaceStatus.OFF
        this.raceField.resetRace()
      }
      timeoutRaceResults = setTimeout(sendRaceResults, 2000)
    }
    sendRaceResults()
    this.startDrawing()

    this.tabInterval = setInterval(() => {
      this.switchInfoTab()
    }, this.TAB_SWITCH_MS)
  }

  public switchInfoTab() {
    if (this.participantsJoined) {
      this.tab = EventTab.RACE_INFORMATION
      return
    }
    const enumValues = Object.values(EventTab)
    const currentIndex = enumValues.indexOf(this.tab)
    const nextIndex = (currentIndex + 1) % enumValues.length
    this.tab = enumValues[nextIndex]
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
    if (this.raceField && this.raceField.participants) {
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
.event-widget {
  font-family: 'CherryBombOne-Regular';
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.timer {
  font-size: 24px;
  font-weight: bold;
  color: rgb(162, 228, 236);
  margin-left: 10px;
  text-shadow: 1px 1px 1px rgba(0, 0, 0, 0.5);
}

.information-window {
  max-width: 375px;
}

.information-text {
  margin: 4px;
  font-size: 24px;
  font-weight: bold;
  color: white;
  text-shadow: 1px 1px 3px black;
}

.boats {
  white-space: nowrap;
  margin: 8px 0;
  overflow: hidden;
}

.boats-scroller {
  animation: 15s slide-to-right infinite linear;
}

@keyframes slide-to-right {
  0% {
    transform: translateX(-100%);
  }

  100% {
    transform: translateX(0%);
  }
}
</style>
