<template>
  <div class="home-page">
    <img src="..\images\cv-logo-800ms.gif">
    <v-btn color="purple" @click="redirectToTwitch()">Login with Twitch</v-btn>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue, Ref } from 'vue-facing-decorator'
import dotenv from 'dotenv'
import router from '../router'

@Component
export default class HomeView extends Vue {
  public async mounted() {
    try {
      const resp = await fetch(`/api/cookie`)
      if (resp.status === 200) {
        router.push('/settings')
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
  }
  
  public get twitchUrl(): string {
    const clientId = import.meta.env.CLIENT_ID ?? 'aj9tlcon6jociugd4o9k3co55dprnd'
    const clientRedirectUri = import.meta.env.CLIENT_REDIRECT_URI ?? 'http://localhost:5173/twitch/redirect_uri'

    return `https://id.twitch.tv/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${clientRedirectUri}&scope=user%3Aread%3Abroadcast`
  }

  public redirectToTwitch(): void {
      window.location.href = this.twitchUrl;
  }
}
</script>

<style>
.home-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
</style>