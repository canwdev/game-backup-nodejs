<script lang="ts" setup="">
import { ref } from 'vue'

const emit = defineEmits(['insertVariable'])
// 插入变量下拉框的状态
const selectedVariable = ref<string>('')

/**
 * 在输入框或文本域的光标位置插入文本
 * @param {HTMLInputElement | HTMLTextAreaElement} element - 输入框或文本域元素
 * @param {string} textToInsert - 要插入的文本
 */
function insertTextAtCursor(element: HTMLInputElement | HTMLTextAreaElement, textToInsert: string) {
  // 确保元素有焦点，以便 selectionStart/End 准确
  element.focus()

  // 1. 获取光标/选择的起始和结束位置
  const startPos = element.selectionStart
  const endPos = element.selectionEnd

  // 2. 构造新的文本内容
  // 使用 substring 方法将原始文本分成三部分：光标前、插入文本、光标后
  const currentValue = element.value
  element.value
    = currentValue.substring(0, startPos)
      + textToInsert
      + currentValue.substring(endPos, currentValue.length)

  // 3. 设置新的光标位置
  // 新的光标位置应该在插入文本的末尾
  const newCursorPos = startPos + textToInsert.length

  // 使用 setSelectionRange 将光标移动到新插入文本的末尾
  element.setSelectionRange(newCursorPos, newCursorPos)
}

const selectRef = ref()
function insertVariable() {
  if (selectedVariable.value) {
    const input = selectRef.value.parentElement?.querySelector('.variable-input-target')
    if (input) {
      input.focus()
      // input.value = input.value + selectedVariable.value
      insertTextAtCursor(input, selectedVariable.value)
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
