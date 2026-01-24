<template>
  <canvas ref="sceneContainer" class="webgl" v-show="!loading"

  ></canvas>
</template>

<script>
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader';
import NavBar from "@/components/NavBar.vue";
import LoadingAnimation from "@/components/LoadingAnimation.vue";

export default {
  name: 'ThreeGLBScene',
  components: {LoadingAnimation, NavBar},
  data() {
    return {
      loading: true,
      displaySize: {width: null, height: null},
      defaultFov: 40,
      loadPercent: null
    }
  },
    created() {
      // Non-reactive Three.js objects
      this.scene = null;
      this.camera = null;
      this.renderer = null;
      this.mixer = null;
      this.model = null;
      this.clock = new THREE.Clock();
      this.animationId = null;

      // Safari detection
      const ua = navigator.userAgent.toLowerCase();
      this.isSafari = ua.indexOf('safari') !== -1 && ua.indexOf('chrome') === -1;
      this.isIOS = /ipad|iphone|ipod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    },
  async mounted() {
    if (!this.isWebGLAvailable()) {
      console.error("WebGL is not supported on this device/browser.");
      this.loading = false;
      return;
    }
    this.initThree();
    this.addEventListeners()
    this.loadScene();
    this.animate();
  },
  beforeUnmount() {
    this.removeEventListeners()
    this.disposeThree();
  },
  methods: {
    isWebGLAvailable() {
      try {
        const canvas = document.createElement('canvas');
        return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
      } catch (e) {
        return false;
      }
    },
    initThree() {
      console.log("Initializing Three.js scene...");
      if (this.scene) {
        this.scene.traverse(obj => {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
            else obj.material.dispose();
          }
        });
      }
      this.scene = new THREE.Scene();

      const canvas = this.$refs.sceneContainer;
      if (!canvas) {
        console.error("Canvas container not found!");
        return;
      }

      if (this.renderer) {
        this.renderer.dispose();
      }

      try {
        this.renderer = new THREE.WebGLRenderer({
          canvas,
          antialias: !this.isIOS, // Disable antialias on iOS for performance
          alpha: true,
          powerPreference: "high-performance",
          precision: this.isIOS ? "lowp" : "mediump",
          stencil: false
        });
        console.log("Renderer created successfully");
      } catch (e) {
        console.error("Failed to create WebGL renderer:", e);
        return;
      }
      
      // iOS performance and compatibility settings
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = this.isSafari ? THREE.BasicShadowMap : THREE.PCFSoftShadowMap;
      this.renderer.toneMapping = THREE.NoToneMapping;
      this.renderer.setClearColor(0x000000, 0); // Transparent background
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      
      console.log("Renderer initialized. Capabilities:", {
        maxAnisotropy: this.renderer.capabilities.getMaxAnisotropy(),
        maxPrecision: this.renderer.capabilities.precision,
        isWebGL2: this.renderer.capabilities.isWebGL2
      });
    },
    handleContextLost(event) {
      event.preventDefault();
      console.warn('WebGL Context Lost');
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
      }
    },
    handleContextRestored() {
      console.info('WebGL Context Restored');
      this.initThree();
      this.loadScene();
      this.animate();
    },
    loadScene: function () {
      const loadingManager = new THREE.LoadingManager(() => {
        this.loading = false;
        this.$nextTick(() => {
          this.updateCameraAspect();
        });
        this.$emit('loaded');
      });

      const loader = new GLTFLoader(loadingManager)
      loader.load(
          '/spinning-disc.gltf',
          (gltf) => {
            this.model = gltf.scene;
            this.scene.add(this.model);
            this.setupScene(gltf);
          },
          undefined,
          (error) => {
            console.error('An error happened during loading the GLTF model', error);
          }
      );
    },
    setupScene: function (gltf) {
      this.setupAnimationMixer(gltf);
      this.setupCamera();
      this.setupLight();
      this.setupDisc()
      this.setupBackDrop();
    },
    setupAnimationMixer: function (gltf) {
      if (gltf.animations.length > 0) {
        this.mixer = new THREE.AnimationMixer(this.model);
        this.mixer.clipAction(gltf.animations[0]).play();
      }
    },
    setupCamera: function () {
      const sceneCamera = this.model.getObjectByName('front_view_camera');
      if (sceneCamera) {
        this.camera = sceneCamera;
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
      } else {
        console.warn("Camera 'front_view_camera' not found, creating default.");
        this.camera = new THREE.PerspectiveCamera(this.defaultFov, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 0, 5);
      }
    },
    setupLight: function () {
      const sceneLight = this.model.getObjectByName('light');
      if (sceneLight) {
        sceneLight.intensity = 130
        sceneLight.castShadow = true
        // Reduce shadow map size for Safari/mobile. 1024 or 512 is safer for Safari performance.
        let shadowRes = 2048;
        if (this.isSafari || this.isIOS) {
          shadowRes = window.innerWidth < 768 ? 512 : 1024;
        } else if (window.innerWidth < 768) {
          shadowRes = 1024;
        }
        
        sceneLight.shadow.mapSize.width = shadowRes;
        sceneLight.shadow.mapSize.height = shadowRes;
        sceneLight.shadow.camera.near = 0.5;
        sceneLight.shadow.camera.far = 500;
        sceneLight.shadow.bias = -0.0005;
        sceneLight.shadow.radius = this.isSafari ? 1 : 4; // Lower radius for BasicShadowMap on Safari
        sceneLight.shadow.intensity = .65
      }
    },
    setupDisc: function () {
      const disc = this.model.getObjectByName('spinning_disc');
      if (disc) {
        disc.castShadow = true;

        // Clarify texture
        const maxAnisotropy = this.renderer.capabilities.getMaxAnisotropy();
        disc.traverse((child) => {
          if (child.isMesh && child.material) {
            const materials = Array.isArray(child.material) ? child.material : [child.material];
            materials.forEach((mat) => {
              // Apply to all texture maps
              ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap'].forEach((mapName) => {
                if (mat[mapName]) {
                  // Cap anisotropy for Safari/mobile performance
                  const targetAnisotropy = (this.isSafari || this.isIOS) ? 2 : 4;
                  mat[mapName].anisotropy = Math.min(maxAnisotropy, targetAnisotropy);
                  mat[mapName].minFilter = this.isSafari ? THREE.LinearFilter : THREE.LinearMipmapLinearFilter;
                  mat[mapName].magFilter = THREE.LinearFilter;
                  mat[mapName].needsUpdate = true;
                }
              });
            });
          }
        });
      }
    },
    setupBackDrop: function () {
      const backDrop = this.model.getObjectByName('back_drop');
      if (backDrop) {
        backDrop.receiveShadow = true;
        backDrop.castShadow = true;
      }
    },
    animate() {
      this.animationId = requestAnimationFrame(this.animate);

      const delta = this.clock.getDelta();
      
      // Basic frame skipping for Safari if performance is an issue
      // In a real scenario, we'd measure FPS, but here we provide a hook
      if (this.isSafari && this.frameCount === undefined) this.frameCount = 0;
      if (this.isSafari) {
        this.frameCount++;
        if (this.frameCount % 2 === 0 && this.lowFPSMode) return; // Skip every other frame if in low FPS mode
      }

      if (this.camera && this.scene && this.renderer) {
        this.renderer.render(this.scene, this.camera);
      }

      // Skip mixer updates when delta is below threshold
      if (this.mixer && delta > 0.001) {
        this.mixer.update(delta);
      }
      
      // Simple FPS monitoring
      if (!this.lastFrameTime) this.lastFrameTime = performance.now();
      const now = performance.now();
      const frameTime = now - this.lastFrameTime;
      this.lastFrameTime = now;
      
      if (frameTime > 33.3) { // Lower than 30fps
        this.lowFPSCount = (this.lowFPSCount || 0) + 1;
        if (this.lowFPSCount > 60) { // Persistent low FPS
          this.lowFPSMode = true;
        }
      }
    },
    onWindowResize() {
      this.updateCameraAspect();
    },
    updateCameraAspect() {
      if (!this.camera || !this.renderer) return;
      
      this.displaySize.width = window.innerWidth;
      this.displaySize.height = window.innerHeight;

      const aspectRatio = this.displaySize.width / this.displaySize.height;
      this.camera.aspect = aspectRatio;

      this.camera.fov = aspectRatio < 1 ? this.defaultFov / aspectRatio : this.defaultFov

      this.camera.updateProjectionMatrix();
      this.renderer.setSize(this.displaySize.width, this.displaySize.height);

      // Cap pixel ratio at 1.5x for Safari/iOS, 2x for others
      const maxPixelRatio = (this.isSafari || this.isIOS) ? 1.5 : 2;
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxPixelRatio));
    },
    addEventListeners: function () {
      window.addEventListener('resize', this.onWindowResize, {passive: true});
      
      const canvas = this.$refs.sceneContainer;
      if (canvas) {
        canvas.addEventListener('webglcontextlost', this.handleContextLost, false);
        canvas.addEventListener('webglcontextrestored', this.handleContextRestored, false);
      }
    },
    removeEventListeners: function () {
      window.removeEventListener('resize', this.onWindowResize);

      const canvas = this.$refs.sceneContainer;
      if (canvas) {
        canvas.removeEventListener('webglcontextlost', this.handleContextLost);
        canvas.removeEventListener('webglcontextrestored', this.handleContextRestored);
      }
    },
    disposeThree() {
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
      }
      
      if (this.renderer) {
        this.renderer.dispose();
      }

      if (this.scene) {
        this.scene.traverse((object) => {
          if (!object.isMesh) return;

          object.geometry.dispose();

          if (object.material.isMaterial) {
            this.cleanMaterial(object.material);
          } else {
            // an array of materials
            for (const material of object.material) this.cleanMaterial(material);
          }
        });
      }
      
      this.scene = null;
      this.camera = null;
      this.renderer = null;
      this.mixer = null;
      this.model = null;
    },
    cleanMaterial(material) {
      material.dispose();

      // dispose textures
      for (const key of Object.keys(material)) {
        const value = material[key];
        if (value && value instanceof THREE.Texture) {
          value.dispose();
        }
      }
    }
  },
}
</script>
<style>
.webgl {
  position: fixed;
  top: 0;
  left: 0;
  outline: none;
  z-index: 0;
  pointer-events: none;
}

html,
body {
  overflow-x: hidden;
}
</style>