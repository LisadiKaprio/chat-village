<template>
  <div class="game-container" ref="gameContainer">
    <canvas class="game-canvas" ref="gameCanvas" :height="windowHeight" :width="windowWidth"></canvas>
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
import { WebsocketMessageType, UserInfo, WidgetName } from '../../../common/src/Types'
import router from '../router'
import { verifyWidgetId } from '../functions'

@Component
export default class WalkWidget extends Vue {
  @Ref('gameContainer') private gameContainer!: HTMLElement
  @Ref('gameCanvas') private gameCanvas!: HTMLCanvasElement
  private interval: NodeJS.Timeout | null = null
  @Prop({ type: String, default: null }) public channel!: string | null
  @Prop({ type: String, default: null }) public id!: string | null
  private route = useRoute()
  // public gameContainer = document.querySelector('.game-container')
  public world: World
  private then: number
  private fpsInterval = (SECOND / FRAMERATE)

  public ws!: WebSocket
  public ws_host: string

  public async mounted(): Promise<void> {
    await verifyWidgetId(WidgetName.WALK, this.channel, this.id)

    this.ws_host = import.meta.env.VITE_WS_HOST ?? 'ws://localhost:2502'
    this.ws = new WebSocket(`${this.ws_host}/ws/${this.channel}`)
    this.ws.onmessage = (ev: any) => {
      const { type, data } = JSON.parse(ev.data)
      if (type === WebsocketMessageType.USER_INFO) {
        const userInfo: UserInfo = data
        this.world.feedNewData(userInfo.users, userInfo.emotes, userInfo.messages, userInfo.commands)
      }
    }
    assertExists(this.gameContainer)
    assertExists(this.gameCanvas)
    this.world = new World(this.gameContainer, this.gameCanvas)
    // this.resizeCanvasToDisplaySize()
    this.startDrawing()
  }

  public get windowWidth(): number {
    return window.innerWidth
  }

  public get windowHeight(): number {
    return window.innerHeight
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

  // public step(timestep: number) {
  //   this.world.update(timestep)
  //   requestAnimationFrame(this.step)
  // }
}
</script>

<style>
@font-face {
  font-family: 'CherryBombOne-Regular';
  src: url('../fonts/CherryBombOne-Regular.ttf');
  font-weight: normal;
  font-style: normal;
}
</style>
