<template>
  <div class="game-container" ref="gameContainer">
    <canvas class="game-canvas" ref="gameCanvas" width="1920" height="1080"> </canvas>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue, Ref } from 'vue-facing-decorator'
// import { PlayerState } from '../../../common/src/Types'
import { useRoute } from 'vue-router'
import { assertExists } from '../Helpers'
import { World } from '../World'
import { ServerResponse, UPDATE_PERIOD } from '../types/Types'

@Component
export default class WalkWidget extends Vue {
  @Ref('gameContainer') private gameContainer!: HTMLElement
  @Ref('gameCanvas') private gameCanvas!: HTMLCanvasElement
  private interval: NodeJS.Timeout | null = null
  @Prop({ type: String, default: null }) public channel!: string | null
  private route = useRoute()
  // public gameContainer = document.querySelector('.game-container')
  public world: World

  public async mounted (): Promise<void> {
    assertExists(this.gameContainer)
    assertExists(this.gameCanvas)
    this.world = new World(this.gameContainer, this.gameCanvas)
    // this.interval = setInterval(() => {
    // }, UPDATE_PERIOD);
    await this.fetchUsers()
    console.log('users fetched')
    requestAnimationFrame(this.step)
    console.log('animation frame requested')
  }

  public async fetchUsers(): Promise<void> {
    // fetch the users, emotes and messages from the server.
    try {
      const resp = await fetch(`http://localhost:2501/users/${this.channel}`)
      // const a = await resp.text()
      const { users, emotes, messages } = (await resp.json()) as ServerResponse

      // update the world with the data from the server.
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

  public step(timestep: number) {
    this.world.update(timestep)
    requestAnimationFrame(this.step)
  }
}
</script>

<style>
@media (min-width: 1024px) {
  .about {
    min-height: 100vh;
    display: flex;
    align-items: center;
  }
}
</style>
