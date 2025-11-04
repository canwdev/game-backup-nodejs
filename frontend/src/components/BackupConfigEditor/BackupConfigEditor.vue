<script setup lang="ts">
import type { IConfigItem } from '@backend/types/config.ts'
import { VERSION } from '@backend/types/version.ts'
import { onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import InsertVariable from '@/components/BackupConfigEditor/InsertVariable.vue'
import { showToast } from './utils/toast.ts'

const configList = ref<IConfigItem[]>([])
// FileHandle 用于 File System Access API
const fileHandle = ref<FileSystemFileHandle | null>(null)
const editingIndex = ref<number>(-1) // -1 表示新增

interface IEditForm extends IConfigItem {
  _srcFiles: string
  _exclude: string
  _include: string
}

// 编辑表单的响应式状态
const initialEditFormState: IEditForm = {
  name: '',
  type: 'folder',
  srcPath: '',
  destPath: '',
  isGitBackup: false,
  ignorePathCheck: false,
  disabled: false,
  transfers: undefined as number | undefined,
  checkers: undefined as number | undefined,
  _srcFiles: '',
  _exclude: '',
  _include: '',
}
const editForm = reactive<IEditForm>({ ...initialEditFormState })

// DOM 引用
const editDialogRef = ref<HTMLDialogElement | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)

const rawJsonInput = ref('')
watch(configList, (newValue) => {
  rawJsonInput.value = JSON.stringify(newValue, null, 2)
}, {
  deep: true,
})

/**
 * 将多行文本（Textarea 输入）处理为 string[] 或 string 或 undefined
 */
function processMultiLineInput(str: string | null | undefined): string[] | undefined {
  if (!str)
    return undefined
  console.log(str)
  const lines = str.split('\n').map(s => s.trim()).filter(Boolean)
  if (lines.length === 0)
    return undefined
  return lines
}

/**
 * 将 Config 中的 string[] 或 string 格式化为 Textarea 文本
 */
function formatForTextarea(data: string | string[] | undefined): string {
  if (Array.isArray(data)) {
    return data.join('\n')
  }
  return data || ''
}

/**
 * 从路径中提取最后一个段落作为名称
 */
function extractLastSegment(path: string): string {
  path = path.replace(/[\\/]+$/, '') // 移除尾部斜杠
  return path.match(/[/\\]([^/\\]*)$/)?.[1] || path
}

/**
 * 加载并解析 JSON 内容
 */
function loadContent(content: string) {
  try {
    const newConfigData = JSON.parse(content)
    if (!Array.isArray(newConfigData)) {
      throw new TypeError('JSON root must be an array.')
    }
    configList.value = newConfigData as IConfigItem[]
    showToast({ content: 'Config loaded.' })
  }
  catch (err: any) {
    console.error('Error parsing JSON:', err)
    alert(`Error parsing JSON: ${err.message}`)
  }
}

// --- 事件处理函数 ---

// 键盘事件: Ctrl+S/Cmd+S 保存
function handleKeyDown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault()
    handleSave()
  }
}

// New Config 按钮
function newConfig() {
  configList.value = []
  fileHandle.value = null
  showToast({ content: 'New config created.' })
}

// Load JSON File 按钮
async function loadJsonFile() {
  if (window.showOpenFilePicker) {
    try {
      [fileHandle.value] = await window.showOpenFilePicker({
        types: [{ description: 'JSON Files', accept: { 'application/json': ['.json'] } }],
      })
      const file = await fileHandle.value!.getFile()
      const content = await file.text()
      loadContent(content)
    }
    catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Error loading file:', err)
        alert(`Error loading file: ${err.message}`)
      }
    }
  }
  else {
    // 兼容模式
    fileInputRef.value?.click()
  }
}

// 兼容模式的文件选择
function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file)
    return

  const reader = new FileReader()
  reader.onload = (e) => {
    loadContent(e.target?.result as string)
    fileHandle.value = null // 兼容模式没有 handle
  }
  reader.onerror = (e) => {
    console.error('Error reading file:', e)
    alert('Error reading file.')
  }
  reader.readAsText(file)

  target.value = '' // 重置 file input
}

// Save JSON File 按钮
async function handleSave() {
  const jsonString = rawJsonInput.value

  if (window.showSaveFilePicker) {
    try {
      if (!fileHandle.value) {
        fileHandle.value = await window.showSaveFilePicker({
          types: [{ description: 'JSON Files', accept: { 'application/json': ['.json'] } }],
        })
      }
      const writable = await fileHandle.value.createWritable()
      await writable.write(jsonString)
      await writable.close()
      showToast({ content: 'Save success.' })
    }
    catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Error saving file:', err)
        alert(`Error saving file: ${err.message}`)
      }
    }
  }
  else {
    // 兼容模式
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'config.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
}

// Apply Changes 按钮 (从 Raw JSON 更新 configList)
function applyJsonChanges() {
  try {
    const newConfigData = JSON.parse(rawJsonInput.value)
    if (!Array.isArray(newConfigData)) {
      throw new TypeError('The root of the JSON must be an array.')
    }
    configList.value = newConfigData as IConfigItem[]
    showToast({ content: 'JSON applied successfully, please save it manually.' })
  }
  catch (err: any) {
    alert(`Invalid JSON: ${err.message}`)
  }
}

// --- Dialog/Form 处理 ---

function openEditDialog(index: number = -1) {
  editingIndex.value = index
  Object.assign(editForm, initialEditFormState) // 重置表单

  if (index !== -1) {
    const config = configList.value[index] as IConfigItem
    // 填充表单
    editForm.name = config.name || ''
    editForm.type = config.type || 'folder'
    editForm._srcFiles = formatForTextarea(config.srcFiles)
    editForm.srcPath = config.srcPath || ''
    editForm.destPath = config.destPath || ''
    editForm.isGitBackup = !!config.isGitBackup
    editForm.ignorePathCheck = !!config.ignorePathCheck
    editForm.disabled = !!config.disabled
    editForm._exclude = formatForTextarea(config.exclude)
    editForm._include = formatForTextarea(config.include)
    editForm.transfers = config.transfers
    editForm.checkers = config.checkers
  }

  editDialogRef.value?.showModal()
}

function closeEditDialog() {
  editDialogRef.value?.close()
}

function resetEditForm() {
  // Dialog 关闭时触发
  editingIndex.value = -1
  Object.assign(editForm, initialEditFormState)
}

function generateName() {
  const path = editForm.srcPath || ''
  editForm.name = extractLastSegment(path) || `backup_${Date.now()}`
}

function submitEditForm() {
  const index = editingIndex.value

  // 构造新的配置对象
  const newConfig: IConfigItem = {
    name: editForm.name,
    type: editForm.type,
    srcFiles: processMultiLineInput(editForm._srcFiles),
    srcPath: editForm.srcPath,
    destPath: editForm.destPath || undefined,
    isGitBackup: editForm.isGitBackup || undefined,
    ignorePathCheck: editForm.ignorePathCheck || undefined,
    disabled: editForm.disabled || undefined,
    exclude: processMultiLineInput(editForm._exclude),
    include: processMultiLineInput(editForm._include),
    transfers: (editForm.transfers !== undefined && editForm.transfers > 0) ? editForm.transfers : undefined,
    checkers: (editForm.checkers !== undefined && editForm.checkers > 0) ? editForm.checkers : undefined,
  }

  // 检查名称唯一性
  const findIndex = configList.value.findIndex(c => c.name === newConfig.name)
  if (findIndex !== -1 && findIndex !== index) {
    alert('Configuration name must be unique.')
    return
  }

  // 移除 undefined 的字段以保持 JSON 简洁
  Object.keys(newConfig).forEach(key => newConfig[key as keyof IConfigItem] === undefined && delete newConfig[key as keyof IConfigItem])

  if (index === -1) {
    configList.value.push(newConfig)
  }
  else {
    configList.value[index] = newConfig
  }

  closeEditDialog()
}

function deleteConfig(index: number) {
  if (confirm(`Are you sure you want to delete "${configList.value[index]!.name}"?`)) {
    configList.value.splice(index, 1)
  }
}

// --- 拖放事件处理 ---

const isDragging = ref(false)
function handleDragOver() {
  isDragging.value = true
  // 允许放置
}

function handleDragLeave() {
  isDragging.value = false
}

async function handleDrop(e: DragEvent) {
  isDragging.value = false

  fileHandle.value = null
  let file: File | null = null

  // 尝试使用 File System Access API
  if (e.dataTransfer?.items && window.showOpenFilePicker) {
    for (const item of e.dataTransfer.items) {
      if (item.kind === 'file' && 'getAsFileSystemHandle' in item) {
        try {
          // @ts-ignore
          const handle = await item.getAsFileSystemHandle()
          if (handle.kind !== 'directory') {
            file = await handle.getFile()
            fileHandle.value = handle as FileSystemFileHandle
            break
          }
        }
        catch (error) {
          console.error('Error getting file handle:', error)
        }
      }
    }
  }

  if (!file && e.dataTransfer?.files?.[0]) {
    file = e.dataTransfer.files[0]
  }

  if (file && file.type === 'application/json') {
    const reader = new FileReader()
    reader.onload = (event) => {
      loadContent(event.target?.result as string)
    }
    reader.readAsText(file)
  }
  else {
    alert('Please drop a valid JSON file.')
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeyDown)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeyDown)
})
</script>

<template>
  <div
    class="config-editor-root" :class="{ isDragging }" @dragover.prevent="handleDragOver" @dragleave="handleDragLeave"
    @drop.prevent="handleDrop"
  >
    <h1>Backup Config Editor v{{ VERSION }}</h1>

    <div class="toolbar">
      <button class="c-button button-primary" @click="newConfig">
        New Config
      </button>
      <button class="c-button button-primary" @click="loadJsonFile">
        Load JSON File
      </button>
      <button class="c-button button-primary" @click="handleSave">
        Save JSON File
      </button>
    </div>

    <div class="c-container">
      <div class="c-panel">
        <div class="panel-header">
          <h2>Configurations</h2>
          <button class="c-button button-primary" @click="openEditDialog()">
            Add New
          </button>
        </div>
        <div class="config-list-container">
          <p v-if="configList.length === 0">
            No configuration loaded. Click "Load JSON File", "New Config File", or drop
            a file here.
          </p>
          <div
            v-for="(config, index) in configList" :key="index"
            class="config-item" :class="[{ disabled: config.disabled }]"
          >
            <div class="config-item-content">
              <div class="config-item-name">
                {{ config.name }}
              </div>
              <div class="config-item-path">
                {{ config.srcPath }}
              </div>
            </div>
            <div class="config-item-actions">
              <button class="c-button button-primary" @click="openEditDialog(index)">
                Edit
              </button>
              <button class="c-button button-danger" @click="deleteConfig(index)">
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="c-panel">
        <div class="panel-header">
          <h2>Raw JSON</h2>
          <button class="c-button button-primary" @click="applyJsonChanges">
            Apply Changes
          </button>
        </div>
        <textarea
          v-model="rawJsonInput" class="raw-json-editor"
          placeholder="Raw JSON editor"
        />
      </div>
    </div>

    <dialog ref="editDialogRef" class="c-dialog" @close="resetEditForm">
      <form @submit.prevent="submitEditForm">
        <div class="title-wrapper">
          <h2>{{ editingIndex === -1 ? 'Add New Configuration' : 'Edit Configuration' }}</h2>
          <div class="form-actions">
            <button class="c-button" type="button" @click="closeEditDialog">
              Cancel
            </button>
            <button class="c-button button-primary" type="submit">
              OK
            </button>
          </div>
        </div>

        <input name="index" type="hidden" :value="editingIndex">
        <div class="form-grid">
          <label for="configName"><b class="color-danger">*</b> Type:</label>
          <div class="input-group">
            <label for="typeFolder" style="margin-right: 10px;">
              <input id="typeFolder" v-model="editForm.type" type="radio" value="folder"> Folder
            </label>
            <label for="typeFiles" style="margin-right: 10px;">
              <input id="typeFiles" v-model="editForm.type" type="radio" value="files"> Files
            </label>
          </div>

          <label for="configName"><b class="color-danger">*</b> Name:</label>
          <div class="input-group">
            <input id="configName" v-model="editForm.name" autocomplete="off" placeholder="Unique name" required type="text">
            <button class="c-button" type="button" @click="generateName">
              ↺
            </button>
          </div>

          <template v-if="editForm.type === 'folder'">
            <label for="srcPath"><b class="color-danger">*</b> Source Path:</label>
            <div class="input-group">
              <input
                id="srcPath"
                v-model="editForm.srcPath" class="variable-input-target" autocomplete="off"
                placeholder="Path to the source directory"
                required type="text"
              >
              <InsertVariable />
            </div>
          </template>
          <template v-else>
            <label for="exclude"><b class="color-danger">*</b> Source Files:</label>
            <div class="input-group">
              <textarea
                id="exclude"
                v-model="editForm._srcFiles" class="variable-input-target"
                placeholder="One path per line" required
              />
              <InsertVariable />
            </div>
          </template>

          <label for="destPath">Destination Path:</label>
          <div class="input-group">
            <input
              id="destPath"
              v-model="editForm.destPath" class="variable-input-target" autocomplete="off"
              placeholder="Optional. Default: ./backup/${name}" type="text"
            >
            <InsertVariable />
          </div>

          <label>Options:</label>
          <div class="input-group">
            <label for="disabled" style="text-align: left;">
              <input id="disabled" v-model="editForm.disabled" type="checkbox"> Disabled
            </label>
            <label for="isGitBackup" style="text-align: left;">
              <input id="isGitBackup" v-model="editForm.isGitBackup" type="checkbox"> Use Git Backup
            </label>
            <label for="ignorePathCheck" style="text-align: left;">
              <input id="ignorePathCheck" v-model="editForm.ignorePathCheck" type="checkbox"> Ignore Path Check
            </label>
          </div>

          <template v-if="editForm.type === 'folder'">
            <label for="exclude">Exclude:</label>
            <textarea
              id="exclude" v-model="editForm._exclude"
              placeholder="Optional. One pattern per line. Example:&#10;**&#10;**/Cache/*&#10;History_*.*&#10;DiskSearch.db"
            />

            <label for="include">Include:</label>
            <textarea
              id="include" v-model="editForm._include"
              placeholder="Optional. One pattern per line. Example:&#10;.gitconfig&#10;.ssh/**"
            />

            <label for="transfers">Transfers:</label>
            <input
              id="transfers" v-model.number="editForm.transfers" min="0" placeholder="Optional. Default: 32"
              type="number"
            >

            <label for="checkers">Checkers:</label>
            <input
              id="checkers" v-model.number="editForm.checkers" min="0" placeholder="Optional. Default: 64"
              type="number"
            >
          </template>
        </div>
      </form>
    </dialog>

    <input ref="fileInputRef" accept=".json" style="display: none;" type="file" @change="handleFileSelect">
  </div>
</template>

<style lang="scss">
.config-editor-root {
  margin: 0 auto;
  max-width: 1600px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  height: 100%;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(109, 109, 109, 0.2);
    outline: 2px dashed var(--primary-color);
    outline-offset: -10px;
    pointer-events: none;
    display: none;
  }

  &.isDragging::after {
    display: block;
  }

  h1 {
    margin-top: 0;
    border-bottom: 1px solid var(--border-color);
    padding-bottom: 10px;
  }

  h2 {
    margin: 0;
  }

  .toolbar {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
    flex-wrap: wrap;
  }

  .c-button {
    padding: 8px 15px;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: background-color 0.2s ease;
  }

  .c-button:active {
    opacity: 0.7;
  }

  .button-primary {
    background-color: var(--primary-color);
    color: white;
  }

  .button-danger {
    color: var(--danger-color);
  }

  .color-danger {
    color: var(--danger-color);
  }

  .c-container {
    display: flex;
    flex-grow: 1;
    gap: 16px;
    min-height: 0;
  }

  .c-panel {
    flex: 1;
    background-color: var(--main-color);
    border-radius: 8px;
    box-shadow: 0 2px 5px var(--shadow-color);
    padding: 20px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  .panel-header h2 {
    margin: 0;
  }

  .config-list-container {
    overflow-y: auto;
    margin-left: -20px;
    margin-right: -20px;
  }

  .config-list-container p {
    padding: 0 20px;
  }

  .config-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 20px;
    border-bottom: 1px solid var(--border-color);
    gap: 8px;
  }

  .config-item:hover {
    background-color: rgba(187, 187, 187, 0.1);
  }

  .config-item:last-child {
    border-bottom: none;
  }

  .config-item-name {
    font-weight: 600;
  }

  .config-item-path {
    font-size: 0.9em;
    color: #666;
    word-break: break-all;
  }

  .config-item.disabled .config-item-content {
    opacity: 0.5;
    text-decoration: line-through;
  }

  .config-item-actions {
    display: flex;
    gap: 10px;
  }

  .raw-json-editor {
    flex-grow: 1;
    width: 100%;
    font-family: Consolas, monospace;
    font-size: 14px;
    border: 1px solid var(--border-color);
    border-radius: 5px;
    padding: 10px;
    resize: vertical;
    background-color: transparent;
    color: inherit;
  }

  .c-dialog {
    border: 1px solid var(--border-color);
    border-radius: 8px;
    box-shadow: 0 5px 15px var(--shadow-color);
    padding: 20px;
    width: 80%;
    max-width: 700px;
    background-color: var(--main-color);
    color: var(--text-color);
  }

  .c-dialog::backdrop {
    background: rgba(0, 0, 0, 0.5);
    /*backdrop-filter: blur(2px);*/
  }

  .form-grid {
    display: grid;
    grid-template-columns: 120px 1fr;
    gap: 15px;
    align-items: start;
  }

  .form-grid label {
    font-weight: 500;
    text-align: right;
  }

  .form-grid input[type='text'],
  .form-grid input[type='number'],
  select,
  .form-grid textarea {
    width: 100%;
    padding: 8px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    box-sizing: border-box;
    font-family: Consolas, monospace;
    font-size: 15px;
    background-color: var(--main-color);
    color: var(--text-color);
  }

  .form-grid textarea {
    height: 80px;
    resize: vertical;
    font-family: Consolas, monospace;
  }

  .form-grid .input-group {
    display: flex;
    gap: 10px;
    align-items: center;
    position: relative;
  }

  .title-wrapper {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 26px;
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
  }
}
</style>
