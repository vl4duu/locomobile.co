<template>
  <div class="order-confirmation-view">
    <div class="container">
      <header>
        <button @click="router.push('/')" class="back-btn">HOME</button>
        <h1>ORDER CONFIRMED</h1>
      </header>

      <div v-if="loading" class="state-message">
        <p>LOADING ORDER...</p>
      </div>

      <div v-else-if="error" class="state-message">
        <p>WE COULDN'T FIND THAT ORDER.</p>
        <p class="state-submessage">If you just paid, give it a moment and refresh.</p>
        <button @click="router.push('/')" class="shop-btn">BACK TO CATALOG</button>
      </div>

      <div v-else class="confirmation-content">
        <p class="thank-you">Thank you for your order.</p>
        <p class="order-id">ORDER #{{ purchase.id }}</p>

        <div class="items-list">
          <div v-for="(item, i) in purchase.line_items" :key="i" class="order-item">
            <div class="item-info">
              <span class="item-name">{{ item.description }}</span>
              <span class="item-qty">Qty {{ item.quantity }}</span>
            </div>
            <span class="item-price">{{ formatAmount(item.amount_total, item.currency) }}</span>
          </div>
        </div>

        <div class="order-footer">
          <div class="total">
            <span>TOTAL</span>
            <span>{{ formatAmount(purchase.amount_total, purchase.currency) }}</span>
          </div>
          <button @click="router.push('/')" class="shop-btn">CONTINUE SHOPPING</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { API_BASE_URL } from '@/config';

const router = useRouter();
const route = useRoute();

const loading = ref(true);
const error = ref(false);
const purchase = ref(null);

const formatAmount = (amount, currency) =>
  `${(amount / 100).toFixed(2)} ${(currency || '').toUpperCase()}`;

onMounted(async () => {
  const sessionId = route.query.session_id;
  if (!sessionId) {
    error.value = true;
    loading.value = false;
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/purchase/${sessionId}`);
    if (!response.ok) {
      error.value = true;
      return;
    }
    purchase.value = await response.json();
  } catch (e) {
    console.error('Failed to load order:', e);
    error.value = true;
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.order-confirmation-view {
  min-height: 100vh;
  padding-top: 200px;
  color: white;
  font-family: 'Courier New', Courier, monospace;
  background: url("data:image/svg+xml,%3Csvg viewBox='0 0 250 250' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3CfeComponentTransfer%3E%3CfeFuncA type='linear' slope='0.22'/%3E%3C/feComponentTransfer%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E"),
    rgba(18, 18, 18, 1);
  background-blend-mode: soft-light;
  backdrop-filter: blur(20px);
}

.container {
  max-width: 600px;
  margin: 0 auto;
  padding: 40px 20px;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  padding-bottom: 20px;
  margin-bottom: 40px;
}

h1 {
  font-size: 1.5rem;
  margin: 0;
  letter-spacing: 4px;
  font-weight: normal;
}

.back-btn {
  background: none;
  border: 1px solid white;
  color: white;
  padding: 5px 15px;
  cursor: pointer;
  font-family: inherit;
  font-size: 0.8rem;
  transition: all 0.3s ease;
}

.back-btn:hover {
  background: white;
  color: black;
}

.state-message {
  text-align: center;
  padding: 60px 0;
  letter-spacing: 2px;
}

.state-submessage {
  margin-top: 12px;
  font-size: 0.8rem;
  letter-spacing: 1px;
  opacity: 0.7;
}

.shop-btn {
  background: white;
  color: black;
  border: none;
  padding: 10px 20px;
  margin-top: 30px;
  cursor: pointer;
  font-family: inherit;
  font-weight: bold;
  letter-spacing: 1px;
}

.thank-you {
  font-size: 1.1rem;
  letter-spacing: 1px;
  margin-bottom: 10px;
}

.order-id {
  font-size: 0.85rem;
  letter-spacing: 2px;
  opacity: 0.7;
  margin-bottom: 40px;
}

.items-list {
  margin-bottom: 40px;
}

.order-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 20px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.item-info {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.item-name {
  font-weight: bold;
  letter-spacing: 1px;
}

.item-qty {
  font-size: 0.8rem;
  opacity: 0.7;
}

.item-price {
  font-size: 0.95rem;
}

.order-footer {
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  padding-top: 30px;
}

.total {
  display: flex;
  justify-content: space-between;
  font-size: 1.3rem;
  margin-bottom: 30px;
  letter-spacing: 2px;
}

.order-footer .shop-btn {
  width: 100%;
  margin-top: 0;
  padding: 18px;
  font-size: 1.1rem;
  letter-spacing: 3px;
  text-align: center;
  transition: all 0.3s ease;
}

.order-footer .shop-btn:hover {
  background: #e0e0e0;
  letter-spacing: 5px;
}

@media (max-width: 768px) {
  .order-confirmation-view {
    padding-top: 150px;
  }
}
</style>
