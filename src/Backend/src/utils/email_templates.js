import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const TEMPLATES_PATH = new URL('../templates/emails/', import.meta.url)
const LOGO_PATH = fileURLToPath(new URL('logo.png', TEMPLATES_PATH))

const cache = new Map()

function readTemplate(fileName) {
  if (!cache.has(fileName)) cache.set(fileName, readFileSync(new URL(fileName, TEMPLATES_PATH), 'utf8'))
  return cache.get(fileName)
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
      html: readTemplate('base.html').replace('{{conteudo}}', body).replaceAll('{{ano}}', String(new Date().getFullYear())),
      text: fill(readTemplate(`${name}.txt`), variables, String),
      attachments: [
        {
          filename: 'logo.png',
          path: LOGO_PATH,
          cid: 'logo_trocaticket',
        },
      ],
    }
  }
}
