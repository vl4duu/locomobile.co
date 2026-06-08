import { reactive, watch } from 'vue'
import { API_BASE_URL } from '@/config'

const STORAGE_KEY = 'cart'
const hasWindow = typeof window !== 'undefined'

// Item shape: { productId, variantId, quantity, name, image, price }
// `name`/`image`/`price` are display-only — the backend re-derives the
// canonical name + price from { productId, variantId } at checkout (Task 5).
// `price` (cents) is kept locally for the cart total and refreshed on hydrate.

function readStored() {
  if (!hasWindow) return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    // Migration: drop carts saved under the old { name, price, image, cartId }
    // shape (no variantId). Acceptable to lose in-flight carts on rollout.
    if (parsed.some((it) => !it || it.variantId == null)) return []
    return parsed.map((it) => ({
      productId: it.productId,
      variantId: it.variantId,
      quantity: Math.max(1, Math.floor(Number(it.quantity)) || 1),
      name: it.name,
      image: it.image,
      price: Number(it.price) || 0,
    }))
  } catch {
    return []
  }
}

export const cart = reactive({
  items: readStored(),
  // Transient user-facing notices from revalidation (price changes, removals).
  notices: [],

  addItem(item) {
    const existing = this.items.find((i) => i.variantId === item.variantId)
    if (existing) {
      existing.quantity += item.quantity || 1
      return
    }
    this.items.push({
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity || 1,
      name: item.name,
      image: item.image,
      price: Number(item.price) || 0,
    })
  },

  incrementQuantity(variantId) {
    const it = this.items.find((i) => i.variantId === variantId)
    if (it) it.quantity += 1
  },

  decrementQuantity(variantId) {
    const it = this.items.find((i) => i.variantId === variantId)
    if (!it) return
    if (it.quantity <= 1) {
      this.removeItem(variantId)
    } else {
      it.quantity -= 1
    }
  },

  setQuantity(variantId, quantity) {
    const it = this.items.find((i) => i.variantId === variantId)
    if (!it) return
    const q = Math.floor(Number(quantity))
    if (!Number.isFinite(q) || q <= 0) {
      this.removeItem(variantId)
      return
    }
    it.quantity = q
  },

  removeItem(variantId) {
    this.items = this.items.filter((i) => i.variantId !== variantId)
  },

  clearCart() {
    this.items = []
  },

  dismissNotice(index) {
    this.notices.splice(index, 1)
  },

  // Available items only — unavailable items are excluded from the payable total.
  get total() {
    return this.items.reduce(
      (sum, i) => (i._unavailable ? sum : sum + (i.price || 0) * i.quantity),
      0,
    )
  },

  get hasUnavailable() {
    return this.items.some((i) => i._unavailable)
  },
})

// --- Revalidation on hydrate ----------------------------------------------
// For each persisted item, confirm it's still enabled and re-sync its price
// against the backend. Stale price → update + notice; disabled → flag.
export async function revalidateCart() {
  if (!hasWindow) return
  await Promise.all(
    cart.items.map(async (item) => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/products/${item.productId}/variants/${item.variantId}`,
        )
        if (!res.ok) return
        const { enabled, price } = await res.json()
        if (!enabled) {
          item._unavailable = true
          cart.notices.push(`"${item.name}" is no longer available.`)
          return
        }
        delete item._unavailable
        if (typeof price === 'number' && price !== item.price) {
          const was = (item.price / 100).toFixed(2)
          const now = (price / 100).toFixed(2)
          item.price = price
          cart.notices.push(`Price of "${item.name}" updated from $${was} to $${now}.`)
        }
      } catch {
        // Network hiccup — leave the item as-is; re-checked at next hydrate.
      }
    }),
  )
}

if (hasWindow) {
  // Persist on any change.
  watch(
    () => cart.items,
    (items) => {
      try {
        const serialized = JSON.stringify(
          items.map(({ productId, variantId, quantity, name, image, price }) => ({
            productId,
            variantId,
            quantity,
            name,
            image,
            price,
          })),
        )
        // Skip identical writes — stops a cross-tab `storage` echo loop, where
        // rehydrating from another tab's write would re-write the same value.
        if (serialized === localStorage.getItem(STORAGE_KEY)) return
        localStorage.setItem(STORAGE_KEY, serialized)
      } catch {
        // Quota/availability errors are non-fatal.
      }
    },
    { deep: true },
  )

  // Cross-tab sync. The spec fires `storage` only in *other* tabs; compare
  // defensively anyway.
  window.addEventListener('storage', (e) => {
    if (e.key !== STORAGE_KEY) return
    cart.items = readStored()
  })

  // Kick off revalidation once on load if there's anything to check.
  if (cart.items.length) revalidateCart()
}
