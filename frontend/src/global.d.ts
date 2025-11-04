declare global {
  interface Window {
    showOpenFilePicker: (options: FilePickerOptions) => Promise<FileSystemFileHandle[]>
    showSaveFilePicker: (options: FilePickerOptions) => Promise<FileSystemFileHandle[]>
  }
}
