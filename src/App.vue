<script setup>
import ThreeGLBScene from "@/components/ThreeGLBScene.vue";
import NavBar from "@/components/NavBar.vue";
import {ref} from 'vue'
import LoadingAnimation from "@/components/LoadingAnimation.vue";
import ApiTest from "@/components/ApiTest.vue";

const loaded = ref(false);
const showScene = ref(false);
const showApiTest = ref(false);
const apiData = ref(null);

const handleLoadEnd = async function () {
  loaded.value = true;
  
  // Wait for loading screen to fade out completely (0.5s), then wait 1 second, then fade in scene
  setTimeout(() => {
    showScene.value = true;
  }, 500 + 1000); // Loading fade-out (500ms) + 1 second delay (1000ms)
  
  // Wait for scene transition to complete, then fetch API data
  setTimeout(async () => {
    try {
      const response = await fetch('/api/hello', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        apiData.value = data;
        // Only show component after API call completes successfully
        showApiTest.value = true;
      } else {
        // Silently handle errors - don't show component if API fails
        console.error('API Error:', response.status);
      }
    } catch (e) {
      // Silently handle errors - don't show component if API fails
      console.error('API Error:', e);
    }
  }, 500 + 1000 + 600); // Loading fade-out (500ms) + 1 second delay (1000ms) + scene fade-in (600ms)
}
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
    <Transition name="fade">
      <ApiTest v-if="showApiTest" :data="apiData"/>
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
