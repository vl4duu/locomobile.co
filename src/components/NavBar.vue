<template>
  <n-split :default-size="500" class="navbar" style="display: flex; align-items: center; height: 80px;">
    <template #1>
      <n-menu
          v-model:value="activeKey"
          mode="horizontal"
          :options="menuOptions"
          responsive
      />
    </template>
  </n-split>
</template>
<style>
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  z-index: 1000;
}
body {
  font-size: 50px;
}
</style>
<script>
import {defineComponent, h, ref} from "vue";
import {NIcon, NMenu, NSplit} from "naive-ui";
import {
  BookOutline as BookIcon,
  PersonOutline as PersonIcon,
  WineOutline as WineIcon
} from "@vicons/ionicons5";


function renderIcon(icon) {
  return () => h(NIcon, null, {default: () => h(icon)});
}

const menuOptions = [
  {
    label: () => h(
        "a",
        {
          href: "https://en.wikipedia.org/wiki/Hear_the_Wind_Sing",
          target: "_blank",
          rel: "noopenner noreferrer"
        },
        "Hear the Wind Sing"
    ),
    key: "hear-the-wind-sing",
    icon: h("img", { src: "../assets/radio-tower.png", alt: "Custom Icon", style: "width: 24px; height: 24px;" })
  },
  {
    label: "Pinball 1973",
    key: "pinball-1973",
    icon: renderIcon(BookIcon),
    disabled: false,
    children: [
      {
        type: "group",
        label: "Rat",
        key: "rat"
      }
    ]
  },
  {
    label: "A Wild Sheep Chase",
    key: "a-wild-sheep-chase",
    disabled: true,
    icon: renderIcon(BookIcon)
  },
  {
    label: "Dance Dance Dance",
    key: "Dance Dance Dance",
    icon: renderIcon(BookIcon),
    children: [
      {
        type: "group",
        label: "People",
        key: "people",
        children: [
          {
            label: "Narrator",
            key: "narrator",
            icon: renderIcon(PersonIcon)
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
        label: "The past increases. The future recedes.",
        key: "the-past-increases-the-future-recedes"
      }
    ]
  }
];

export default defineComponent({
  components: {NMenu, NSplit},
  setup() {
    return {
      activeKey: ref(null),
      menuOptions
    };
  }
});
</script>