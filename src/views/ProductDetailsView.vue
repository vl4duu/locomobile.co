<template>
  <div class="product-details-view">
    <div class="details-container">
      <div class="back-nav">
        <button @click="router.push('/')" class="back-button">
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
          <div class="thumbnail-grid" v-if="variantImages.length > 1">
            <div
              v-for="(image, index) in variantImages"
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
          <h2 class="product-title">{{ phoneModelTitle }}</h2>
          <p class="product-subtitle">{{ product.title }}</p>
          <div class="product-price">${{ displayPrice }}</div>

          <div class="product-description" v-html="product.body_html"></div>

          <div v-if="displayOptions.length > 0" class="variants-selection">
            <div v-for="option in displayOptions" :key="option.name" class="option-group">
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
import { useRouter } from 'vue-router';
import { cart } from '@/cart';

const router = useRouter();
import { API_BASE_URL } from '@/config';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const props = defineProps(['id', 'phoneModelValueId']);

const product = ref(null);
const loading = ref(true);
const error = ref(null);
const selectedOptions = ref({});
const currentImageIndex = ref(0);

const fetchProduct = async () => {
  loading.value = true;
  error.value = null;
  try {
    const response = await fetch(`${API_BASE_URL}/api/products/${props.id}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch product: ${response.statusText}`);
    }
    product.value = await response.json();
  } catch (err) {
    console.error('Error fetching product:', err);
    error.value = err.message;
  } finally {
    loading.value = false;
    nextTick(() => { ScrollTrigger.refresh(); });
  }
};

onMounted(fetchProduct);

// Index of the "size" option (phone model) — hidden from UI, fixed by catalog selection
const sizeOptionIndex = computed(() =>
  product.value?.options?.findIndex(opt => opt.type === 'size') ?? -1
);

// Options shown in dropdowns (everything except the phone model size option)
const displayOptions = computed(() =>
  product.value?.options?.filter(opt => opt.type !== 'size') ?? []
);

// Resolved phone model title for display
const phoneModelTitle = computed(() => {
  if (!product.value || !props.phoneModelValueId) return '';
  const sizeOpt = product.value.options?.[sizeOptionIndex.value];
  return sizeOpt?.values.find(v => v.id === Number(props.phoneModelValueId))?.title ?? '';
});

// Variants narrowed to the selected phone model
const phoneModelVariants = computed(() => {
  if (!product.value?.variants) return [];
  if (sizeOptionIndex.value < 0) return product.value.variants;
  const phoneModelId = Number(props.phoneModelValueId);
  return product.value.variants.filter(v => v.options[sizeOptionIndex.value] === phoneModelId);
});

// Initialise selectedOptions from the default variant for this phone model
watch(product, (newProduct) => {
  if (!newProduct?.options || !newProduct?.variants) return;
  const sizeIdx = newProduct.options.findIndex(opt => opt.type === 'size');
  const phoneModelId = Number(props.phoneModelValueId);
  const relevant = sizeIdx >= 0
    ? newProduct.variants.filter(v => v.options[sizeIdx] === phoneModelId)
    : newProduct.variants;
  const defaultVariant = relevant.find(v => v.is_default) ?? relevant[0];
  if (!defaultVariant) return;
  const initialOptions = {};
  newProduct.options.forEach((opt, i) => {
    if (opt.type !== 'size') initialOptions[opt.name] = defaultVariant.options[i];
  });
  selectedOptions.value = initialOptions;
}, { immediate: true });

const selectedVariant = computed(() => {
  if (!product.value) return null;
  return phoneModelVariants.value.find(variant =>
    displayOptions.value.every(option => {
      const idx = product.value.options.indexOf(option);
      return variant.options[idx] === selectedOptions.value[option.name];
    })
  ) ?? null;
});

// Reset image index when variant changes
watch(selectedVariant, () => { currentImageIndex.value = 0; });

const variantImages = computed(() => {
  if (!product.value?.images) return [];
  if (!selectedVariant.value) return product.value.images;
  const filtered = product.value.images.filter(
    image => image.variant_ids?.includes(selectedVariant.value.id)
  );
  return filtered.length > 0 ? filtered : product.value.images;
});

const currentImage = computed(() => variantImages.value[currentImageIndex.value]?.src);

const displayPrice = computed(() => {
  const price = selectedVariant.value?.price || 0;
  return (price / 100).toFixed(2);
});

const handleBuy = () => {
  if (!product.value || !selectedVariant.value) return;
  const name = phoneModelTitle.value
    ? `${phoneModelTitle.value} – ${product.value.title}`
    : product.value.title;
  cart.addItem({ name, price: selectedVariant.value.price, image: currentImage.value });
  router.push('/cart');
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

.product-subtitle {
  font-size: 1rem;
  color: #888;
  margin-top: -0.75rem;
  margin-bottom: 1.5rem;
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

  .product-info {
    display: flex;
    flex-direction: column;
  }

  .variants-selection {
    order: -1;
    margin-bottom: 2rem;
  }

  .product-title {
    font-size: 2rem;
  }
}
</style>
