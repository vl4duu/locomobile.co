<template>
  <div class="pay-list-view">
    <div class="container">
      <header>
        <button @click="navigation.navigate('home')" class="back-btn">BACK</button>
        <h1>PAY LIST</h1>
      </header>

      <div v-if="cart.items.length === 0" class="empty-cart">
        <p>YOUR LIST IS EMPTY</p>
        <button @click="navigation.navigate('home')" class="shop-btn">BROWSE CATALOG</button>
      </div>

      <div v-else class="cart-content">
        <div class="items-list">
          <div v-for="item in cart.items" :key="item.cartId" class="cart-item">
            <div class="item-info">
              <span class="item-name">{{ item.name }}</span>
              <span class="item-price">${{ (item.price / 100).toFixed(2) }}</span>
            </div>
            <button @click="cart.removeItem(item.cartId)" class="remove-btn">REMOVE</button>
          </div>
        </div>

        <div class="cart-footer">
          <div class="total">
            <span>TOTAL</span>
            <span>${{ (cart.total / 100).toFixed(2) }}</span>
          </div>
          <button @click="handleCheckout" :disabled="loading" class="checkout-btn">
            {{ loading ? 'PROCESSING...' : 'CHECKOUT' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { navigation } from '@/navigation';
import { cart } from '@/cart';
import { API_BASE_URL } from '@/config';

const loading = ref(false);

const handleCheckout = async () => {
  if (cart.items.length === 0) return;
  
  loading.value = true;
  try {
    // Attempting to send all items to checkout.
    // If the API only supports single item as seen in ProductCatalog, 
    // it might need adjustment on the backend, but we'll send the data we have.
    const response = await fetch(`${API_BASE_URL}/api/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: cart.items.map(item => ({
          name: item.name,
          price: item.price,
          image: item.image
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

.items-list {
  margin-bottom: 40px;
}

.cart-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
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
