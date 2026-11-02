import { useEffect, useState } from 'react'
import { buscarEvento } from '../data/eventos.js'
import { buscarEventoPorChave } from '../../application/eventos.js'

export function useEvento(id) {
  const [evento, setEvento] = useState(() => (id ? buscarEvento(id) : null))
  const [carregando, setCarregando] = useState(!evento && Boolean(id))
  const [erro, setErro] = useState(null)

  useEffect(() => {
    if (!id) return
    let ativo = true
    const emCache = buscarEvento(id)
    if (emCache) {
      setEvento(emCache)
      setCarregando(false)
    } else {
      setCarregando(true)
      buscarEventoPorChave(id)
        .then((dados) => {
          if (ativo) {
            setEvento(dados)
            setErro(null)
          }
        })
        .catch((err) => {
          if (ativo) setErro(err)
        })
        .finally(() => {
          if (ativo) setCarregando(false)
        })
    }
    return () => {
      ativo = false
    }
  }, [id])

  return { evento, carregando, erro, setEvento }
}
