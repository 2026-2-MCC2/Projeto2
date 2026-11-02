import { useEffect, useState, useSyncExternalStore } from 'react'
import { buscarEvento, observarEventos } from '../data/eventos.js'
import { carregarEvento } from '../../application/eventos.js'

// o layout e a página do evento usam o mesmo carregamento e veem a mesma versão do evento
export function useEvento(id) {
  const evento = useSyncExternalStore(observarEventos, () => buscarEvento(id))
  const [erro, setErro] = useState(null)
  const [tentativa, setTentativa] = useState(0)

  useEffect(() => {
    if (!id || buscarEvento(id)) return
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
