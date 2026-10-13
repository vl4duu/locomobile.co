<script setup>
import ThreeGLBScene from "@/components/ThreeGLBScene.vue";
import ProductCatalog from "@/components/ProductCatalog.vue";
import {ref} from 'vue'
import LoadingAnimation from "@/components/LoadingAnimation.vue";

const loaded = ref(false);
const showScene = ref(false);

const handleLoadEnd = async function () {
  loaded.value = true;
  
  // Wait for loading screen to fade out completely (0.5s), then wait 1 second, then fade in scene
  setTimeout(() => {
    showScene.value = true;
  }, 500 + 1000); // Loading fade-out (500ms) + 1 second delay (1000ms)
}
</script>

<template>
  <div class="home-view">
    <div class="scene-container" :class="{ 'fade-in': showScene }">
      <ThreeGLBScene @loaded="handleLoadEnd"/>
    </div>
    <div class="loading-container" :class="{ 'fade-out': loaded }">
      <LoadingAnimation ref="loadingAnimationRef"/>
    </div>
    <ProductCatalog />
  </div>
</template>

<style scoped>
.home-view {
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
  background: #000; /* Assuming black based on context */
  display: flex;
  justify-content: center;
  align-items: center;
}

.loading-container.fade-out {
  opacity: 0;
  pointer-events: none;
}
</style>
