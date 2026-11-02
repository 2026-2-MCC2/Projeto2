import { readFileSync } from 'node:fs'

const TEMPLATES_PATH = new URL('../templates/emails/', import.meta.url)

const cache = new Map()

function readTemplate(fileName) {
  if (!cache.has(fileName)) cache.set(fileName, readFileSync(new URL(fileName, TEMPLATES_PATH), 'utf8'))
  return cache.get(fileName)
}

function getLogoBase64() {
  if (!cache.has('logo_base64')) {
    const buffer = readFileSync(new URL('logo.png', TEMPLATES_PATH))
    cache.set('logo_base64', buffer.toString('base64'))
  }
  return cache.get('logo_base64')
}

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => HTML_ESCAPES[character])

function fill(template, variables, escape) {
  return template.replace(/\{\{(\w+)\}\}/g, (match, name) => {
    if (!(name in variables)) throw new Error(`Email template variable "${name}" was not provided`)
    return escape(variables[name] ?? '')
  })
}

export class EmailTemplates {
  // cada e-mail tem <nome>.subject.txt, <nome>.html (dentro do layout base) e <nome>.txt
  static render(name, variables) {
    const body = fill(readTemplate(`${name}.html`), variables, escapeHtml)
    return {
      subject: fill(readTemplate(`${name}.subject.txt`), variables, String).trim(),
      html: readTemplate('base.html')
        .replace('{{conteudo}}', body)
        .replace('{{logo}}', getLogoBase64())
        .replaceAll('{{ano}}', String(new Date().getFullYear())),
      text: fill(readTemplate(`${name}.txt`), variables, String),
    }
  }
}
