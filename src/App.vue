<script setup>
import NavBar from "@/components/NavBar.vue";
import { onMounted } from 'vue'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { setLenis } from '@/lenis'

gsap.registerPlugin(ScrollTrigger)

onMounted(() => {
  const lenis = new Lenis()
  setLenis(lenis)

  lenis.on('scroll', ScrollTrigger.update)

  gsap.ticker.add((time) => {
    lenis.raf(time * 1000)
  })

  gsap.ticker.lagSmoothing(0)
})
</script>

<template>
  <main>
    <NavBar/>
    <router-view />
  </main>
</template>

<style scoped>
main {
  width: 100%;
  margin: 0;
  padding: 0;
  min-height: 100vh;
}
</style>
