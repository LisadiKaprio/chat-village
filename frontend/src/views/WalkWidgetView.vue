<template>
  <div class="about">
    <h1>{{ channel }}</h1>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-facing-decorator'
import { PlayerState } from '../../../common/src/Types'

@Component
export default class WalkWidget extends Vue {
  @Prop({ type: String, default: null }) public channel!: string | null
  private a = PlayerState.ACTIVE

  public mounted (): void {
    // console.log('a')
    console.log(this.channel + this.a)
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
