<template>
  <div class="product-details-view">
    <div class="details-container">
      <div class="back-nav">
        <button @click="navigation.navigate('home')" class="back-button">
          <svg viewBox="0 0 24 24" width="24" height="24">
            <path fill="currentColor" d="M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z" />
          </svg>
          Back to Catalog
        </button>
      </div>

      <div v-if="loading" class="status-message">
        <div class="spinner"></div>
        <p>Loading product details...</p>
      </div>

      <div v-else-if="error" class="status-message error">
        <p>Error: {{ error }}</p>
        <button @click="fetchProduct" class="retry-button">Retry</button>
      </div>

      <div v-else-if="product" class="details-grid">
        <div class="product-images">
          <img :src="currentImage" :alt="product.title" class="main-image" />
          <div class="thumbnail-grid" v-if="product.images.length > 1">
            <div 
              v-for="(image, index) in product.images" 
              :key="index"
              class="thumbnail-wrapper"
              :class="{ active: currentImageIndex === index }"
              @click="currentImageIndex = index"
            >
              <img :src="image.src" :alt="product.title" class="thumbnail-image" />
            </div>
          </div>
        </div>

        <div class="product-info">
          <h2 class="product-title">{{ product.title }}</h2>
          <div class="product-price">${{ displayPrice }}</div>
          
          <div class="product-description" v-html="product.body_html"></div>

          <div v-if="product.options && product.options.length > 0" class="variants-selection">
            <div v-for="option in product.options" :key="option.name" class="option-group">
              <label>{{ option.name }}</label>
              <select v-model="selectedOptions[option.name]" class="variant-select">
                <option v-for="value in option.values" :key="value.id" :value="value.id">
                  {{ value.title }}
                </option>
              </select>
            </div>
          </div>

          <div class="actions">
            <button class="buy-now-button" @click="handleBuy">Buy Now</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, watch, nextTick } from 'vue';
import { navigation } from '@/navigation';
import { API_BASE_URL } from '@/config';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const props = defineProps(['id']);

const product = ref(null);
const loading = ref(true);
const error = ref(null);
const selectedOptions = ref({});
const currentImageIndex = ref(0);

const fetchProduct = async () => {
  loading.value = true;
  error.value = null;
  const productId = props.id;
  try {
    const response = await fetch(`${API_BASE_URL}/api/products/${productId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch product: ${response.statusText}`);
    }
    const data = await response.json();
    // Printify single product response is the product object directly
    product.value = data;
  } catch (err) {
    console.error('Error fetching product:', err);
    error.value = err.message;
  } finally {
    loading.value = false;
    nextTick(() => {
      ScrollTrigger.refresh();
    });
  }
};

onMounted(fetchProduct);

// Initialize selected options when product is loaded
watch(product, (newProduct) => {
  if (newProduct && newProduct.options) {
    const initialOptions = {};
    newProduct.options.forEach(option => {
      initialOptions[option.name] = option.values[0].id;
    });
    selectedOptions.value = initialOptions;
  }
}, { immediate: true });

const selectedVariant = computed(() => {
  if (!product.value || !product.value.variants) return null;
  
  return product.value.variants.find(variant => {
    return product.value.options.every((option, index) => {
      return variant.options[index] === selectedOptions.value[option.name];
    });
  });
});

const currentImage = computed(() => {
  return product.value?.images[currentImageIndex.value]?.src;
});

const displayPrice = computed(() => {
  const price = selectedVariant.value?.price || 0;
  return (price / 100).toFixed(2);
});

const handleBuy = async () => {
  if (!product.value || !selectedVariant.value) return;

  const name = product.value.title;
  const price = selectedVariant.value.price;
  const image = currentImage.value;

  try {
    const response = await fetch(`${API_BASE_URL}/api/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, price, image }),
    });

    const data = await response.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      alert('Could not start checkout. Please try again.');
    }
  } catch (err) {
    console.error('Checkout error:', err);
    alert('Error connecting to the payment server.');
  }
};
</script>

<style scoped>
.product-details-view {
  min-height: 100vh;
  padding-top: 200px;
  background: #000;
  color: white;
}

.details-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.back-nav {
  margin-bottom: 2rem;
}

.back-button {
  background: transparent;
  border: none;
  color: #ccc;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 1rem;
  transition: color 0.2s;
  text-decoration: none;
  width: fit-content;
}

.back-button:hover {
  color: white;
}

.details-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
}

.main-image {
  width: 100%;
  aspect-ratio: 1;
  object-fit: contain;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 20px;
}

.thumbnail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.thumbnail-wrapper {
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  background: rgba(255, 255, 255, 0.05);
  transition: all 0.2s ease;
}

.thumbnail-wrapper.active {
  border-color: white;
}

.thumbnail-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.product-info {
  display: flex;
  flex-direction: column;
  text-align: left;
}

.product-title {
  font-size: 3rem;
  margin-bottom: 1rem;
  font-weight: 800;
}

.product-price {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 2rem;
}

.product-description {
  font-size: 1.1rem;
  line-height: 1.6;
  color: #ccc;
  margin-bottom: 2rem;
}

.variants-selection {
  margin-bottom: 2rem;
}

.option-group {
  margin-bottom: 1.5rem;
}

.option-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #888;
  text-transform: uppercase;
  font-size: 0.8rem;
}

.variant-select {
  width: 100%;
  padding: 0.8rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  border-radius: 8px;
  cursor: pointer;
}

.buy-now-button {
  width: 100%;
  padding: 1.2rem;
  background: white;
  color: black;
  border: none;
  border-radius: 12px;
  font-size: 1.2rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.buy-now-button:hover {
  background: #eee;
  transform: translateY(-2px);
}

.status-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 50vh;
  font-size: 1.5rem;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255, 255, 255, 0.1);
  border-left-color: #fff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .details-grid {
    grid-template-columns: 1fr;
    gap: 2rem;
  }
  
  .product-title {
    font-size: 2rem;
  }
}
</style>
