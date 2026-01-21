import { reactive } from 'vue'

export const cart = reactive({
  items: [],
  
  addItem(item) {
    this.items.push({
      ...item,
      cartId: Date.now() + Math.random()
    })
  },
  
  removeItem(cartId) {
    this.items = this.items.filter(item => item.cartId !== cartId)
  },
  
  clearCart() {
    this.items = []
  },

  get total() {
    return this.items.reduce((sum, item) => sum + (item.price || 0), 0)
  }
})
