<script setup>
import { computed } from 'vue';

const props = defineProps({
  data: {
    type: Object,
    default: null
  }
});

const message = computed(() => {
  return props.data?.message || 'No data available';
});
</script>

<template>
  <div class="api-test">
    <h2>API Test</h2>
    <p>{{ message }}</p>
  </div>
</template>

<style scoped>
.api-test {
  margin: 20px;
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 5px;
  background-color: #f9f9f9;
}
</style>
