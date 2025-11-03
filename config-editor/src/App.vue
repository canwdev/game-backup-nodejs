<script setup lang="ts">
import {onMounted, onBeforeUnmount, ref, reactive, watch, computed, nextTick} from 'vue'
import {type IConfigItem} from '@backend/types/config.ts'
import {VERSION} from '@backend/types/version.ts'
import {showToast} from '@/utils/toast.ts'

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
const editForm = reactive<IEditForm>({...initialEditFormState})

// DOM 引用
const editDialogRef = ref<HTMLDialogElement | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)

const rawJsonInput = ref('')
watch(configList, (newValue) => {
  rawJsonInput.value = JSON.stringify(newValue, null, 2)
}, {
  deep: true
})

// 插入变量下拉框的状态
const selectedVariable = ref<string>('')

/**
 * 将多行文本（Textarea 输入）处理为 string[] 或 string 或 undefined
 */
const processMultiLineInput = (str: string | null | undefined): string[] | undefined => {
  if (!str) return undefined
  console.log(str);
  const lines = str.split('\n').map(s => s.trim()).filter(Boolean)
  if (lines.length === 0) return undefined
  return lines
}

/**
 * 将 Config 中的 string[] 或 string 格式化为 Textarea 文本
 */
const formatForTextarea = (data: string | string[] | undefined): string => {
  if (Array.isArray(data)) {
    return data.join('\n')
  }
  return data || ''
}

/**
 * 从路径中提取最后一个段落作为名称
 */
const extractLastSegment = (path: string): string => {
  path = path.replace(/[\\/]+$/, '') // 移除尾部斜杠
  return path.match(/[\/\\]([^\/\\]*)$/)?.[1] || path
}

/**
 * 加载并解析 JSON 内容
 */
const loadContent = (content: string) => {
  try {
    const newConfigData = JSON.parse(content)
    if (!Array.isArray(newConfigData)) {
      throw new Error("JSON root must be an array.")
    }
    configList.value = newConfigData as IConfigItem[]
    showToast({content: 'Config loaded.'})
  } catch (err: any) {
    console.error('Error parsing JSON:', err)
    alert(`Error parsing JSON: ${err.message}`)
  }
}

// --- 事件处理函数 ---

// 键盘事件: Ctrl+S/Cmd+S 保存
const handleKeyDown = (e: KeyboardEvent) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault()
    handleSave()
  }
}

// New Config 按钮
const newConfig = () => {
  configList.value = []
  fileHandle.value = null
  showToast({content: 'New config created.'})
}

// Load JSON File 按钮
const loadJsonFile = async () => {
  if (window.showOpenFilePicker) {
    try {
      [fileHandle.value] = await window.showOpenFilePicker({
        types: [{description: 'JSON Files', accept: {'application/json': ['.json']}}],
      })
      const file = await fileHandle.value.getFile()
      const content = await file.text()
      loadContent(content)
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Error loading file:', err)
        alert(`Error loading file: ${err.message}`)
      }
    }
  } else {
    // 兼容模式
    fileInputRef.value?.click()
  }
}

// 兼容模式的文件选择
const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

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
const handleSave = async () => {
  const jsonString = rawJsonInput.value

  if (window.showSaveFilePicker) {
    try {
      if (!fileHandle.value) {
        fileHandle.value = await window.showSaveFilePicker({
          types: [{description: 'JSON Files', accept: {'application/json': ['.json']}}],
        })
      }
      const writable = await fileHandle.value.createWritable()
      await writable.write(jsonString)
      await writable.close()
      showToast({content: 'Save success.'})
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Error saving file:', err)
        alert(`Error saving file: ${err.message}`)
      }
    }
  } else {
    // 兼容模式
    const blob = new Blob([jsonString], {type: 'application/json'})
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
const applyJsonChanges = () => {
  try {
    const newConfigData = JSON.parse(rawJsonInput.value)
    if (!Array.isArray(newConfigData)) {
      throw new Error("The root of the JSON must be an array.")
    }
    configList.value = newConfigData as IConfigItem[]
    showToast({content: 'JSON applied successfully, please save it manually.'})
  } catch (err: any) {
    alert(`Invalid JSON: ${err.message}`)
  }
}

// --- Dialog/Form 处理 ---

const openEditDialog = (index: number = -1) => {
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
  selectedVariable.value = '' // 重置下拉框
}

const closeEditDialog = () => {
  editDialogRef.value?.close()
}

const resetEditForm = () => {
  // Dialog 关闭时触发
  editingIndex.value = -1
  Object.assign(editForm, initialEditFormState)
}

const generateName = () => {
  const path = editForm.srcPath || ''
  editForm.name = extractLastSegment(path) || `backup_${Date.now()}`
}

const insertVariable = () => {
  if (selectedVariable.value) {
    editForm.srcPath += selectedVariable.value
    selectedVariable.value = '' // 使用后重置
    // 由于 Vue 的 v-model，不需要手动 focus
  }
}

const submitEditForm = () => {
  const index = editingIndex.value

  // 构造新的配置对象
  const newConfig: IConfigItem = {
    name: editForm.name,
    type: editForm.type,
    // TODO: 处理类型
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
  } else {
    configList.value[index] = newConfig
  }

  closeEditDialog()
}

const deleteConfig = (index: number) => {
  if (confirm(`Are you sure you want to delete "${configList.value[index].name}"?`)) {
    configList.value.splice(index, 1)
  }
}

// --- 拖放事件处理 ---

const isDragging = ref(false)
const handleDragOver = (e: DragEvent) => {
  isDragging.value = true
  // 允许放置
}

const handleDragLeave = () => {
  isDragging.value = false
}

const handleDrop = async (e: DragEvent) => {
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
        } catch (error) {
          console.error("Error getting file handle:", error)
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
  } else {
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
  <div class="main-wrapper" @dragover.prevent="handleDragOver" @dragleave="handleDragLeave" @drop.prevent="handleDrop"
       :class="{isDragging}">
    <h1>Backup Config Editor v{{ VERSION }}</h1>

    <div class="toolbar">
      <button class="button button-primary" @click="newConfig">New Config</button>
      <button class="button button-primary" @click="loadJsonFile">Load JSON File</button>
      <button class="button button-primary" @click="handleSave">Save JSON File</button>
    </div>

    <div class="container">
      <div class="panel">
        <div class="panel-header">
          <h2>Configurations</h2>
          <button class="button button-primary" @click="openEditDialog()">Add New</button>
        </div>
        <div class="config-list-container">
          <p v-if="configList.length === 0">No configuration loaded. Click "Load JSON File", "New Config File", or drop
            a file here.</p>
          <div v-for="(config, index) in configList" :key="index"
               :class="['config-item', { 'disabled': config.disabled }]">
            <div class="config-item-content">
              <div class="config-item-name">{{ config.name }}</div>
              <div class="config-item-path">{{ config.srcPath }}</div>
            </div>
            <div class="config-item-actions">
              <button class="button button-primary" @click="openEditDialog(index)">Edit</button>
              <button class="button button-danger" @click="deleteConfig(index)">Delete</button>
            </div>
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-header">
          <h2>Raw JSON</h2>
          <button class="button button-primary" @click="applyJsonChanges">Apply Changes</button>
        </div>
        <textarea class="raw-json-editor" v-model="rawJsonInput"
                  placeholder="Raw JSON will be displayed here..."></textarea>
      </div>
    </div>
  </div>

  <dialog ref="editDialogRef" @close="resetEditForm">
    <form @submit.prevent="submitEditForm">
      <div class="title-wrapper">
        <h2>{{ editingIndex === -1 ? 'Add New Configuration' : 'Edit Configuration' }}</h2>
        <div class="form-actions">
          <button class="button" type="button" @click="closeEditDialog">Cancel</button>
          <button class="button button-primary" type="submit">OK</button>
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
          <input autocomplete="off" id="configName" v-model="editForm.name" placeholder="Unique" required type="text">
          <button class="button" type="button" @click="generateName">↺</button>
        </div>

        <template v-if="editForm.type === 'folder'">
          <label for="srcPath"><b class="color-danger">*</b> Source Path:</label>
          <div class="input-group">
            <input autocomplete="off" id="srcPath" v-model="editForm.srcPath" placeholder="Path to the source directory"
                   required type="text">
            <select v-model="selectedVariable" @change="insertVariable" style="width: 50px;">
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
          </div>
        </template>
        <template v-else>
          <label for="exclude"><b class="color-danger">*</b> Source Files:</label>
          <div class="input-group">
          <textarea id="exclude" v-model="editForm._srcFiles"
                    placeholder="One path per line." required></textarea>
          </div>
        </template>

        <label for="destPath">Destination Path:</label>
        <input autocomplete="off" id="destPath" v-model="editForm.destPath"
               placeholder="Optional. Default: ./backup/${name}" type="text">

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
          <textarea id="exclude" v-model="editForm._exclude"
                    placeholder="Optional. One pattern per line. Example:&#10;**&#10;**/Cache/*&#10;History_*.*&#10;DiskSearch.db"></textarea>

          <label for="include">Include:</label>
          <textarea id="include" v-model="editForm._include"
                    placeholder="Optional. One pattern per line. Example:&#10;.gitconfig&#10;.ssh/**"></textarea>

          <label for="transfers">Transfers:</label>
          <input id="transfers" min="0" v-model.number="editForm.transfers" placeholder="Optional. Default: 32"
                 type="number">

          <label for="checkers">Checkers:</label>
          <input id="checkers" min="0" v-model.number="editForm.checkers" placeholder="Optional. Default: 64"
                 type="number">
        </template>
      </div>
    </form>
  </dialog>

  <input accept=".json" ref="fileInputRef" style="display: none;" type="file" @change="handleFileSelect">
</template>
