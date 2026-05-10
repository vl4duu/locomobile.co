<template>
  <div class="product-catalog">
    <canvas ref="noiseCanvas" class="noise-canvas" aria-hidden="true"></canvas>
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
        <div v-for="item in catalogItems" :key="`${item.productId}-${item.phoneModelValueId}`" class="product-card">
          <div class="product-image">
            <img :src="item.image" :alt="item.title" draggable="false"/>
          </div>
          <div class="product-info">
            <h3>{{ item.title }}</h3>
            <p class="product-subtitle">{{ item.productTitle }}</p>
            <p class="price">${{ (item.price / 100).toFixed(2) }}</p>
            <div class="card-actions">
              <button @click="router.push({ name: 'product-details', params: { id: item.productId }, query: { phone: item.phoneModelValueId } })" class="details-button">Details</button>
              <button @click="handleBuyNow(item)" class="buy-button">Buy Now</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { API_BASE_URL } from '@/config';
import { cart } from '@/cart';

const router = useRouter();
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

const catalogItems = computed(() => {
  const items = [];
  for (const product of products.value) {
    const sizeOption = product.options?.find(opt => opt.type === 'size');
    if (!sizeOption) continue;
    const sizeIndex = product.options.indexOf(sizeOption);

    for (const value of sizeOption.values) {
      const variants = product.variants?.filter(
        v => v.is_enabled && v.options[sizeIndex] === value.id
      );
      if (!variants?.length) continue;

      const defaultVariant = variants.find(v => v.is_default) ?? variants[0];
      const image = product.images?.find(img => img.variant_ids?.includes(defaultVariant.id))?.src
                 ?? product.images?.[0]?.src;
      const price = Math.min(...variants.map(v => v.price));

      items.push({
        productId: product.id,
        phoneModelValueId: value.id,
        title: value.title,
        productTitle: product.title,
        image,
        price,
      });
    }
  }
  return items;
});

const handleBuyNow = (item) => {
  cart.addItem({ name: `${item.title} – ${item.productTitle}`, price: item.price, image: item.image });
  router.push('/cart');
};
const noiseCanvas = ref(null);
let noiseRafId = null;
let noiseStop = false;
let noiseResizeObserver = null;

function startNoise() {
  const canvas = noiseCanvas.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const MIN_SCALE = 4;
  const MAX_PIXELS = 90000;
  const FRAME_INTERVAL_MS = 1000 / 18;

  let imageData = null;
  let buf = null;

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    let scale = MIN_SCALE;
    let w = Math.max(1, Math.floor(rect.width / scale));
    let h = Math.max(1, Math.floor(rect.height / scale));
    while (w * h > MAX_PIXELS) {
      scale += 1;
      w = Math.max(1, Math.floor(rect.width / scale));
      h = Math.max(1, Math.floor(rect.height / scale));
    }
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      imageData = ctx.createImageData(w, h);
      buf = imageData.data;
    }
  };

  resize();
  noiseResizeObserver = new ResizeObserver(resize);
  noiseResizeObserver.observe(canvas);

  let lastDraw = 0;
  const tick = (now) => {
    if (noiseStop) return;
    if (buf && now - lastDraw >= FRAME_INTERVAL_MS) {
      lastDraw = now;
      for (let i = 0; i < buf.length; i += 4) {
        const v = (Math.random() * 256) | 0;
        buf[i] = v;
        buf[i + 1] = v;
        buf[i + 2] = v;
        buf[i + 3] = 30;
      }
      ctx.putImageData(imageData, 0, 0);
    }
    noiseRafId = requestAnimationFrame(tick);
  };
  noiseRafId = requestAnimationFrame(tick);
}

onMounted(() => {
  fetchProducts();
  startNoise();
});

onBeforeUnmount(() => {
  noiseStop = true;
  if (noiseRafId) cancelAnimationFrame(noiseRafId);
  if (noiseResizeObserver) noiseResizeObserver.disconnect();
});
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
  background: rgba(0, 0, 0, 0.65);

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

.noise-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
}

.catalog-content {
  position: relative;
  z-index: 1;
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

.product-subtitle {
  font-size: 0.85rem;
  color: #888;
  margin-bottom: 0.5rem;
  margin-top: -0.5rem;
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
