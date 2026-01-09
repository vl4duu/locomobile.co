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
    <Transition name="fade" appear>
      <div class="loading-container" :class="{ 'fade-out': loaded }">
        <LoadingAnimation ref="loadingAnimationRef"/>
      </div>
    </Transition>
  </main>
</template>

<style scoped>
.scene-container {
  opacity: 0;
  transition: opacity 0.6s ease;
}

.scene-container.fade-in {
  opacity: 1;
}

.loading-container {
  opacity: 1;
  transition: opacity 0.5s ease;
}

.loading-container.fade-out {
  opacity: 0;
  pointer-events: none;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.6s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
