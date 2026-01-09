<template>
  <canvas ref="sceneContainer" class="webgl" v-show="!loading"

  ></canvas>
</template>

<script>
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader';
import {getCurrentInstance} from 'vue'
import NavBar from "@/components/NavBar.vue";
import LoadingAnimation from "@/components/LoadingAnimation.vue";

export default {
  name: 'ThreeGLBScene',
  components: {LoadingAnimation, NavBar},
  data() {
    return {
      loading: true,
      mouse: new THREE.Vector2(),
      rotationTarget: new THREE.Vector2(),
      displaySize: {width: null, height: null},
      windowHalfX: window.innerWidth / 2,
      windowHalfY: window.innerHeight / 2,

      /**Used to store scene data */
      instance: getCurrentInstance(),
      elements: [],

      clock: new THREE.Clock(),
      mixer: null,

      camera: null,
      renderer: null,
      defaultFov: 40,

      loadPercent: null
    }
  },
  async mounted() {
    this.initThree();
    this.addEventListeners()
    this.loadScene();
    this.animate();
  },
  beforeDestroy() {
    this.removeEventListeners()
    if (this.renderer) {
      this.renderer.dispose();
    }
  },
  methods: {
    initThree() {
      const {proxy} = this.instance;
      proxy.$scene = new THREE.Scene();
      proxy.$elements = [];

      // Camera
      //Renderer does the job of rendering the graphics
      const canvas = document.querySelector('.webgl');

      this.renderer = new THREE.WebGLRenderer({canvas, antialias: true});
      this.renderer.setSize(this.$refs.sceneContainer.clientWidth, this.$refs.sceneContainer.clientHeight);

      //set up the renderer with the default settings for threejs.org/editor - revision r153
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.renderer.setPixelRatio(window.devicePixelRatio);
      this.renderer.toneMapping = 0;
      this.renderer.toneMappingExposure = 1
      this.renderer.useLegacyLights = false;
      this.renderer.toneMapping = THREE.NoToneMapping;
      this.renderer.setClearColor(949390, 0);
      this.renderer.outputColorSpace = THREE.SRGBColorSpace
      this.renderer.setClearColor(0x000000, 0); // Transparent background
    },
    loadScene: function () {
      const loadingManager = new THREE.LoadingManager(() => {
        this.loading = false
        this.$emit('loaded');
      });

      const loader = new GLTFLoader(loadingManager)
      loader.load(
          '/spinning-disc.gltf',
          (gltf) => {
            gltf.scene.traverse((obj) => {
              this.instance.proxy.$elements.push(obj)
            })

            for (let i = 1; i < this.instance.proxy.$elements.length; i++) {
              if (this.instance.proxy.$elements[i].name !== 'front_view_camera') {
                this.instance.proxy.$elements[0].add(this.instance.proxy.$elements[i]);
              }
            }
            this.instance.proxy.$scene.add(this.instance.proxy.$elements[0])

            const camera = this.instance.proxy.$elements.find((el) => el.name === 'front_view_camera');
            this.instance.proxy.$scene.add(camera);
            this.setupScene(gltf);

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
        this.mixer = new THREE.AnimationMixer(this.instance.proxy.$scene);
        this.mixer.clipAction(gltf.animations[0]).play();
      }
    },
    setupCamera: function () {
      const sceneCamera = this.instance.proxy.$scene.children[1]
      sceneCamera.aspect = this.$refs.sceneContainer.clientWidth / this.$refs.sceneContainer.clientHeight;
      this.camera = sceneCamera
    },
    setupLight: function () {
      const sceneLight = this.instance.proxy.$scene.children[0].children.find((item) => item.name === 'light')
      sceneLight.intensity = 130
      sceneLight.castShadow = true
      sceneLight.shadow.mapSize.width = 4096;
      sceneLight.shadow.mapSize.height = 4096;
      sceneLight.shadow.camera.near = 0.5;
      sceneLight.shadow.camera.far = 500;
      sceneLight.shadow.bias = -0.0005;
      sceneLight.shadow.radius = 4;
      sceneLight.shadow.intensity = .65
      console.log(new THREE.WebGLRenderer().capabilities)
    },
    setupDisc: function () {
      const disc = this.instance.proxy.$scene.children[0].children.find((item) => item.name === 'spinning_disc')
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
                mat[mapName].anisotropy = maxAnisotropy;
                mat[mapName].minFilter = THREE.LinearMipmapLinearFilter;
                mat[mapName].magFilter = THREE.LinearFilter;
                mat[mapName].needsUpdate = true;
              }
            });
          });
        }
      });
    },
    setupBackDrop: function () {
      const backDrop = this.instance.proxy.$scene.children[0].children.find((item) => item.name === 'back_drop')
      backDrop.receiveShadow = true;
      backDrop.castShadow = true;
    },
    animate() {
      requestAnimationFrame(this.animate);

      if (this.camera) {
        this.updateCameraAspect();
        this.renderer.render(this.instance.proxy.$scene, this.camera);
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

      let scene = this.instance.proxy.$scene.children[0]

      if (scene) {
        rotationTarget.x += .3 * targetY - scene.rotation.x
        rotationTarget.y += targetX - scene.rotation.y
        scene.rotation.set(rotationTarget.x, rotationTarget.y, scene.rotation.z)
      }
    },
    onWindowResize() {
      this.updateCameraAspect();
    },
    updateCameraAspect() {
      this.displaySize.width = window.innerWidth;
      this.displaySize.height = window.innerHeight;

      const aspectRatio = this.displaySize.width / this.displaySize.height;
      this.camera.aspect = (this.displaySize.width / this.displaySize.height);

      this.camera.fov = aspectRatio < 1 ? this.defaultFov / aspectRatio : this.defaultFov

      this.camera.updateProjectionMatrix();
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.setSize(this.displaySize.width, this.displaySize.height);
    },
    onMouseMove(event) {
      const {mouse, windowHalfX, windowHalfY} = this
      mouse.x = (event.clientX - windowHalfX)
      mouse.y = (event.clientY - windowHalfY)
    },
    addEventListeners: function () {
      window.addEventListener('resize', this.onWindowResize);
      window.addEventListener('mousemove', this.onMouseMove);
    },
    removeEventListeners: function () {
      window.removeEventListener('resize', this.onWindowResize);
      window.removeEventListener('mousemove', this.onMouseMove);
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
}

html,
body {
  overflow-x: hidden;
}
</style>