import { REGRAS } from '../../domain/validacao.js'

// Liga as regras de domain/validacao.js à validação nativa do navegador.
// Espalhe o retorno no <form>: <form {...useValidacao()}>. Nos campos:
//   required                  campo obrigatório
//   data-validar="email"      regra de REGRAS (email, cnpj, telefone, data...)
// Regras que comparam campos vão no parâmetro, pelo name do campo:
//   useValidacao({ confirmacaoSenha: (valor, valores) => validarConfirmacaoSenha(valor, valores.senha) })
let ultimoId = 0

export function useValidacao(regrasEntreCampos = {}) {
  function validar(formulario) {
    const campos = camposDo(formulario)
    const valores = Object.fromEntries(campos.map((campo) => [campo.name, campo.value.trim()]))

    for (const campo of campos) {
      const valor = campo.value.trim()
      const regra = REGRAS[campo.dataset.validar]
      const entreCampos = regrasEntreCampos[campo.name]
      const erro = valor ? regra?.(valor) || entreCampos?.(valor, valores) || '' : ''
      campo.setCustomValidity(erro)
      if (campo.dataset.mostrarErro) atualizarMensagem(campo)
    }
  }

  // captura nativa: o evento "invalid" não sobe do campo para o formulário
  function ligar(formulario) {
    if (!formulario) return

    const aoDigitar = () => validar(formulario)

    const aoSair = (evento) => {
      const campo = evento.target
      if (!('validity' in campo) || !campo.value) return
      campo.dataset.mostrarErro = 'sim'
      atualizarMensagem(campo)
    }

    const aoBarrar = (evento) => {
      evento.preventDefault() // sem o balão do navegador: a mensagem fica embaixo do campo
      const campo = evento.target
      campo.dataset.mostrarErro = 'sim'
      atualizarMensagem(campo)

      // o "invalid" dispara em todos os campos com erro; só o primeiro recebe o foco
      if (!formulario.dataset.focoNoErro) {
        formulario.dataset.focoNoErro = 'sim'
        campo.focus()
        setTimeout(() => delete formulario.dataset.focoNoErro)
      }
    }

    validar(formulario)
    formulario.addEventListener('input', aoDigitar, true)
    formulario.addEventListener('focusout', aoSair, true)
    formulario.addEventListener('invalid', aoBarrar, true)

    return () => {
      formulario.removeEventListener('input', aoDigitar, true)
      formulario.removeEventListener('focusout', aoSair, true)
      formulario.removeEventListener('invalid', aoBarrar, true)
    }
  }

  return { ref: ligar }
}

function camposDo(formulario) {
  return [...formulario.elements].filter((campo) => 'value' in campo && 'validity' in campo)
}

function atualizarMensagem(campo) {
  const id = (campo.dataset.idErro ||= `erro-campo-${++ultimoId}`)
  // campo vazio tem mensagem fixa; a do navegador muda com o idioma dele
  const erro = campo.validity.valid
    ? ''
    : campo.validity.valueMissing
      ? 'Preencha este campo.'
      : campo.validationMessage
  let mensagem = document.getElementById(id)
  const descricoes = (campo.getAttribute('aria-describedby') ?? '').split(' ').filter(Boolean)

  if (!erro) {
    mensagem?.remove()
    campo.removeAttribute('aria-invalid')
    const restantes = descricoes.filter((descricao) => descricao !== id)
    if (restantes.length) campo.setAttribute('aria-describedby', restantes.join(' '))
    else campo.removeAttribute('aria-describedby')
    return
  }

  if (!mensagem) {
    mensagem = document.createElement('small')
    mensagem.id = id
    mensagem.className = 'mensagem-erro'
    campo.insertAdjacentElement('afterend', mensagem)
  }

  mensagem.textContent = erro
  campo.setAttribute('aria-invalid', 'true')
  if (!descricoes.includes(id))
    campo.setAttribute('aria-describedby', [...descricoes, id].join(' '))
}
