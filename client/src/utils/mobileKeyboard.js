const NON_TEXT_INPUT_TYPES = new Set([
  'button', 'checkbox', 'color', 'file', 'hidden', 'image', 'radio', 'range', 'reset', 'submit',
])

// Campos que abrem o teclado virtual do celular.
export function isTextEntry(element) {
  if (!element || !element.tagName) return false
  const tag = element.tagName.toUpperCase()
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (tag === 'INPUT') return !NON_TEXT_INPUT_TYPES.has(String(element.type || 'text').toLowerCase())
  return element.isContentEditable === true
}

// No iOS/Android a barra fixa do rodapé sobe junto com o teclado e cobre a lista.
// Marca <html data-keyboard="open"> enquanto um campo de texto está em foco para o
// CSS esconder a barra, como faz a tab bar de um app nativo.
export function installKeyboardAwareness(win = window) {
  const doc = win.document
  const touch = win.matchMedia?.('(hover: none) and (pointer: coarse)')
  if (!touch) return () => {}

  const sync = () => {
    const open = touch.matches && isTextEntry(doc.activeElement)
    if (open) doc.documentElement.dataset.keyboard = 'open'
    else delete doc.documentElement.dataset.keyboard
  }
  // focusout dispara antes do foco chegar no próximo campo; espera o foco assentar.
  const syncSoon = () => win.setTimeout(sync, 60)

  doc.addEventListener('focusin', sync)
  doc.addEventListener('focusout', syncSoon)
  return () => {
    doc.removeEventListener('focusin', sync)
    doc.removeEventListener('focusout', syncSoon)
    delete doc.documentElement.dataset.keyboard
  }
}
