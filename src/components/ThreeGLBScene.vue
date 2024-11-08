<template>
  <div ref="sceneContainer"></div>
</template>

<script>
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader';
import {getCurrentInstance} from 'vue'


export default {
  name: 'ThreeGLBScene',
  data() {
    return {
      camera: null,
      renderer: null,
      elements: [],
      instance: null,
      clock: null,
      mixer: null
    }
  },
  async mounted() {
    this.instance = getCurrentInstance();
    this.initThree();
    window.addEventListener('resize', this.onWindowResize);
    this.loadScene();
    this.animate();
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.onWindowResize);
    if (this.renderer) {
      this.renderer.dispose();
    }
  },
  methods: {
    initThree() {
      const {proxy} = this.instance;
      proxy.$scene = new THREE.Scene();
      this.clock = new THREE.Clock();
      proxy.$elements = [];

      // Camera
      const aspect = this.$refs.sceneContainer.clientWidth / this.$refs.sceneContainer.clientHeight;
      this.camera = new THREE.PerspectiveCamera(110, aspect, 0.1, 10000);
      this.camera.position.set(-13.021, 0.660, 11.823); // Adjust camera position
      this.camera.rotation.x = 2500
      this.camera.rotation.y = -150
      //Renderer does the job of rendering the graphics
      this.renderer = new THREE.WebGLRenderer({antialias: true});
      this.renderer.setSize(this.$refs.sceneContainer.clientWidth, this.$refs.sceneContainer.clientHeight);
      this.$refs.sceneContainer.appendChild(this.renderer.domElement);

      //set up the renderer with the default settings for threejs.org/editor - revision r153
      this.renderer.shadows = true;
      this.renderer.shadowType = 1;
      this.renderer.shadowMap.enabled = true;
      this.renderer.setPixelRatio(window.devicePixelRatio);
      this.renderer.toneMapping = 0;
      this.renderer.toneMappingExposure = 1
      this.renderer.useLegacyLights = false;
      this.renderer.toneMapping = THREE.NoToneMapping;
      this.renderer.setClearColor(949390, 0);
      // make sure three/build/three.module.js is over r152 or this feature is not available.
      this.renderer.outputColorSpace = THREE.SRGBColorSpace

    },

    loadScene: function () {
      const loader = new GLTFLoader()
      loader.load(
          '/spinning-disc.gltf', // Adjust the path as needed
          (gltf) => {
            // this.instance.proxy.$scene.add(gltf.scene)
            gltf.scene.traverse((obj) => {
              this.instance.proxy.$elements.push(obj)
            })
            this.instance.proxy.$elements.forEach((el) => {
              this.instance.proxy.$scene.add(el)
            })

            this.setupScene(gltf);

          },
          (xhr) => {
            // console.log((xhr.loaded / xhr.total * 100) + '% loaded');
          },
          (error) => {
            console.error('An error happened', error);
          }
      );

    },
    setupScene: function (gltf) {
      this.setupCamera();
      this.setupMixer(gltf);
      this.setupLight();
    },
    setupMixer: function (gltf) {
      if (gltf.animations.length > 0) {
        this.mixer = new THREE.AnimationMixer(this.instance.proxy.$scene);
        this.mixer.clipAction(gltf.animations[0]).play();
      }
    },
    setupCamera: function () {
      let sceneCamera = this.instance.proxy.$scene.children.find((item) => item.name === 'front_view_camera')
      this.camera = sceneCamera
    },
    setupLight: function () {
      let sceneLight = this.instance.proxy.$scene.children.find((item) => item.name === 'light')
      sceneLight.intensity = 160
      sceneLight.castShadow = true
    },
    setupDisc: function () {
    },
    setup: function () {
    },
    animate() {
      this.updateCameraAspect();
      requestAnimationFrame(this.animate);
      this.renderer.render(this.instance.proxy.$scene, this.camera);
      if (this.mixer) {
        this.mixer.update(this.clock.getDelta());
      }
    },
    onWindowResize() {
      console.log(1)
      this.updateCameraAspect();
    },
    updateCameraAspect() {
      const width = window.innerWidth;
      const height = window.innerHeight;
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    }
  }
}
</script>

<style>
.scene-container {
  width: 100%;
  height: 100vh;
  overflow: hidden;
}
</style>