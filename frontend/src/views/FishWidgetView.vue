<template>
  <div class="game-container" ref="gameContainer">
    <canvas class="game-canvas" ref="gameCanvas" :height="FISH_CANVAS_HEIGHT" :width="FISH_CANVAS_WIDTH"></canvas>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue, Ref } from 'vue-facing-decorator'
// import { PlayerState } from '../../../common/src/Types'
import { useRoute } from 'vue-router'
import { assertExists } from '../Helpers'
import { World } from '../World'
import { FRAMERATE, SECOND, ServerResponse, UPDATE_PERIOD } from '../types/Types'
import dotenv from 'dotenv'
import { WebsocketMessageType } from '../../../common/src/Types'
import { FishField } from '../FishField'

@Component
export default class FishWidget extends Vue {
  @Ref('gameContainer') private gameContainer!: HTMLElement
  @Ref('gameCanvas') private gameCanvas!: HTMLCanvasElement
  private interval: NodeJS.Timeout | null = null
  @Prop({ type: String, default: null }) public channel!: string | null
  private route = useRoute()
  // public gameContainer = document.querySelector('.game-container')
  public fishField: FIshField
  private then: number
  private fpsInterval = (SECOND / FRAMERATE)

  public ws!: WebSocket
  public ws_host: string

  public FISH_CANVAS_HEIGHT = 400
  public FISH_CANVAS_WIDTH = 600

  public async mounted (): Promise<void> {
    this.ws_host = import.meta.env.VITE_WS_HOST ?? 'localhost'
    this.ws = new WebSocket(`ws://${this.ws_host}:2502/${this.channel}`)
    this.ws.onmessage = (ev: any) => {
      const { type, data } = JSON.parse(ev.data)
      if (type === WebsocketMessageType.BACKEND_FISH_WAIT_TIME_INFO) {
        const { allFishStates } = data
        this.fishField.feedFishData(allFishStates)
      }
    }
    assertExists(this.gameContainer)
    assertExists(this.gameCanvas)
    this.fishField = new FishField(this.gameContainer, this.gameCanvas)
    this.startDrawing()
  }

  public startDrawing() {
    this.then = window.performance.now()
    this.drawAtFramerate()
  }

  public drawAtFramerate() {
    const now = window.performance.now()
    const elapsed = now - this.then
    if (elapsed > this.fpsInterval) {
      this.then = now - (elapsed % this.fpsInterval)
      this.world.update()
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

body{
  padding: 0;
  margin: 0;
  /* prevents unwanted scrolling */
  overflow: hidden;
}

.game-container{
  font-family: 'CherryBombOne-Regular';
  position: relative;
  padding: 0;
  margin: 0 auto;
  /* ideally, i want the game to snap 
  to the bottom of the page
  it doesn't do it yet, 
  the body snaps to top and limits height 
  to the height of the canvas... */
  /* margin-top: 20px; */
}
</style>
