import { useEffect, useState, useSyncExternalStore } from 'react'
import { carregarEvento } from '../../application/eventos.js'
import { buscarEventoEmMemoria, observarEventos } from '../../application/eventosEmMemoria.js'

// o layout e a página do evento usam o mesmo carregamento e veem a mesma versão do evento;
// a cópia em memória aparece na hora e é atualizada pela API sempre que a tela abre
export function useEvento(id) {
  const evento = useSyncExternalStore(observarEventos, () => buscarEventoEmMemoria(id))
  // a falha fica presa ao evento que falhou, para não aparecer quando outro evento é aberto
  const [falha, setFalha] = useState({ id: null, erro: null })
  const [tentativa, setTentativa] = useState(0)
  // id do evento que já voltou da API nesta tela; até lá a cópia em memória pode estar antiga
  const [idAtualizado, setIdAtualizado] = useState(null)
  const erro = falha.id === id ? falha.erro : null

  useEffect(() => {
    if (!id) return
    let telaAberta = true

    carregarEvento(id)
      .then(() => {
        if (telaAberta) setIdAtualizado(id)
      })
      .catch((erroAoCarregar) => {
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

  // com a cópia em memória na tela, uma falha ao atualizar não esconde o evento
  return {
    evento,
    carregando: Boolean(id) && !evento && !erro,
    erro: evento ? null : erro,
    // a tela mostra a cópia em memória, mas quem precisa da versão atual (a edição) vê a falha
    erroAoAtualizar: erro,
    buscaConcluida: idAtualizado === id,
    tentarDeNovo,
  }
}
