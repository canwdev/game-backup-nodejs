<script lang="ts" setup="">
import { ref } from 'vue'

const emit = defineEmits(['insertVariable'])
// 插入变量下拉框的状态
const selectedVariable = ref<string>('')

const selectRef = ref()
function insertVariable() {
  if (selectedVariable.value) {
    const input = selectRef.value.parentElement?.querySelector('.variable-input-target')
    if (input) {
      input.focus()
      input.value = input.value + selectedVariable.value
    }
    else {
      emit('insertVariable', selectedVariable.value)
    }

    selectedVariable.value = '' // 使用后重置
  }
}
const optionValues = [
  '%USERPROFILE%',
  '%APPDATA%',
  '%LOCALAPPDATA%',
  '%SystemRoot%',
  '%windir%',
  '%SystemDrive%',
  '%ProgramData%',
  '%ProgramFiles%',
  '%ProgramFiles(x86)%',
]
</script>

<template>
  <select ref="selectRef" v-model="selectedVariable" class="variable-select" @change="insertVariable">
    <option disabled value="">
      % Variable:
    </option>
    <option v-for="value in optionValues" :key="value" :value="value">
      {{ value }}
    </option>
  </select>
</template>

<style lang="scss" scoped>
.variable-select {
  width: 32px;
  height: 22px;
  padding: 0 4px 0 0;
  position: absolute;
  top: 2px;
  right: 2px;
  border: none;
}
</style>
