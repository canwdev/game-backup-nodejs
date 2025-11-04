<script lang="ts" setup>
withDefaults(
  defineProps<{
    label?: string
    href?: string
  }>(),
  {
    label: 'Star me on Github',
    href: '',
  },
)
</script>

<template>
  <a class="stgh" :href="href" target="_blank" style="">{{ label }}</a>
</template>

<style lang="scss" scoped>
.stgh {
  position: absolute;
  top: 4px;
  right: 4px;
  opacity: 0.3;
  font-size: 12px;
  color: inherit;
  font-style: italic;
}
</style>
