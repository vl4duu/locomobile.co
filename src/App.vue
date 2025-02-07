<script setup>
import ThreeGLBScene from "@/components/ThreeGLBScene.vue";
import NavBar from "@/components/NavBar.vue";
import {ref} from 'vue'
import LoadingAnimation from "@/components/LoadingAnimation.vue";

const loaded = ref(false);

const handleLoadEnd = function () {
  loaded.value = true;
}
</script>


<template>
  <main>
    <NavBar/>
    <ThreeGLBScene @loaded="handleLoadEnd" v-show="loaded"/>
    <LoadingAnimation ref="loadingAnimationRef" v-if="!loaded"/>
  </main>
</template>

