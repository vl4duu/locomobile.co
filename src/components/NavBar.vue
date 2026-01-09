<script>
import {defineComponent, h} from "vue";
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
    const response = await fetch('/api/create-checkout-session', {
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

const mainMenuOptions = [
      {
        icon: () => h("img", {
          src: radioTowerIcon,
          alt: "Custom Icon",
          class: 'radio-tower',
        }),
        label: () => h(
            "img",
            {
              src: whiteLogo,
              alt: "Custom Icon",
              class: 'locomobile-title'
            },
            "Locomobile"
        ),
        type: 'text'
      }
    ]
;

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
      }
    ]
;

export default defineComponent({
  components: {NMenu, NSplit},
  setup() {
    return {
      mainMenuOptions,
      linksMenuOptions
    };
  }
});

</script>

<template>
  <div class="navbar-container" style="display: flex; align-items: center; justify-content: space-between; position: fixed; top: 0; left: 0; width: 100%; z-index: 9999; height: 100px; padding: 0 20px;">
    <div class="navbar-left" style="flex: 1;">
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
