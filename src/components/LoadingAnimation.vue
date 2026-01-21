<!--https://codepen.io/aaroniker/pen/ZmOMJp-->

<template>
  <div class="loading-animation-wrapper">
    <div class="loading-content">
      <div class="boxes">
        <div class="box">
          <div></div>
          <div></div>
          <div></div>
          <div></div>
        </div>
        <div class="box">
          <div></div>
          <div></div>
          <div></div>
          <div></div>
        </div>
        <div class="box">
          <div></div>
          <div></div>
          <div></div>
          <div></div>
        </div>
        <div class="box">
          <div></div>
          <div></div>
          <div></div>
          <div></div>
        </div>
      </div>
      <p class="loading-text">Great Things Take Time....</p>
    </div>
  </div>

  <!-- dribbble -->
  <a class="dribbble" href="https://dribbble.com/shots/5533600-Loading-boxes" target="_blank"><img
      src="https://cdn.dribbble.com/assets/dribbble-ball-mark-2bd45f09c2fb58dbbfb44766d5d1d07c5a12972d602ef8b32204d28fa3dda554.svg"
      alt=""></a>
</template>

<style>
.loading-animation-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  background: url("data:image/svg+xml,%3Csvg viewBox='0 0 250 250' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3CfeComponentTransfer%3E%3CfeFuncA type='linear' slope='0.45'/%3E%3C/feComponentTransfer%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E"),
  rgba(0, 0, 0, 0.65);
  background-blend-mode: overlay;
  animation: static-move 0.2s infinite;
  backdrop-filter: blur(20px);
  isolation: isolate;
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 140px;
}

.loading-text {
  color: white;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
  letter-spacing: 1em;
  text-indent: 2.5em; /* Pushed a bit to the right as requested */
  text-align: center;
  position: relative;
  z-index: 10;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

@keyframes static-move {
  0% {
    background-position: 0 0;
  }
  100% {
    background-position: 10px 10px;
  }
}

.boxes {
  --size: 32px;
  --duration: 800ms;
  --color: #1dce7c;
  --colorRight: #12794b;
  --colorLeft: #1dce7c;
  --shadow: #801111;
  height: calc(var(--size) * 2);
  width: calc(var(--size) * 3);
  position: relative;
  transform-style: preserve-3d;
  transform-origin: 50% 50%;
  transform: rotateX(60deg) rotateZ(45deg) rotateY(0deg) translateZ(0px);
}

.boxes .box {
  width: var(--size);
  height: var(--size);
  top: 0;
  left: 0;
  position: absolute;
  transform-style: preserve-3d;
}

.boxes .box:nth-child(1) {
  transform: translate(100%, 0);
  animation: box1 var(--duration) linear infinite;
}

.boxes .box:nth-child(2) {
  transform: translate(0, 100%);
  animation: box2 var(--duration) linear infinite;
}

.boxes .box:nth-child(3) {
  transform: translate(100%, 100%);
  animation: box3 var(--duration) linear infinite;
}

.boxes .box:nth-child(4) {
  transform: translate(200%, 0);
  animation: box4 var(--duration) linear infinite;
}

.boxes .box > div {
  --background: var(--color);
  --top: auto;
  --right: auto;
  --bottom: auto;
  --left: auto;
  --translateZ: calc(var(--size) / 2);
  --rotateY: 0deg;
  --rotateX: 0deg;
  position: absolute;
  width: 100%;
  height: 100%;
  background: var(--background);
  top: var(--top);
  right: var(--right);
  bottom: var(--bottom);
  left: var(--left);
  transform: rotateY(var(--rotateY)) rotateX(var(--rotateX)) translateZ(var(--translateZ));
}

.boxes .box > div:nth-child(1) {
  --top: 0;
  --left: 0;
}

.boxes .box > div:nth-child(2) {
  --background: var(--colorRight);
  --right: 0;
  --rotateY: 90deg;
}

.boxes .box > div:nth-child(3) {
  --background: var(--colorLeft);
  --rotateX: -90deg;
}

.boxes .box > div:nth-child(4) {
  --background: var(--shadow);
  --top: 0;
  --left: 0;
  --translateZ: calc(var(--size) * 3 * -1);
}

@keyframes box1 {
  0%,
  50% {
    transform: translate(100%, 0);
  }
  100% {
    transform: translate(200%, 0);
  }
}

@keyframes box2 {
  0% {
    transform: translate(0, 100%);
  }
  50% {
    transform: translate(0, 0);
  }
  100% {
    transform: translate(100%, 0);
  }
}

@keyframes box3 {
  0%,
  50% {
    transform: translate(100%, 100%);
  }
  100% {
    transform: translate(0, 100%);
  }
}

@keyframes box4 {
  0% {
    transform: translate(200%, 0);
  }
  50% {
    transform: translate(200%, 100%);
  }
  100% {
    transform: translate(100%, 100%);
  }
}

.dribbble {
  position: fixed;
  display: block;
  right: 20px;
  bottom: 20px;
}

.dribbble img {
  display: block;
  height: 28px;
}
</style>
<script setup lang="ts">
</script>