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
          <h2 class="product-title">{{ product.title }}</h2>
          <p v-if="!noPhonePicked && selectedPhoneTitle" class="product-subtitle">{{ selectedPhoneTitle }}</p>

          <div class="product-price">
            <span v-if="noPhonePicked" class="price-hint">Select a phone</span>
            <span v-else-if="phoneOutOfStock || comboOutOfStock" class="price-oos">Out of stock</span>
            <span v-else>${{ displayPrice }}</span>
          </div>

          <div class="product-description" v-html="product.body_html"></div>

          <div v-if="product.options?.length" class="variants-selection">
            <div v-for="option in product.options" :key="option.name" class="option-group">
              <label>{{ optionLabel(option) }}</label>

              <!-- Phone selector: grouped by manufacturer, dead models greyed out -->
              <select
                v-if="option === phoneOpt"
                v-model.number="selectedOptions[option.name]"
                class="variant-select"
              >
                <option :value="undefined" disabled>Select a phone</option>
                <optgroup
                  v-for="group in phoneGroups"
                  :key="group.manufacturer"
                  :label="group.manufacturer"
                >
                  <option
                    v-for="value in group.values"
                    :key="value.id"
                    :value="value.id"
                    :disabled="!enabledPhoneIds.has(value.id)"
                  >
                    {{ value.title }}{{ enabledPhoneIds.has(value.id) ? '' : ' — out of stock' }}
                  </option>
                </optgroup>
              </select>

              <!-- Other options (surface, etc.) -->
              <select v-else v-model.number="selectedOptions[option.name]" class="variant-select">
                <option v-for="value in option.values" :key="value.id" :value="value.id">
                  {{ value.title }}
                </option>
              </select>
            </div>
          </div>

          <div class="actions">
            <button class="buy-now-button" :disabled="buyDisabled" @click="handleBuy">
              {{ buyLabel }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, watch, nextTick } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { cart } from '@/cart';
import {
  phoneOption,
  groupPhoneValues,
  enabledPhoneValueIds,
  resolveVariant,
  defaultEnabledVariantForPhone,
} from '@/domain/variant';

const router = useRouter();
const route = useRoute();
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

const optionLabel = (option) => option.type === 'size' ? 'Phone Model' : option.name;

// --- Phone option plumbing -------------------------------------------------

const phoneOpt = computed(() => phoneOption(product.value));
const phoneGroups = computed(() => groupPhoneValues(phoneOpt.value?.values ?? []));
const enabledPhoneIds = computed(() => enabledPhoneValueIds(product.value));

// Valid phone value-ids for THIS product (all values, enabled or not).
const allPhoneIds = computed(
  () => new Set((phoneOpt.value?.values ?? []).map((v) => v.id)),
);

// The currently selected phone value-id (the value of the size option), or undefined.
const selectedPhoneId = computed(() =>
  phoneOpt.value ? selectedOptions.value[phoneOpt.value.name] : undefined,
);

const selectedPhoneTitle = computed(() => {
  const id = selectedPhoneId.value;
  return phoneOpt.value?.values.find((v) => v.id === id)?.title ?? null;
});

// Read a valid phone id from the URL, or null if absent/foreign to this product.
const phoneFromQuery = () => {
  const raw = Number(route.query.phone);
  return Number.isFinite(raw) && allPhoneIds.value.has(raw) ? raw : null;
};

// Seed selection once the product arrives (and re-seed if the route id changes).
watch(product, (newProduct) => {
  if (!newProduct?.options || !newProduct?.variants) return;

  const queryPhone = phoneFromQuery();
  const base = {};

  if (queryPhone != null) {
    // Phone picked via URL: default the rest from an enabled variant for it.
    const variant =
      defaultEnabledVariantForPhone(newProduct, queryPhone) ??
      newProduct.variants.find((v) => v.is_enabled) ??
      newProduct.variants[0];
    newProduct.options.forEach((opt, i) => {
      base[opt.name] = opt === phoneOpt.value ? queryPhone : variant?.options[i];
    });
  } else {
    // No phone picked: leave the phone empty, default the other axes from the
    // product default so a full combo completes the moment a phone is chosen.
    const fallback =
      newProduct.variants.find((v) => v.is_enabled && v.is_default) ??
      newProduct.variants.find((v) => v.is_enabled) ??
      newProduct.variants[0];
    newProduct.options.forEach((opt, i) => {
      base[opt.name] = opt === phoneOpt.value ? undefined : fallback?.options[i];
    });
  }

  selectedOptions.value = base;
}, { immediate: true });

// Keep the URL in sync when the phone changes (and react to back/forward).
watch(selectedPhoneId, (id) => {
  const current = route.query.phone != null ? Number(route.query.phone) : null;
  if (id != null && id !== current) {
    router.replace({ query: { ...route.query, phone: id } });
  }
});

watch(
  () => route.query.phone,
  () => {
    const queryPhone = phoneFromQuery();
    if (queryPhone != null && queryPhone !== selectedPhoneId.value && phoneOpt.value) {
      selectedOptions.value = { ...selectedOptions.value, [phoneOpt.value.name]: queryPhone };
    }
  },
);

// --- Stock flags -----------------------------------------------------------

const noPhonePicked = computed(() => selectedPhoneId.value == null);

const phoneOutOfStock = computed(
  () => !noPhonePicked.value && !enabledPhoneIds.value.has(selectedPhoneId.value),
);

const selectedVariant = computed(() => resolveVariant(product.value, selectedOptions.value));

const comboOutOfStock = computed(
  () =>
    !noPhonePicked.value &&
    !phoneOutOfStock.value &&
    (!selectedVariant.value || !selectedVariant.value.is_enabled),
);

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

const buyDisabled = computed(
  () => noPhonePicked.value || phoneOutOfStock.value || comboOutOfStock.value,
);

const buyLabel = computed(() => {
  if (noPhonePicked.value) return 'Select a phone';
  if (phoneOutOfStock.value || comboOutOfStock.value) return 'Out of stock';
  return 'Buy Now';
});

const handleBuy = () => {
  // Cart item shape is rewritten in Task 4; keep the current shape for now.
  if (buyDisabled.value || !product.value || !selectedVariant.value) return;
  cart.addItem({
    name: product.value.title,
    price: selectedVariant.value.price,
    image: currentImage.value,
  });
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

.price-hint {
  color: #888;
  font-weight: 600;
}

.price-oos {
  color: #ff4444;
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

.buy-now-button:hover:not(:disabled) {
  background: #eee;
  transform: translateY(-2px);
}

.buy-now-button:disabled {
  background: #444;
  color: #999;
  cursor: not-allowed;
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
