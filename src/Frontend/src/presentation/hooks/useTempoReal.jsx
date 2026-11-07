import { useContext } from 'react'
import { ContextoDoTempoReal } from './contextoDoTempoReal.js'

export function useTempoReal() {
  return useContext(ContextoDoTempoReal)
}
