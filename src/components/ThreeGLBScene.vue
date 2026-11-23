<template>
  <canvas ref="sceneContainer" class="webgl" v-show="!loading"

  ></canvas>
</template>

<script>
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader';
import {debugFlags} from "@/utils/debugFlags";

export default {
  name: 'ThreeGLBScene',
  emits: ['loaded'],
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
      this.ready = false; // set once warmUp() has uploaded textures and compiled shaders

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
    if (debugFlags.perf || debugFlags.capture) {
      const dbg = await import("@/utils/sceneDebug.js");
      if (debugFlags.perf) this.perf = dbg.createPerfMonitor(this.renderer, () => this.scene);
      if (debugFlags.capture) this.captureApi = dbg.installCaptureApi(this);
    }
    this.addEventListeners()
    this.loadScene();
    if (!debugFlags.capture) this.animate();
  },
  beforeUnmount() {
    this.removeEventListeners()
    this.disposeThree();
    if (this.perf) this.perf.dispose();
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
          antialias: debugFlags.noAA ? false : !this.isIOS, // Disable antialias on iOS for performance
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
      this.renderer.shadowMap.enabled = !debugFlags.noShadow;
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
      this.ready = false;
      const loadingManager = new THREE.LoadingManager(async () => {
        await this.warmUp();
        this.loading = false;
        this.$emit('loaded');
        if (this.captureApi) this.captureApi.markReady();
      });

      const loader = new GLTFLoader(loadingManager)
      loader.load(
          debugFlags.model || '/spinning-disc.glb',
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
    // Upload textures, compile shaders and draw the first frame while the loading screen is
    // still up, so the big one-off GPU stall never lands during the fade-in.
    async warmUp() {
      if (!this.renderer || !this.scene || !this.camera) return;
      this.updateCameraAspect();
      try {
        await this.renderer.compileAsync(this.scene, this.camera);
      } catch (e) {
        console.warn('Shader pre-compilation failed, compiling on first frame instead', e);
      }
      if (!this.renderer) return; // unmounted while compiling
      this.scene.traverse((obj) => {
        if (!obj.isMesh) return;
        for (const mat of Array.isArray(obj.material) ? obj.material : [obj.material]) {
          for (const value of Object.values(mat)) {
            if (value && value.isTexture) this.renderer.initTexture(value);
          }
        }
      });
      this.renderer.render(this.scene, this.camera);
      this.ready = true;
    },
    setupScene: function (gltf) {
      this.setupAnimationMixer(gltf);
      this.setupCamera();
      this.setupLight();
      this.setupDisc()
      this.setupBackDrop();
      if (debugFlags.noMaps) this.stripMaps();
    },
    stripMaps() {
      this.model.traverse((child) => {
        if (!child.isMesh) return;
        for (const mat of Array.isArray(child.material) ? child.material : [child.material]) {
          for (const [key, value] of Object.entries(mat)) {
            if (value && value.isTexture) mat[key] = null;
          }
          mat.needsUpdate = true;
        }
      });
    },
    setupAnimationMixer: function (gltf) {
      if (gltf.animations.length > 0) {
        this.mixer = new THREE.AnimationMixer(this.model);
        this.mixer.clipAction(gltf.animations[0]).play();
        this.clipDuration = gltf.animations[0].duration;
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
        if (debugFlags.shadowRes) shadowRes = debugFlags.shadowRes;

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
        // Not a caster on purpose: it never shadows anything visible, but as a caster
        // it was drawn into several point-light cube faces every frame.
        backDrop.castShadow = false;
      }
    },
    animate() {
      this.animationId = requestAnimationFrame(this.animate);

      const delta = this.clock.getDelta();

      if (this.ready && this.camera && this.scene && this.renderer) {
        if (this.perf) this.perf.begin();
        this.renderer.render(this.scene, this.camera);
        if (this.perf) this.perf.end();
        if (debugFlags.static) {
          cancelAnimationFrame(this.animationId);
          return;
        }
      }

      // Skip mixer updates when delta is below threshold
      if (this.mixer && delta > 0.001) {
        this.mixer.update(delta);
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
      this.renderer.setPixelRatio(debugFlags.dpr ?? Math.min(window.devicePixelRatio, maxPixelRatio));
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

      if (this.scene) {
        this.scene.traverse((object) => {
          // Point-light shadow atlas is the single largest GPU allocation in the scene.
          if (object.isLight && object.shadow) object.shadow.dispose();
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

      if (this.renderer) {
        this.renderer.dispose();
        // Release the context (and its GPU memory) now instead of whenever GC gets to it;
        // every visit to the home page creates a fresh one.
        this.renderer.forceContextLoss();
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