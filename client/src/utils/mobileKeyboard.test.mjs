import test from 'node:test'
import assert from 'node:assert/strict'
import { installKeyboardAwareness, isTextEntry } from './mobileKeyboard.js'

test('reconhece campos que abrem o teclado', () => {
  assert.equal(isTextEntry({ tagName: 'INPUT', type: 'text' }), true)
  assert.equal(isTextEntry({ tagName: 'INPUT', type: 'email' }), true)
  assert.equal(isTextEntry({ tagName: 'INPUT' }), true)
  assert.equal(isTextEntry({ tagName: 'TEXTAREA' }), true)
  assert.equal(isTextEntry({ tagName: 'INPUT', type: 'checkbox' }), false)
  assert.equal(isTextEntry({ tagName: 'BUTTON' }), false)
  assert.equal(isTextEntry(null), false)
})

function fakeWindow({ touch }) {
  const listeners = {}
  const doc = {
    activeElement: null,
    documentElement: { dataset: {} },
    addEventListener: (name, fn) => { listeners[name] = fn },
    removeEventListener: (name) => { delete listeners[name] },
  }
  return {
    document: doc,
    listeners,
    matchMedia: () => ({ matches: touch }),
    setTimeout: (fn) => fn(),
  }
}

test('marca teclado aberto só em aparelho de toque', () => {
  const phone = fakeWindow({ touch: true })
  installKeyboardAwareness(phone)
  phone.document.activeElement = { tagName: 'INPUT', type: 'text' }
  phone.listeners.focusin()
  assert.equal(phone.document.documentElement.dataset.keyboard, 'open')

  phone.document.activeElement = { tagName: 'BODY' }
  phone.listeners.focusout()
  assert.equal(phone.document.documentElement.dataset.keyboard, undefined)

  const desktop = fakeWindow({ touch: false })
  installKeyboardAwareness(desktop)
  desktop.document.activeElement = { tagName: 'INPUT', type: 'text' }
  desktop.listeners.focusin()
  assert.equal(desktop.document.documentElement.dataset.keyboard, undefined)
})
