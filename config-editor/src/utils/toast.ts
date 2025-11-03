export function showToast({ title = '', content = '', timeout = 3000 }) {
  const tCon = document.createElement('div')
  tCon.style.position = 'fixed'
  tCon.style.top = '20px'
  tCon.style.right = '20px'
  tCon.style.zIndex = '1000'

  const tEl = document.createElement('div')
  tEl.style.backgroundColor = 'rgba(0, 0, 0, 0.8)'
  tEl.style.color = 'white'
  tEl.style.borderRadius = '5px'
  tEl.style.padding = '10px'
  tEl.style.marginBottom = '10px'
  tEl.style.maxWidth = '300px'
  tEl.style.wordBreak = 'break-word'

  if (title) {
    const titleElement = document.createElement('div')
    titleElement.style.fontWeight = 'bold'
    titleElement.style.marginBottom = '5px'
    titleElement.textContent = title
    tEl.appendChild(titleElement)
  }

  const contentElement = document.createElement('div')
  contentElement.textContent = content
  tEl.appendChild(contentElement)

  tCon.appendChild(tEl)
  document.body.appendChild(tCon)

  setTimeout(() => {
    tCon.removeChild(tEl)
    if (tCon.children.length === 0) {
      document.body.removeChild(tCon)
    }
  }, timeout)
}
