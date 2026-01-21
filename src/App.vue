<script setup>
import NavBar from "@/components/NavBar.vue";
import HomeView from "@/views/HomeView.vue";
import ProductDetailsView from "@/views/ProductDetailsView.vue";
import PayList from "@/views/PayList.vue";
import { navigation } from "@/navigation";
import { onMounted, watch, nextTick } from 'vue'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

onMounted(() => {
  const lenis = new Lenis()
  navigation.setLenis(lenis)

  lenis.on('scroll', ScrollTrigger.update)

  gsap.ticker.add((time) => {
    lenis.raf(time * 1000)
  })

  gsap.ticker.lagSmoothing(0)
})

watch(() => navigation.currentView, () => {
  nextTick(() => {
    ScrollTrigger.refresh()
  })
})
</script>

<template>
  <main>
    <NavBar/>
    <HomeView v-if="navigation.currentView === 'home'" />
    <ProductDetailsView v-if="navigation.currentView === 'product-details'" :id="navigation.params.id" />
    <PayList v-if="navigation.currentView === 'pay-list'" />
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
