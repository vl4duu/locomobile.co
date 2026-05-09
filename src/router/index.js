import { createRouter, createWebHistory } from 'vue-router'
import { nextTick } from 'vue'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import HomeView from '@/views/HomeView.vue'
import ProductDetailsView from '@/views/ProductDetailsView.vue'
import PayList from '@/views/PayList.vue'
import { getLenis } from '@/lenis'

const routes = [
  { path: '/', name: 'home', component: HomeView },
  {
    path: '/products/:id',
    name: 'product-details',
    component: ProductDetailsView,
    props: route => ({
      id: route.params.id,
      phoneModelValueId: route.query.phone,
    }),
  },
  { path: '/cart', name: 'cart', component: PayList },
  { path: '/:pathMatch(.*)*', component: HomeView },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.afterEach(() => {
  const lenis = getLenis()
  if (lenis) {
    lenis.scrollTo(0, { immediate: true })
  } else {
    window.scrollTo(0, 0)
  }
  nextTick(() => {
    ScrollTrigger.refresh()
  })
})

export default router
