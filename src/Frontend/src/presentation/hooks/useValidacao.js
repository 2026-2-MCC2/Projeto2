import { REGRAS } from '../../domain/validacao.js'

// Liga as regras de domain/validacao.js à validação nativa do navegador.
// Espalhe o retorno no <form>: <form {...useValidacao()}>. Nos campos:
//   required                  campo obrigatório
//   data-validar="email"      regra de REGRAS (email, cnpj, telefone, data...)
// Regras que comparam campos vão no parâmetro, pelo name do campo:
//   useValidacao({ confirmacaoSenha: (valor, valores) => validarConfirmacaoSenha(valor, valores.senha) })
// Enquanto algum campo estiver inválido, o navegador barra o envio e mostra a mensagem no campo.
export function useValidacao(regrasEntreCampos = {}) {
  function validar(formulario) {
    const campos = [...formulario.elements].filter((campo) => 'value' in campo)
    const valores = Object.fromEntries(campos.map((campo) => [campo.name, campo.value.trim()]))

    for (const campo of campos) {
      const valor = campo.value.trim()
      const regra = REGRAS[campo.dataset.validar]
      const entreCampos = regrasEntreCampos[campo.name]
      const erro = valor ? regra?.(valor) || entreCampos?.(valor, valores) || '' : ''
      campo.setCustomValidity(erro)
    }
  }

  return { onInputCapture: (evento) => validar(evento.currentTarget) }
}
