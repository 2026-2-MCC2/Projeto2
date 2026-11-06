import { useEffect, useState } from 'react'

// Diz se a aba está visível, para pausar o que não precisa rodar com ela em segundo plano
export function useAbaVisivel() {
  const [visivel, setVisivel] = useState(() => !document.hidden)

  useEffect(() => {
    const atualizar = () => setVisivel(!document.hidden)
    document.addEventListener('visibilitychange', atualizar)
    return () => document.removeEventListener('visibilitychange', atualizar)
  }, [])

  return visivel
}
