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
          <p v-if="!noPrimaryPicked && selectedPrimaryTitle" class="product-subtitle">{{ selectedPrimaryTitle }}</p>

          <div class="product-price">
            <span v-if="noPrimaryPicked" class="price-hint">Select a {{ primaryNoun }}</span>
            <span v-else-if="primaryOutOfStock || comboOutOfStock" class="price-oos">Out of stock</span>
            <span v-else>${{ displayPrice }}</span>
          </div>

          <div class="product-description" v-html="product.body_html"></div>

          <div v-if="visibleOptions.length" class="variants-selection">
            <div v-for="option in visibleOptions" :key="option.name" class="option-group">
              <label>{{ optionLabel(option) }}</label>

              <!-- Primary axis rendered as a manufacturer-grouped picker (phones) -->
              <select
                v-if="option === primaryOpt && isGroupedPrimary"
                v-model.number="selectedOptions[option.name]"
                class="variant-select"
              >
                <option :value="undefined" disabled>Select a {{ primaryNoun }}</option>
                <optgroup
                  v-for="group in primaryGroups"
                  :key="group.manufacturer"
                  :label="group.manufacturer"
                >
                  <option
                    v-for="value in group.values"
                    :key="value.id"
                    :value="value.id"
                    :disabled="!isValueAvailable(option, value.id)"
                  >
                    {{ value.title }}{{ isValueAvailable(option, value.id) ? '' : ' — out of stock' }}
                  </option>
                </optgroup>
              </select>

              <!-- Any other option (plain select, dead values greyed for the current combo) -->
              <select v-else v-model.number="selectedOptions[option.name]" class="variant-select">
                <option v-if="option === primaryOpt" :value="undefined" disabled>
                  Select a {{ primaryNoun }}
                </option>
                <option
                  v-for="value in option.values"
                  :key="value.id"
                  :value="value.id"
                  :disabled="!isValueAvailable(option, value.id)"
                >
                  {{ value.title }}{{ isValueAvailable(option, value.id) ? '' : ' — out of stock' }}
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
  primaryOption,
  isPhoneModelOption,
  groupPhoneValues,
  availableValueIds,
  resolveVariant,
  imageVariant,
  defaultEnabledVariantForPhone,
  optionsFromVariant,
  isHiddenOption,
  defaultHiddenValueId,
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

// Labels come from the product's own option names (a hoodie says "Sizes", a
// phone case says "Phone case sizes") — never hard-coded.
const optionLabel = (option) => option.name;

// --- Primary axis (product-agnostic) ---------------------------------------
// The size-type option is the "primary" axis: it starts unpicked and gates the
// price/Buy button. For phone cases that's the phone model; for a hoodie, size.

const primaryOpt = computed(() => primaryOption(product.value));
const isGroupedPrimary = computed(() => isPhoneModelOption(primaryOpt.value));
const primaryGroups = computed(() => groupPhoneValues(primaryOpt.value?.values ?? []));

// Options shown to the user. Hidden options (gift packaging) are silently
// defaulted in the seed and never rendered.
const visibleOptions = computed(
  () => product.value?.options?.filter((o) => !isHiddenOption(o)) ?? [],
);

// All valid value-ids for the primary axis (enabled or not) on THIS product.
const allPrimaryIds = computed(
  () => new Set((primaryOpt.value?.values ?? []).map((v) => v.id)),
);

// Per-option set of currently selectable value-ids. The primary axis uses the
// global in-stock set ({}); secondary axes narrow by the current selection so
// they grey out combos that are dead for the chosen primary value.
const optionAvailability = computed(() => {
  const map = {};
  for (const opt of product.value?.options ?? []) {
    map[opt.name] =
      opt === primaryOpt.value
        ? availableValueIds(product.value, opt.name, {})
        : availableValueIds(product.value, opt.name, selectedOptions.value);
  }
  return map;
});
const isValueAvailable = (option, valueId) =>
  optionAvailability.value[option.name]?.has(valueId) ?? false;

const selectedPrimaryId = computed(() =>
  primaryOpt.value ? selectedOptions.value[primaryOpt.value.name] : undefined,
);

const selectedPrimaryTitle = computed(() => {
  const id = selectedPrimaryId.value;
  return primaryOpt.value?.values.find((v) => v.id === id)?.title ?? null;
});

// Noun used in "Select a …" copy, derived from the option.
const primaryNoun = computed(() => {
  const o = primaryOpt.value;
  if (!o) return 'option';
  if (isGroupedPrimary.value) return 'phone';
  if (o.type === 'size') return 'size';
  return o.name.toLowerCase();
});

// Read a valid primary value-id from the URL, or null if absent/foreign.
const primaryFromQuery = () => {
  const raw = Number(route.query.phone);
  return Number.isFinite(raw) && allPrimaryIds.value.has(raw) ? raw : null;
};

// Seed selection once the product arrives (and re-seed if the route id changes).
// Values are reconstructed from the chosen variant by id membership, never by
// array position (variant.options order may differ from product.options order).
watch(product, (newProduct) => {
  if (!newProduct?.options || !newProduct?.variants) return;

  const queryPrimary = primaryFromQuery();
  const primaryName = primaryOpt.value?.name;

  // Pick a representative variant to default the non-primary axes from.
  const seedVariant =
    (queryPrimary != null ? defaultEnabledVariantForPhone(newProduct, queryPrimary) : null) ??
    newProduct.variants.find((v) => v.is_enabled && v.is_default) ??
    newProduct.variants.find((v) => v.is_enabled) ??
    newProduct.variants[0];

  const base = optionsFromVariant(newProduct, seedVariant);

  // Force hidden options (gift packaging) to their default regardless of variant.
  for (const opt of newProduct.options) {
    if (isHiddenOption(opt)) base[opt.name] = defaultHiddenValueId(newProduct, opt);
  }

  // The primary axis: pre-filled from the URL, otherwise left unpicked.
  if (primaryName) base[primaryName] = queryPrimary != null ? queryPrimary : undefined;

  selectedOptions.value = base;
}, { immediate: true });

// Keep the URL in sync when the primary value changes (and react to back/forward).
// Query key stays `phone` for shared-link stability; it holds the primary value id.
watch(selectedPrimaryId, (id) => {
  const current = route.query.phone != null ? Number(route.query.phone) : null;
  if (id != null && id !== current) {
    // Swallow redundant-navigation rejections; never surface as unhandled.
    router.replace({ query: { ...route.query, phone: id } }).catch(() => {});
  }
});

watch(
  () => route.query.phone,
  () => {
    const queryPrimary = primaryFromQuery();
    if (queryPrimary != null && queryPrimary !== selectedPrimaryId.value && primaryOpt.value) {
      selectedOptions.value = { ...selectedOptions.value, [primaryOpt.value.name]: queryPrimary };
    }
  },
);

// --- Stock flags -----------------------------------------------------------

const hasPrimary = computed(() => !!primaryOpt.value);
const noPrimaryPicked = computed(() => hasPrimary.value && selectedPrimaryId.value == null);

const primaryOutOfStock = computed(
  () =>
    hasPrimary.value &&
    selectedPrimaryId.value != null &&
    !optionAvailability.value[primaryOpt.value.name]?.has(selectedPrimaryId.value),
);

const selectedVariant = computed(() => {
  const v = resolveVariant(product.value, selectedOptions.value);
  return v && v.is_enabled ? v : null;
});

const comboOutOfStock = computed(
  () => !noPrimaryPicked.value && !primaryOutOfStock.value && !selectedVariant.value,
);

// Image follows the best ENABLED variant matching the current (partial)
// selection — never a disabled, image-less combo, and never all-images dump.
const imgVariant = computed(() => imageVariant(product.value, selectedOptions.value));
watch(imgVariant, () => { currentImageIndex.value = 0; });

const variantImages = computed(() => {
  if (!product.value?.images) return [];
  const iv = imgVariant.value;
  if (!iv) return product.value.images;
  const filtered = product.value.images.filter((image) => image.variant_ids?.includes(iv.id));
  if (!filtered.length) return product.value.images;
  // Default image first so the hero shows the primary mockup angle.
  return [...filtered].sort((a, b) => (b.is_default ? 1 : 0) - (a.is_default ? 1 : 0));
});

const currentImage = computed(() => variantImages.value[currentImageIndex.value]?.src);

const displayPrice = computed(() => {
  const price = selectedVariant.value?.price || 0;
  return (price / 100).toFixed(2);
});

const buyDisabled = computed(
  () => noPrimaryPicked.value || primaryOutOfStock.value || comboOutOfStock.value,
);

const buyLabel = computed(() => {
  if (noPrimaryPicked.value) return `Select a ${primaryNoun.value}`;
  if (primaryOutOfStock.value || comboOutOfStock.value) return 'Out of stock';
  return 'Buy Now';
});

const handleBuy = () => {
  if (buyDisabled.value || !product.value || !selectedVariant.value) return;
  cart.addItem({
    productId: product.value.id,
    variantId: selectedVariant.value.id,
    quantity: 1,
    name: product.value.title,
    image: currentImage.value,
    price: selectedVariant.value.price,
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
