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
    this.mouse = new THREE.Vector2();
    this.rotationTarget = new THREE.Vector2();
    this.windowHalfX = window.innerWidth / 2;
    this.windowHalfY = window.innerHeight / 2;
    this.animationId = null;
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
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
          precision: "mediump"
        });
        console.log("Renderer created successfully");
      } catch (e) {
        console.error("Failed to create WebGL renderer:", e);
        return;
      }
      
      // iOS performance and compatibility settings
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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
        // Reduce shadow map size for mobile if necessary, but 2048 is usually okay. 1024 is safer for older iPhones.
        const shadowRes = window.innerWidth < 768 ? 1024 : 2048;
        sceneLight.shadow.mapSize.width = shadowRes;
        sceneLight.shadow.mapSize.height = shadowRes;
        sceneLight.shadow.camera.near = 0.5;
        sceneLight.shadow.camera.far = 500;
        sceneLight.shadow.bias = -0.0005;
        sceneLight.shadow.radius = 4;
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
                  mat[mapName].anisotropy = Math.min(maxAnisotropy, 4); // Cap anisotropy for mobile performance
                  mat[mapName].minFilter = THREE.LinearMipmapLinearFilter;
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

      if (this.camera && this.scene && this.renderer) {
        this.renderer.render(this.scene, this.camera);
      }

      if (this.mixer) {
        this.mixer.update(this.clock.getDelta());
      }

      this.handleMouseMove()
    },
    handleMouseMove: function () {
      const {mouse, rotationTarget} = this
      let targetX = mouse.x * -.0001
      let targetY = mouse.y * -.0001

      if (this.model) {
        rotationTarget.x += .3 * targetY - this.model.rotation.x
        rotationTarget.y += targetX - this.model.rotation.y
        this.model.rotation.set(rotationTarget.x, rotationTarget.y, this.model.rotation.z)
      }
    },
    onWindowResize() {
      this.windowHalfX = window.innerWidth / 2;
      this.windowHalfY = window.innerHeight / 2;
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
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    },
    onMouseMove(event) {
      this.mouse.x = (event.clientX - this.windowHalfX)
      this.mouse.y = (event.clientY - this.windowHalfY)
    },
    onTouchMove(event) {
      if (event.touches.length > 0) {
        this.mouse.x = (event.touches[0].clientX - this.windowHalfX)
        this.mouse.y = (event.touches[0].clientY - this.windowHalfY)
      }
    },
    addEventListeners: function () {
      window.addEventListener('resize', this.onWindowResize, {passive: true});
      window.addEventListener('mousemove', this.onMouseMove, {passive: true});
      window.addEventListener('touchmove', this.onTouchMove, {passive: true});
      
      const canvas = this.$refs.sceneContainer;
      if (canvas) {
        canvas.addEventListener('webglcontextlost', this.handleContextLost, false);
        canvas.addEventListener('webglcontextrestored', this.handleContextRestored, false);
      }
    },
    removeEventListeners: function () {
      window.removeEventListener('resize', this.onWindowResize);
      window.removeEventListener('mousemove', this.onMouseMove);
      window.removeEventListener('touchmove', this.onTouchMove);

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
  touch-action: none;
}

html,
body {
  overflow-x: hidden;
}
</style>