<template>
  <div class="settings-page">
    <img src="..\images\cv-logo-800ms.gif">
    Settings
    <v-card variant="tonal">
      <v-list max-width="400">
        <v-list-item
          title="1. Create a Browser Source in your OBS."
        ></v-list-item>
        <v-list-item lines="three"
          title="2. Insert the URL, define the dimensions."
          subtitle="Walk Widget can have whatever dimensions you want, while Event Widget is hardcoded to 400x400, and Fish Widget is hardcoded to 550x320."
        ></v-list-item>
        <v-list-item
          title="3. Check the 'Use custom frame rate' checkbox, and set the FPS to 60."
        ></v-list-item>
      </v-list>
    </v-card>
    <v-btn variant="text" @click="copyWidgetURL(widgetNameEnum.WALK)">🐰 Copy your Walk Widget URL</v-btn>
    <v-btn variant="text" @click="copyWidgetURL(widgetNameEnum.EVENT)">🚤 Copy your Event Widget URL</v-btn>
    <v-btn variant="text" @click="copyWidgetURL(widgetNameEnum.FISH)">🎣 Copy your Fish Widget URL</v-btn>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue, Ref } from 'vue-facing-decorator'
import { WidgetName } from '../../../common/src/Types'
import router from '../router'

@Component
export default class SettingsView extends Vue {
  private channelUsername: string
  private walkWidgetId: string
  private eventWidgetId: string
  private fishWidgetId: string

  public widgetNameEnum = WidgetName

  public async mounted() {
    try {
      const resp = await fetch(`/api/cookie`)
      if (resp.status === 200) {
        const { channelUsername, walkWidgetId, eventWidgetId, fishWidgetId } = await resp.json()
        console.log('channelUsername is ' + channelUsername)
        this.channelUsername = channelUsername
        this.walkWidgetId = walkWidgetId
        this.eventWidgetId = eventWidgetId
        this.fishWidgetId = fishWidgetId
        } else {
        router.push('/')
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

  public copyWidgetURL(widgetName: WidgetName) {
    this.toClipboard(this.generateWidgetURL(widgetName))
  }

  private generateWidgetURL(widgetName: WidgetName) {
    let widgetId = ''
    switch (widgetName) {
      case WidgetName.WALK:
        widgetId = this.walkWidgetId
      case WidgetName.EVENT:
        widgetId = this.eventWidgetId
      case WidgetName.FISH:
        widgetId = this.fishWidgetId
    }
    return `http://localhost:5173/${widgetName}-widget/${this.channelUsername}/${widgetId}`
  }

  private toClipboard (s: string): void {
    const el = document.createElement('textarea');
    el.value = s;
    el.setAttribute('readonly', '');
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
  }
}
</script>

<style>
.settings-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
</style>