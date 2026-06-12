<template>
  <div class="pay-list-view">
    <div class="container">
      <header>
        <button @click="router.push('/')" class="back-btn">BACK</button>
        <h1>PAY LIST</h1>
      </header>

      <div v-if="cart.items.length === 0" class="empty-cart">
        <p>YOUR LIST IS EMPTY</p>
        <button @click="router.push('/')" class="shop-btn">BROWSE CATALOG</button>
      </div>

      <div v-else class="cart-content">
        <div v-if="cart.notices.length" class="notices">
          <div v-for="(note, i) in cart.notices" :key="i" class="notice">
            <span>{{ note }}</span>
            <button @click="cart.dismissNotice(i)" class="notice-dismiss" aria-label="Dismiss">×</button>
          </div>
        </div>

        <div class="items-list">
          <div
            v-for="item in cart.items"
            :key="item.variantId"
            class="cart-item"
            :class="{ unavailable: item._unavailable }"
          >
            <div class="item-info">
              <span class="item-name">{{ item.name }}</span>
              <span v-if="item._unavailable" class="item-status">NO LONGER AVAILABLE</span>
              <span v-else class="item-price">${{ (item.price / 100).toFixed(2) }} each</span>
            </div>

            <div v-if="!item._unavailable" class="qty-controls">
              <button @click="cart.decrementQuantity(item.variantId)" class="qty-btn" aria-label="Decrease">−</button>
              <span class="qty-value">{{ item.quantity }}</span>
              <button @click="cart.incrementQuantity(item.variantId)" class="qty-btn" aria-label="Increase">+</button>
            </div>

            <button @click="cart.removeItem(item.variantId)" class="remove-btn">REMOVE</button>
          </div>
        </div>

        <div class="cart-footer">
          <div class="total">
            <span>TOTAL</span>
            <span>${{ (cart.total / 100).toFixed(2) }}</span>
          </div>
          <p v-if="cart.hasUnavailable" class="checkout-warning">
            Remove unavailable items to check out.
          </p>
          <button @click="handleCheckout" :disabled="checkoutDisabled" class="checkout-btn">
            {{ loading ? 'PROCESSING...' : 'CHECKOUT' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { cart, revalidateCart } from '@/cart';

const router = useRouter();
import { API_BASE_URL } from '@/config';

const loading = ref(false);

const checkoutDisabled = computed(
  () => loading.value || cart.items.length === 0 || cart.hasUnavailable,
);

// Re-check availability/prices whenever the cart page is opened.
onMounted(revalidateCart);

const handleCheckout = async () => {
  if (checkoutDisabled.value) return;

  loading.value = true;
  try {
    // NOTE: checkout POST body still sends display fields; Task 5 switches this
    // to { productId, variantId, quantity } once the backend re-prices server-side.
    const response = await fetch(`${API_BASE_URL}/api/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: cart.items.map(item => ({
          name: item.name,
          price: item.price,
          image: item.image,
          quantity: item.quantity
        }))
      }),
    });

    const data = await response.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      console.error('Checkout failed', data);
      alert('Checkout failed. Please try again.');
    }
  } catch (error) {
    console.error('Checkout error:', error);
    alert('Error connecting to the payment server.');
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.pay-list-view {
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

.empty-cart {
  text-align: center;
  padding: 60px 0;
  letter-spacing: 2px;
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

.notices {
  margin-bottom: 30px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.notice {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.05);
  font-size: 0.8rem;
  letter-spacing: 1px;
}

.notice-dismiss {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  font-size: 1.1rem;
  line-height: 1;
}

.notice-dismiss:hover {
  color: white;
}

.items-list {
  margin-bottom: 40px;
}

.cart-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 20px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.cart-item.unavailable {
  color: #ff4d4d;
  opacity: 0.8;
}

.item-info {
  display: flex;
  flex-direction: column;
  gap: 5px;
  flex: 1;
}

.item-status {
  font-size: 0.75rem;
  letter-spacing: 1px;
  color: #ff4d4d;
}

.qty-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.qty-btn {
  width: 28px;
  height: 28px;
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.4);
  color: white;
  cursor: pointer;
  font-family: inherit;
  font-size: 1rem;
  line-height: 1;
}

.qty-btn:hover {
  background: white;
  color: black;
}

.qty-value {
  min-width: 1.5ch;
  text-align: center;
}

.checkout-warning {
  color: #ff4d4d;
  font-size: 0.8rem;
  letter-spacing: 1px;
  margin: -20px 0 20px;
}

.item-name {
  font-weight: bold;
  letter-spacing: 1px;
}

.item-price {
  font-size: 0.9rem;
  opacity: 0.8;
}

.remove-btn {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.4);
  cursor: pointer;
  font-family: inherit;
  font-size: 0.7rem;
  text-decoration: underline;
  transition: color 0.3s ease;
}

.remove-btn:hover {
  color: #ff4d4d;
}

.cart-footer {
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  padding-top: 30px;
}

.total {
  display: flex;
  justify-content: space-between;
  font-size: 1.3rem;
  margin-bottom: 40px;
  letter-spacing: 2px;
}

.checkout-btn {
  width: 100%;
  background: white;
  color: black;
  border: none;
  padding: 18px;
  font-family: inherit;
  font-weight: bold;
  font-size: 1.1rem;
  cursor: pointer;
  letter-spacing: 3px;
  transition: all 0.3s ease;
}

.checkout-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.checkout-btn:hover:not(:disabled) {
  background: #e0e0e0;
  letter-spacing: 5px;
}

@media (max-width: 768px) {
  .pay-list-view {
    padding-top: 150px;
  }
}
</style>
