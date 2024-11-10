<template>
  <div ref="sceneContainer" class="scene-container"></div>
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
      mouse: new THREE.Vector2(),
      rotationTarget: new THREE.Vector2(),
      windowHalfX: window.innerWidth / 2,
      windowHalfY: window.innerHeight / 2,
      instance: getCurrentInstance(),
      elements: [],
      clock: new THREE.Clock(),
      mixer: null,
      renderer: null,
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
      this.setupAnimationMixer(gltf);
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
      sceneLight.shadow.mapSize.width = 16384; // default
      sceneLight.shadow.mapSize.height = 16384; // default
      sceneLight.shadow.blur = 10;
      sceneLight.shadow.intensity = .65
      sceneLight.shadow.blur = 2
      console.log(new THREE.WebGLRenderer().capabilities)
    },
    setupDisc: function () {
      const disc = this.instance.proxy.$scene.children[0].children.find((item) => item.name === 'spinning_disc')

      // disc.receiveShadow = true;
      disc.castShadow = true;
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
      let targetX = mouse.x * .0001
      let targetY = mouse.y * .0001

      let scene = this.instance.proxy.$scene.children[0]

      if (scene) {
        rotationTarget.x += .3 * targetY - scene.rotation.x
        rotationTarget.y += targetX - scene.rotation.y
        scene.rotation.set(rotationTarget.x, rotationTarget.y, scene.rotation.z)
      }
    },
    onWindowResize() {
      // this.updateCameraAspect();
    },
    updateCameraAspect() {
      const width = window.innerWidth;
      const height = window.innerHeight;

      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();

      this.renderer.setSize(width, height);
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
.scene-container {
  overflow: clip;
  position: absolute;
  top: 0;
  left: 0;
  outline: none;
}
</style>