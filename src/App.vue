<script setup>
import ThreeGLBScene from "@/components/ThreeGLBScene.vue";
import NavBar from "@/components/NavBar.vue";
import {ref, onMounted} from 'vue'
import LoadingAnimation from "@/components/LoadingAnimation.vue";
import ApiTest from "@/components/ApiTest.vue";
import CheckoutButton from "@/components/CheckoutButton.vue";

const loaded = ref(false);
const showScene = ref(false);
const showApiTest = ref(false);
const apiData = ref(null);
const paymentStatus = ref(null);

onMounted(() => {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('success')) {
    paymentStatus.value = 'success';
  } else if (urlParams.get('canceled')) {
    paymentStatus.value = 'canceled';
  }
});

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
      <div v-if="paymentStatus" class="payment-status" :class="paymentStatus">
        {{ paymentStatus === 'success' ? 'Payment successful! Thank you for your purchase.' : 'Payment canceled.' }}
      </div>
    </Transition>
    <Transition name="fade">
      <div v-if="showApiTest" class="overlay-content">
        <ApiTest :data="apiData"/>
        <CheckoutButton />
      </div>
    </Transition>
  </main>
</template>

<style scoped>
.overlay-content {
  position: absolute;
  top: 60px;
  left: 20px;
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.payment-status {
  position: absolute;
  top: 80px;
  right: 20px;
  padding: 15px 25px;
  border-radius: 8px;
  z-index: 100;
  font-weight: bold;
}

.payment-status.success {
  background-color: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.payment-status.canceled {
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

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
