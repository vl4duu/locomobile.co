<script>
import {defineComponent, h, ref} from "vue";
import {NIcon, NMenu, NSplit, darkTheme} from "naive-ui";
import {
  LogoYoutube,
  LinkOutline,
  LogoTwitch,
} from "@vicons/ionicons5";
import {Mixcloud} from "@vicons/fa";
import {AlternateEmailFilled} from "@vicons/material";
import {Link} from "@vicons/tabler";
import radioTowerIcon from '../assets/radio-tower-red.png'

const defaultIconStyle = {height: '1.5vw', width: '1.5vw', paddingBottom: 10, paddingRight: 10}


function renderIcon(icon, classname) {
  return () => h(NIcon, null, {default: () => h(icon, {class: classname})});
}

const menuOptions = [
      {
        icon: () => h("img", {
          src: radioTowerIcon,
          alt: "Custom Icon",
          class: 'radio-tower',
        }),
        label: () => h(
            "h2",
            {
              style: {fontWeight: "bold", paddingLeft: '30px'},
              class: 'locomobile-title'
            },
            "Locomobile"
        ),
        type: 'text'
      },
      {
        label: "",
        key: "links-header",
        icon: () => h(renderIcon(Link, {width: 25, height: 25}),
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
                icon: renderIcon(LogoYoutube, defaultIconStyle, 'youtube'),
              },
              {
                label: "Mixcloud",
                key: "mixcloud",
                icon: renderIcon(Mixcloud, defaultIconStyle, 'mixcloud'),
              }
            ]
          },
          {
            label: "Twitch",
            key: "twitch",
            icon: renderIcon(LogoTwitch, ),
          },
          {
            label: "contact@locomobile.co",
            icon: renderIcon(AlternateEmailFilled),
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

<!--<style src="../assets/Navbar/scopedStylesheet.css" scoped></style>-->
<!--<style src="../assets/Navbar/scopedStylesheet.css"></style>-->

<style src="../assets/Navbar/stylesheet.css"></style>
<style scoped src="../assets/Navbar/scopedStylesheet.css"></style>
