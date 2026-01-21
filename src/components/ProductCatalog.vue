<template>
  <div class="product-catalog">
    <svg style="position: absolute; width: 0; height: 0;" aria-hidden="true" focusable="false">
      <filter id="remove-white">
        <feColorMatrix type="matrix" values="1 0 0 0 0
                                             0 1 0 0 0
                                             0 0 1 0 0
                                             -1.1 -1.1 -1.1 3.3 0"/>
      </filter>
    </svg>
    <div class="catalog-content">
      <h2>Product Catalog</h2>

      <div v-if="loading" class="status-message">
        <div class="spinner"></div>
        <p>Fetching latest gear...</p>
      </div>

      <div v-else-if="error" class="status-message error">
        <p>Error: {{ error }}</p>
        <button @click="fetchProducts" class="retry-button">Retry</button>
      </div>

      <div v-else class="product-grid">
        <div v-for="product in products" :key="product.id" class="product-card">
          <div class="product-image">
            <img :src="product.images[0]?.src" :alt="product.title" draggable="false"/>
          </div>
          <div class="product-info">
            <h3>{{ product.title }}</h3>
            <p class="price">${{ getPrice(product) }}</p>
            <div class="card-actions">
              <button @click="navigation.navigate('product-details', { id: product.id })" class="details-button">Details</button>
              <button @click="handleBuyNow(product)" class="buy-button">Buy Now</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import {onMounted, ref, nextTick} from 'vue';
import {API_BASE_URL} from '@/config';
import { navigation } from '@/navigation';
import { cart } from '@/cart';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const products = ref([]);
const loading = ref(true);
const error = ref(null);

const fetchProducts = async () => {
  loading.value = true;
  error.value = null;
  try {
    const response = await fetch(`${API_BASE_URL}/api/products`);
    if (!response.ok) {
      throw new Error(`Failed to fetch products: ${response.statusText}`);
    }
    const data = await response.json();
    products.value = data.data || [];
  } catch (err) {
    console.error('Error fetching products:', err);
    error.value = err.message;
  } finally {
    loading.value = false;
    nextTick(() => {
      ScrollTrigger.refresh();
    });
  }
};

const getPrice = (product) => {
  if (!product.variants || product.variants.length === 0) return '0.00';
  const prices = product.variants
      .map(v => v.price)
      .filter(p => p !== undefined && p !== null);

  if (prices.length === 0) return '0.00';

  const minPrice = Math.min(...prices);
  return (minPrice / 100).toFixed(2);
};

const handleBuyNow = (productData) => {
  let name, price, image;

  if (productData.selectedVariant) {
    name = productData.title;
    price = productData.price;
    image = productData.image;
  } else {
    name = productData.title;
    price = productData.variants[0]?.price || 2000;
    image = productData.images[0]?.src;
  }

  cart.addItem({ name, price, image });
  navigation.navigate('pay-list');
};

onMounted(fetchProducts);
</script>

<style scoped>
.product-catalog {
  width: 100vw;
  margin: 0;
  min-height: 100vh;
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 200px;
  padding-bottom: 10vh;
  color: white;
  isolation: isolate;
  background: url("data:image/svg+xml,%3Csvg viewBox='0 0 250 250' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3CfeComponentTransfer%3E%3CfeFuncA type='linear' slope='0.45'/%3E%3C/feComponentTransfer%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E"),
  rgba(0, 0, 0, 0.65);

  background-blend-mode: overlay;
  animation: static-move 0.2s infinite;
  backdrop-filter: blur(20px);

  -webkit-mask-image: linear-gradient(
      to bottom,
      transparent,
      rgba(0, 0, 0, 0.013) 16.2px,
      rgba(0, 0, 0, 0.049) 31px,
      rgba(0, 0, 0, 0.104) 45px,
      rgba(0, 0, 0, 0.175) 58px,
      rgba(0, 0, 0, 0.259) 70.6px,
      rgba(0, 0, 0, 0.352) 82.4px,
      rgba(0, 0, 0, 0.45) 94.2px,
      rgba(0, 0, 0, 0.55) 105.8px,
      rgba(0, 0, 0, 0.648) 117.6px,
      rgba(0, 0, 0, 0.741) 129.4px,
      rgba(0, 0, 0, 0.825) 142px,
      rgba(0, 0, 0, 0.896) 155px,
      rgba(0, 0, 0, 0.951) 169px,
      rgba(0, 0, 0, 0.987) 183.8px,
      #000 200px
  );
  mask-image: linear-gradient(
      to bottom,
      transparent,
      rgba(0, 0, 0, 0.013) 16.2px,
      rgba(0, 0, 0, 0.049) 31px,
      rgba(0, 0, 0, 0.104) 45px,
      rgba(0, 0, 0, 0.175) 58px,
      rgba(0, 0, 0, 0.259) 70.6px,
      rgba(0, 0, 0, 0.352) 82.4px,
      rgba(0, 0, 0, 0.45) 94.2px,
      rgba(0, 0, 0, 0.55) 105.8px,
      rgba(0, 0, 0, 0.648) 117.6px,
      rgba(0, 0, 0, 0.741) 129.4px,
      rgba(0, 0, 0, 0.825) 142px,
      rgba(0, 0, 0, 0.896) 155px,
      rgba(0, 0, 0, 0.951) 169px,
      rgba(0, 0, 0, 0.987) 183.8px,
      #000 200px
  );
}

@keyframes static-move {
  0% {
    background-position: 0 0;
  }
  100% {
    background-position: 10px 10px;
  }
}

.catalog-content {
  max-width: 1200px;
  width: 90%;
  text-align: center;
}

h2 {
  font-size: 3.5rem;
  margin-bottom: 3rem;
  text-transform: uppercase;
  letter-spacing: 0.2rem;
  font-weight: 800;
  text-shadow: 0 0 20px rgba(255, 255, 255, 0.3);
}

.status-message {
  padding: 4rem;
  font-size: 1.5rem;
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 2.5rem;
  width: 100%;
}


.product-image {
  width: 100%;
  aspect-ratio: 1;
  overflow: hidden;
  background: transparent;
}

.product-image img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  transition: transform 0.5s ease;
  filter: url(#remove-white) brightness(1.05);
  user-select: none;
  -webkit-user-drag: none;
}


.product-info {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  text-align: left;
}

.product-info h3 {
  font-size: 1.25rem;
  margin-bottom: 0.75rem;
  line-height: 1.4;
  height: 2.8em;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.price {
  font-size: 1.5rem;
  font-weight: 700;
  color: #fff;
  margin-bottom: 1.5rem;
}

.card-actions {
  display: flex;
  gap: 1rem;
  margin-top: auto;
}

.buy-button, .details-button {
  padding: 0.8rem 1rem;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s ease;
  flex: 1;
  text-decoration: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.buy-button {
  background: #fff;
  color: #000;
}

.buy-button:hover {
  background: #eee;
  transform: scale(1.02);
}

.details-button {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.details-button:hover {
  background: rgba(255, 255, 255, 0.2);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255, 255, 255, 0.1);
  border-left-color: #fff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.retry-button {
  margin-top: 1rem;
  padding: 0.5rem 1.5rem;
  background: #fff;
  color: #000;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

@media (max-width: 768px) {
  h2 {
    font-size: 2.5rem;
  }

  .product-grid {
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  }
}
</style>
