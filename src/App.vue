<script setup>
import ThreeGLBScene from "@/components/ThreeGLBScene.vue";
import NavBar from "@/components/NavBar.vue";
import ProductCatalog from "@/components/ProductCatalog.vue";
import {ref, onMounted} from 'vue'
import LoadingAnimation from "@/components/LoadingAnimation.vue";
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const loaded = ref(false);
const showScene = ref(false);

const handleLoadEnd = async function () {
  loaded.value = true;
  
  // Wait for loading screen to fade out completely (0.5s), then wait 1 second, then fade in scene
  setTimeout(() => {
    showScene.value = true;
  }, 500 + 1000); // Loading fade-out (500ms) + 1 second delay (1000ms)
}

onMounted(() => {
  const lenis = new Lenis()

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
    <div class="scene-container" :class="{ 'fade-in': showScene }">
      <ThreeGLBScene @loaded="handleLoadEnd"/>
    </div>
    <div class="loading-container" :class="{ 'fade-out': loaded }">
      <LoadingAnimation ref="loadingAnimationRef"/>
    </div>
    <ProductCatalog />
  </main>
</template>

<style scoped>
main {
  width: 100%;
  margin: 0;
  padding: 0;
}

.scene-container {
  opacity: 0;
  transition: opacity 0.6s ease;
  height: 100vh;
  width: 100%;
  position: relative;
  z-index: 1;
}

.scene-container.fade-in {
  opacity: 1;
}

.loading-container {
  opacity: 1;
  transition: opacity 0.5s ease;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 10000;
  background: var(--color-background);
  display: flex;
  justify-content: center;
  align-items: center;
}

.loading-container.fade-out {
  opacity: 0;
  pointer-events: none;
}
</style>
