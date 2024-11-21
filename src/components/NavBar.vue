<style scoped>
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 9999;
}

</style>
<script>
import {defineComponent, h, ref} from "vue";
import {NIcon, NMenu, NSplit} from "naive-ui";
import {
  BookOutline as BookIcon,
  PersonOutline as PersonIcon,
  WineOutline as WineIcon,
  LogoYoutube,
  LinkOutline
} from "@vicons/ionicons5";
import customIcon from '../assets/radio-tower-red.png'

function renderIcon(icon) {
  return () => h(NIcon, null, {default: () => h(icon)});
}

const menuOptions = [
  {
    icon: () => h("img", {
      src: customIcon,
      alt: "Custom Icon",
      style: {width: '5vh', height: '5vh'},
    }),
    label: () => h(
        "h3",
        {style: {fontWeight: "bold", paddingLeft: '30px', pointerEvents: 'none'}},
        "Locomobile"
    ),
    type: undefined,
  },
  {
    label: "",
    key: "links-header",
    icon: renderIcon(LinkOutline),
    style: "width: 50px; height: 50px;",
    children: [
      {
        type: "group",
        label: "Links",
        key: "Links",
        children: [
          {
            label: "Youtube",
            key: "narrator",
            icon: renderIcon(LogoYoutube),
          },
          {
            label: "Sheep Man",
            key: "sheep-man",
            icon: renderIcon(PersonIcon)
          }
        ]
      },
      {
        label: "Beverage",
        key: "beverage",
        icon: renderIcon(WineIcon),
        children: [
          {
            label: "Whisky",
            key: "whisky"
          }
        ]
      },
      {
        label: "Food",
        key: "food",
        children: [
          {
            label: "Sandwich",
            key: "sandwich"
          }
        ]
      },
      {
        label: "contact@locomobile.co",
        key: "the-past-increases-the-future-recedes"
      }
    ]
  }
];

export default defineComponent({
  components: {NMenu, NSplit},
  setup() {
    return {
      menuOptions
    };
  },
  data() {
    return {
      logoSrc: customIcon
    }
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
          icon-size="34"
          style="font-size: 1.5vh; "
      />
    </template>
  </n-split>
</template>
