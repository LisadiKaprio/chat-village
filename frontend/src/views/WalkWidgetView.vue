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

@Component
export default class WalkWidget extends Vue {
  @Ref('gameContainer') private gameContainer!: HTMLElement
  @Ref('gameCanvas') private gameCanvas!: HTMLCanvasElement
  private interval: NodeJS.Timeout | null = null
  @Prop({ type: String, default: null }) public channel!: string | null
  private route = useRoute()
  // public gameContainer = document.querySelector('.game-container')
  public world: World
  private then: number
  private fpsInterval = (SECOND / FRAMERATE)

  // public ws = new WebSocket('ws://localhost:2502')

  public async mounted (): Promise<void> {
    // if (this.ws) {
    //   this.ws.onmessage = (ev: any) => {
    //       console.log(ev)
    //   }
    // }
    assertExists(this.gameContainer)
    assertExists(this.gameCanvas)
    this.world = new World(this.gameContainer, this.gameCanvas)
    await this.fetchUsers()
    // this.resizeCanvasToDisplaySize()
    this.startDrawing()
  }

  public get windowWidth(): number {
    return window.innerWidth
  }

  public get windowHeight(): number {
    return window.innerHeight
  }

  public async fetchUsers(): Promise<void> {
    try {
      const resp = await fetch(`/api/users/${this.channel}`)
      const { users, emotes, messages } = (await resp.json()) as ServerResponse
      this.world.feedNewData(users, emotes, messages)
    } catch (error: unknown) {
      if (
        error instanceof TypeError &&
        error.message.startsWith('NetworkError')
      ) {
        // TODO: a disconnect icon or loading message.
        console.error("Server didn't respond!")
      } else {
        throw error
      }
    }

    // queue the next server request
    setTimeout(this.fetchUsers, UPDATE_PERIOD)
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
  font-family: 'VictorMono-Medium';
  src: url('../fonts/VictorMono-Medium.woff2') format('woff2');
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
  font-family: 'VictorMono-Medium';
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
