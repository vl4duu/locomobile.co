<script setup>
import ThreeGLBScene from "@/components/ThreeGLBScene.vue";
import NavBar from "@/components/NavBar.vue";
import {ref} from 'vue'
const loaded = ref(false);
</script>


<template>
  <main>
    <NavBar/>
    <ThreeGLBScene @loaded="handleLoadEnd"/>
    <LoadingAnimation ref="loadingAnimationRef" :class="{loaded}" />
  </main>
</template>


<script>
import LoadingAnimation from "./components/LoadingAnimation.vue";

export default {
  components: {LoadingAnimation},
  methods: {
    handleLoadEnd() {
      console.log(this.$refs.loadingAnimationRef.value);
    }
  }
}
</script>
