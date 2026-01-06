<script setup>
import { ref } from 'vue';

const loading = ref(false);

const handleCheckout = async () => {
  loading.value = true;
  try {
    const response = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      console.error('Failed to create checkout session', data.error);
    }
  } catch (error) {
    console.error('Error during checkout:', error);
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="checkout-container">
    <button @click="handleCheckout" :disabled="loading" class="checkout-button">
      {{ loading ? 'Processing...' : 'Checkout' }}
    </button>
  </div>
</template>

<style scoped>
.checkout-container {
  margin: 20px;
}

.checkout-button {
  background-color: #6772e5;
  color: white;
  padding: 12px 24px;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.checkout-button:hover {
  background-color: #5469d4;
}

.checkout-button:disabled {
  background-color: #aab7c4;
  cursor: not-allowed;
}
</style>
