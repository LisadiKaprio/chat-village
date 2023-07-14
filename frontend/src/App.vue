<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <RouterView />
</template>

<style>

@font-face {
  font-family: 'CherryBombOne-Regular';
  src: url('../fonts/CherryBombOne-Regular.ttf');
  font-weight: normal;
  font-style: normal;
}

#app {
  padding: 0px 0px !important;
}

body{
  padding: 0;
  margin: 0;
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
