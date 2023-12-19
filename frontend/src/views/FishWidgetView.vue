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
import { FishAvatarStatus, UserInfo, WebsocketMessageType, WidgetName } from '../../../common/src/Types'
import { FishWorld } from '../FishWorld'
import { verifyWidgetId } from '../functions'

@Component
export default class FishWidget extends Vue {
  @Ref('gameContainer') private gameContainer!: HTMLElement
  @Ref('gameCanvas') private gameCanvas!: HTMLCanvasElement
  private interval: NodeJS.Timeout | null = null
  @Prop({ type: String, default: null }) public channel!: string | null
  @Prop({ type: String, default: null }) public id!: string | null
  private route = useRoute()
  // public gameContainer = document.querySelector('.game-container')
  public fishWorld: FishWorld
  private then: number
  private fpsInterval = (SECOND / FRAMERATE)

  public ws!: WebSocket
  public ws_host: string

  public FISH_CANVAS_HEIGHT = 230
  public FISH_CANVAS_WIDTH = 550

  public async mounted (): Promise<void> {
    await verifyWidgetId(WidgetName.FISH, this.channel, this.id)
    assertExists(this.gameContainer)
    assertExists(this.gameCanvas)
    this.fishWorld = new FishWorld(this.gameContainer, this.gameCanvas)

    this.ws_host = import.meta.env.VITE_WS_HOST ?? 'ws://localhost:2502'
    this.ws = new WebSocket(`${this.ws_host}/ws/${this.channel}`)
    this.ws.onmessage = (ev: any) => {
      const { type, data } = JSON.parse(ev.data)
      if (type === WebsocketMessageType.USER_INFO) {
        const userInfo: UserInfo = data
        this.fishWorld.feedNewData(userInfo.fishPlayers, userInfo.emotes, userInfo.messages, userInfo.commands)
      }
    }

    let timeoutFishCatchMessage: NodeJS.Timeout
    const sendFishCatchMessage = () => {
      const isWebsocketStillConnecting = this.ws.readyState === 0
      const catchingAvatars = Object.values(this.fishWorld.userAvatars).filter(avatar => avatar.fishStatus === FishAvatarStatus.CATCHING)
      if (!catchingAvatars || isWebsocketStillConnecting) {
        timeoutFishCatchMessage = setTimeout(sendFishCatchMessage, 2000)
        return
      }
      const catchingAvatarIds = catchingAvatars.map(avatar => avatar.id)
      this.ws.send(JSON.stringify({ type: WebsocketMessageType.FRONTEND_FISH_CATCHING_INFO, data: { avatarIds: catchingAvatarIds }}))
      // console.log(catchingAvatars)fishStatus
      for (const avatar of catchingAvatars) {
        this.fishWorld.userAvatars[avatar.name].fishStatus = FishAvatarStatus.WAITING_FOR_CATCH
      }
      timeoutFishCatchMessage = setTimeout(sendFishCatchMessage, 2000)
    }
    sendFishCatchMessage()

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
      this.fishWorld.update()
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
</style>
