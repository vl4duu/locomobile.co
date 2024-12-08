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
import radioTowerIcon from '../assets/images/radio-tower-red.png'
import whiteLogo from "../assets/images/locomobile-title.png";

const defaultIconStyle = {height: '100%', width: '100%', paddingBottom: 10, paddingRight: 10}


function renderIcon(icon, classname, styling = defaultIconStyle) {
  return () => h(NIcon, null, {default: () => h(icon, {class: classname, style: styling})});
}

const menuOptions = [
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
      },
      {
        label: "",
        key: "links-header",
        icon: () => h(renderIcon(Link, 'links-header', {width: '130%', height: '130%'}),
            {style: {}}),
        class: "links-header",
        children: [
          {
            type: "group",
            label: () => h(
                'h3',
                'Catch me !'
            ),
            key: "Links",
            children: [
              {
                label: "Youtube",
                key: "youtube",
                icon: renderIcon(LogoYoutube, defaultIconStyle, 'youtube', {width: '100%', height: '100%'}),
              },
              {
                label: "Mixcloud",
                key: "mixcloud",
                icon: renderIcon(Mixcloud, defaultIconStyle, 'mixcloud', {width: '100%', height: '100%'}),
              }
            ]
          },
          {
            label: "Twitch",
            key: "twitch",
            icon: renderIcon(LogoTwitch, 'twitch', {width: '100%', height: '100%'}),
          },
          {
            label: "contact@locomobile.co",
            icon: renderIcon(AlternateEmailFilled, 'email', {width: '100%', height: '100%'}),
            key: "email"
          }
        ]
      }
    ]
;

export default defineComponent({
  components: {NMenu, NSplit},
  setup() {
    return {
      menuOptions
    };
  }
});

</script>

<template>
  <n-split
      :default-size="100" class="navbar"
      style="display:
      flex; align-items:
      center;
      height: 150px;"
  >
    <template #1>
      <n-menu
          v-model:value="activeKey"
          mode="horizontal"
          :options="menuOptions"
          responsive
          key="menu"
      />
    </template>
  </n-split>
</template>


<style src="../assets/Navbar/stylesheet.css"></style>
<style scoped src="../assets/Navbar/scopedStylesheet.css"></style>
