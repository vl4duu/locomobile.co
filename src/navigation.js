import { reactive } from 'vue'

export const navigation = reactive({
  currentView: 'home',
  params: {},
  lenis: null,
  
  setLenis(instance) {
    this.lenis = instance
  },

  navigate(view, params = {}) {
    this.currentView = view
    this.params = params
    
    if (this.lenis) {
      this.lenis.scrollTo(0, { immediate: true })
    } else {
      window.scrollTo(0, 0)
    }
  }
})
