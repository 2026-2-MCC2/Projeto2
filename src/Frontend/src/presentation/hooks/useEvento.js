import { useEffect, useState, useSyncExternalStore } from 'react'
import { carregarEvento } from '../../application/eventos.js'
import { buscarEventoEmMemoria, observarEventos } from '../../application/eventosEmMemoria.js'

// o layout e a página do evento usam o mesmo carregamento e veem a mesma versão do evento
export function useEvento(id) {
  const evento = useSyncExternalStore(observarEventos, () => buscarEventoEmMemoria(id))
  // a falha fica presa ao evento que falhou, para não aparecer quando outro evento é aberto
  const [falha, setFalha] = useState({ id: null, erro: null })
  const [tentativa, setTentativa] = useState(0)
  const erro = falha.id === id ? falha.erro : null

  useEffect(() => {
    if (!id || buscarEventoEmMemoria(id)) return
    let telaAberta = true

    carregarEvento(id).catch((erroAoCarregar) => {
      if (telaAberta) setFalha({ id, erro: erroAoCarregar })
    })

    return () => {
      telaAberta = false
    }
  }, [id, tentativa])

  function tentarDeNovo() {
    setFalha({ id: null, erro: null })
    setTentativa((atual) => atual + 1)
  }

  return { evento, carregando: Boolean(id) && !evento && !erro, erro, tentarDeNovo }
}
