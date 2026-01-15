<script>
import {defineComponent, h} from "vue";
import { navigation } from '@/navigation';
import { API_BASE_URL } from '@/config';
import {NIcon, NMenu, NSplit} from "naive-ui";
import {
  LogoYoutube,
  LogoTwitch,
} from "@vicons/ionicons5";
import {Mixcloud} from "@vicons/fa";
import {AlternateEmailFilled} from "@vicons/material";
import {Link} from "@vicons/tabler";
import radioTowerIcon from '../assets/images/radio-tower.png'
import whiteLogo from "../assets/images/locomobile-title.png";
import dollarSign from "../assets/images/white-dollar-sign.png";

const defaultIconStyle = {height: '100%', width: '100%', paddingBottom: 10, paddingRight: 10}


function renderIcon(icon, classname, styling = defaultIconStyle) {
  return () => h(NIcon, null, {default: () => h(icon, {class: classname, style: styling})});
}

const handleCheckout = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      console.error('Failed to create checkout session', data.error);
    }
  } catch (error) {
    console.error('Error during checkout:', error);
  }
};

export default defineComponent({
  components: {NMenu, NSplit},
  setup() {
    const handleLogoClick = () => {
      navigation.navigate('home');
    };

    const mainMenuOptions = [
      {
        icon: () => h("img", {
          src: radioTowerIcon,
          alt: "Custom Icon",
          class: 'radio-tower',
          onClick: handleLogoClick,
          style: { cursor: 'pointer' }
        }),
        label: () => h(
            "img",
            {
              src: whiteLogo,
              alt: "Custom Icon",
              class: 'locomobile-title',
              onClick: handleLogoClick,
              style: { cursor: 'pointer' }
            },
            "Locomobile"
        ),
        type: 'text'
      }
    ];

    const linksMenuOptions = [
      {
        label: "",
        key: "donate",
        icon: () => h("img", {
          src: dollarSign,
          alt: "Donate",
          class: 'dollar-sign',
          onClick: handleCheckout,
          style: { cursor: 'pointer' }
        }),
        type: 'text'
      }
    ];

    return {
      mainMenuOptions,
      linksMenuOptions
    };
  }
});

</script>

<template>
  <div class="navbar-container">
    <div class="navbar-left">
      <n-menu
          v-model:value="activeKey"
          mode="horizontal"
          :options="mainMenuOptions"
          responsive
          key="menu"
      />
    </div>
    <div class="navbar-right">
      <n-menu
          v-model:value="activeKey"
          mode="horizontal"
          :options="linksMenuOptions"
          responsive
          key="menu-right"
      />
    </div>
  </div>
</template>


<style src="../assets/styles/Navbar/stylesheet.css"></style>
<style scoped src="../assets/styles/Navbar/scopedStylesheet.css"></style>
<style scoped>
.navbar-container {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  z-index: 9999;
  height: 180px;
  padding: 25px 20px 0;
  
  /* Use a combination of a gradient and a noise texture for a "static" effect */
  background: 
    url("data:image/svg+xml,%3Csvg viewBox='0 0 250 250' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3CfeComponentTransfer%3E%3CfeFuncA type='linear' slope='0.22'/%3E%3C/feComponentTransfer%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E"),
    linear-gradient(
      to bottom, 
      rgba(24, 24, 24, 1) 0%, 
      rgba(24, 24, 24, 0.98) 6%, 
      rgba(24, 24, 24, 0.89) 12%, 
      rgba(24, 24, 24, 0.819) 18%, 
      rgba(24, 24, 24, 0.73) 24%, 
      rgba(24, 24, 24, 0.628) 30%, 
      rgba(24, 24, 24, 0.518) 36%, 
      rgba(24, 24, 24, 0.407) 42%, 
      rgba(24, 24, 24, 0.3) 48%, 
      rgba(24, 24, 24, 0.203) 54%, 
      rgba(24, 24, 24, 0.122) 60%, 
      rgba(24, 24, 24, 0.061) 67%, 
      rgba(24, 24, 24, 0.022) 74%, 
      rgba(24, 24, 24, 0.005) 82%, 
      rgba(24, 24, 24, 0.001) 90%, 
      rgba(24, 24, 24, 0) 100%
    );
  
  /* Make the static effect visible but blended */
  background-blend-mode: soft-light;
  animation: static-move 0.2s infinite;
  opacity: 1;

  backdrop-filter: blur(10px);
  
  /* Mask gradient for smooth transition of the blur and background */
  -webkit-mask-image: linear-gradient(
    to bottom, 
    black 0%, 
    rgba(0, 0, 0, 1) 35%, 
    rgba(0, 0, 0, 0.966) 40.7%, 
    rgba(0, 0, 0, 0.884) 46.1%, 
    rgba(0, 0, 0, 0.771) 51.1%, 
    rgba(0, 0, 0, 0.641) 55.9%, 
    rgba(0, 0, 0, 0.508) 60.5%, 
    rgba(0, 0, 0, 0.381) 64.9%, 
    rgba(0, 0, 0, 0.269) 69.2%, 
    rgba(0, 0, 0, 0.176) 73.4%, 
    rgba(0, 0, 0, 0.106) 77.6%, 
    rgba(0, 0, 0, 0.057) 81.9%, 
    rgba(0, 0, 0, 0.026) 86.2%, 
    rgba(0, 0, 0, 0.009) 90.6%, 
    rgba(0, 0, 0, 0) 100%
  );
  mask-image: linear-gradient(
    to bottom, 
    black 0%, 
    rgba(0, 0, 0, 1) 35%, 
    rgba(0, 0, 0, 0.966) 40.7%, 
    rgba(0, 0, 0, 0.884) 46.1%, 
    rgba(0, 0, 0, 0.771) 51.1%, 
    rgba(0, 0, 0, 0.641) 55.9%, 
    rgba(0, 0, 0, 0.508) 60.5%, 
    rgba(0, 0, 0, 0.381) 64.9%, 
    rgba(0, 0, 0, 0.269) 69.2%, 
    rgba(0, 0, 0, 0.176) 73.4%, 
    rgba(0, 0, 0, 0.106) 77.6%, 
    rgba(0, 0, 0, 0.057) 81.9%, 
    rgba(0, 0, 0, 0.026) 86.2%, 
    rgba(0, 0, 0, 0.009) 90.6%, 
    rgba(0, 0, 0, 0) 100%
  );
}

.navbar-left {
  flex: 1;
}

@keyframes static-move {
  0% { background-position: 0 0, 0 0; }
  10% { background-position: 10px 10px, 0 0; }
  20% { background-position: -10px 5px, 0 0; }
  30% { background-position: 15px -10px, 0 0; }
  40% { background-position: -5px 15px, 0 0; }
  50% { background-position: 10px -5px, 0 0; }
  60% { background-position: -15px 10px, 0 0; }
  70% { background-position: 5px -15px, 0 0; }
  80% { background-position: -10px -10px, 0 0; }
  90% { background-position: 15px 5px, 0 0; }
  100% { background-position: 0 0, 0 0; }
}
</style>
