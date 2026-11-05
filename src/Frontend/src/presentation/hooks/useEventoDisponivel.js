import { useCallback, useEffect, useState } from 'react'
import { buscarEventoDisponivel } from '../../application/eventosDisponiveis.js'

// Evento aberto para cotação, como o fornecedor vê (GET /supplier/events/:event_key).
// Usado pelo detalhe do evento e pelas etapas do envio de proposta.
//   const { carregando, evento, erro, tentarDeNovo } = useEventoDisponivel(eventKey)
export function useEventoDisponivel(eventKey) {
  const [tentativa, setTentativa] = useState(0)
  const [resultado, setResultado] = useState({ chave: null, evento: null, erro: null })
  const carregando = resultado.chave !== eventKey
  // estável entre renders, para poder entrar nas dependências de um efeito
  const tentarDeNovo = useCallback(() => setTentativa((valor) => valor + 1), [])

  useEffect(() => {
    let telaAberta = true
    buscarEventoDisponivel(eventKey)
      .then((evento) => {
        if (telaAberta) setResultado({ chave: eventKey, evento, erro: null })
      })
      .catch((erro) => {
        if (telaAberta) setResultado({ chave: eventKey, evento: null, erro })
      })

    return () => {
      telaAberta = false
    }
  }, [eventKey, tentativa])

  return {
    carregando,
    evento: carregando ? null : resultado.evento,
    erro: carregando ? null : resultado.erro,
    tentarDeNovo,
  }
}
