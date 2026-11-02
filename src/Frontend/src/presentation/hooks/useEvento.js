import { useEffect, useState, useSyncExternalStore } from 'react'
import { carregarEvento } from '../../application/eventos.js'
import { buscarEventoEmMemoria, observarEventos } from '../../application/eventosEmMemoria.js'

// o layout e a página do evento usam o mesmo carregamento e veem a mesma versão do evento
export function useEvento(id) {
  const evento = useSyncExternalStore(observarEventos, () => buscarEventoEmMemoria(id))
  const [erro, setErro] = useState(null)
  const [tentativa, setTentativa] = useState(0)

  useEffect(() => {
    if (!id || buscarEventoEmMemoria(id)) return
    let telaAberta = true

    carregarEvento(id).catch((falha) => {
      if (telaAberta) setErro(falha)
    })

    return () => {
      telaAberta = false
    }
  }, [id, tentativa])

  function tentarDeNovo() {
    setErro(null)
    setTentativa((atual) => atual + 1)
  }

  return { evento, carregando: !evento && !erro, erro, tentarDeNovo }
}
