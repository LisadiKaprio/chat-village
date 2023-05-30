<template>
  <div class="game-container" ref="gameContainer">
    
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-facing-decorator'
import { RaceField } from '../RaceField'

@Component
export default class EventWidget extends Vue {
  @Prop({ type: String, default: null }) public channel!: string | null
  public raceField: RaceField

  public async fetchRace(): Promise<void> {
    // fetch the users, emotes and messages from the server.
    try {
      const resp = await fetch(`/api/race/${this.channel}`)
      // const a = await resp.text()
      const { participants } = await resp.json()
      this.raceField.participants = participants
    } catch (error: unknown) {
      if (
        error instanceof TypeError &&
        error.message.startsWith('NetworkError')
      ) {
        // TODO: a disconnect icon or loading message.
        console.log('No race...')
      } else {
        throw error
      }
    }

    // queue the next server request
    setTimeout(this.fetchUsers, UPDATE_PERIOD)
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
