<script lang="ts" setup="">
import {ref} from "vue";

const props = withDefaults(
  defineProps<{}>(),
  {},
)
const emit = defineEmits(['insertVariable'])
// 插入变量下拉框的状态
const selectedVariable = ref<string>('')

const selectRef = ref()
const insertVariable = () => {
  if (selectedVariable.value) {
    const input = selectRef.value.parentElement?.querySelector('.variable-input-target')
    if (input) {
      input.focus()
      input.value = input.value + selectedVariable.value
    } else {
      emit('insertVariable', selectedVariable.value)
    }

    selectedVariable.value = '' // 使用后重置
  }
}
</script>

<template>
  <select ref="selectRef" v-model="selectedVariable" @change="insertVariable" class="variable-select">
    <option disabled value="">+ Variable:</option>
    <option value="%USERPROFILE%">%USERPROFILE%</option>
    <option value="%APPDATA%">%APPDATA%</option>
    <option value="%LOCALAPPDATA%">%LOCALAPPDATA%</option>
    <option value="%SystemRoot%">%SystemRoot%</option>
    <option value="%windir%">%windir%</option>
    <option value="%SystemDrive%">%SystemDrive%</option>
    <option value="%ProgramData%">%ProgramData%</option>
    <option value="%ProgramFiles%">%ProgramFiles%</option>
    <option value="%ProgramFiles(x86)%">%ProgramFiles(x86)%</option>
  </select>
</template>

<style lang="scss" scoped>
.variable-select {
  width: 40px;
  height: 22px;
  padding: 0 4px;
  position: absolute;
  top: 0;
  right: 0;
}
</style>
