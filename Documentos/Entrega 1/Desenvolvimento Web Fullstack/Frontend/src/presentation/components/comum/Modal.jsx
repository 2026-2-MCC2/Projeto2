import { useEffect, useRef, useState } from 'react'
import { useIsMobile } from '../../hooks/useIsMobile.js'
import { Botao } from '../organizador/Formulario.jsx'
import iconeFechar from '../../assets/comum/icone-fechar.svg'
import '../../styles/modal.css'

// No mobile vira uma folha que sobe de baixo e pode ser arrastada.
export function Modal({
  icone,
  corDoIcone = 'azul',
  titulo,
  subtitulo,
  mensagem,
  dados,
  acao,
  largo = false,
  semCancelarNoMobile = false,
  aoFechar,
  children,
}) {
  const isMobile = useIsMobile()
  const [expandida, setExpandida] = useState(false)
  const [arrasto, setArrasto] = useState(0)
  const inicioDoArrasto = useRef(null)
  const houveArrasto = useRef(false)

  // No mobile a folha acompanha o dedo: puxar para baixo fecha, puxar para cima expande.
  function aoPegar(evento) {
    inicioDoArrasto.current = evento.clientY
    houveArrasto.current = false
    evento.currentTarget.setPointerCapture(evento.pointerId)
  }

  function aoArrastar(evento) {
    if (inicioDoArrasto.current === null) return

    const distancia = evento.clientY - inicioDoArrasto.current
    if (Math.abs(distancia) > 5) houveArrasto.current = true
    setArrasto(distancia)
  }

  function aoSoltar() {
    if (arrasto > 100) {
      if (expandida) setExpandida(false)
      else aoFechar()
    } else if (arrasto < -60) {
      setExpandida(true)
    }

    inicioDoArrasto.current = null
    setArrasto(0)
  }

  useEffect(() => {
    function aoTeclar(evento) {
      if (evento.key === 'Escape') aoFechar()
    }

    document.addEventListener('keydown', aoTeclar)
    return () => document.removeEventListener('keydown', aoTeclar)
  }, [aoFechar])

  return (
    <div className="fundo-modal" onClick={aoFechar}>
      <div
        className={`modal${largo ? ' modal--largo' : ''}${expandida ? ' modal--expandida' : ''}${arrasto ? ' modal--arrastando' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        style={arrasto ? { transform: `translateY(${Math.max(arrasto, -40)}px)` } : undefined}
        onClick={(evento) => evento.stopPropagation()}
      >
        <button
          type="button"
          className="modal__puxador"
          aria-label="Fechar"
          onClick={() => !houveArrasto.current && aoFechar()}
          onPointerDown={aoPegar}
          onPointerMove={aoArrastar}
          onPointerUp={aoSoltar}
          onPointerCancel={aoSoltar}
        />

        {icone && (
          <span className={`modal__icone modal__icone--${corDoIcone}`}>
            <img src={icone} alt="" />
          </span>
        )}

        <div className="modal__cabecalho">
          <div className="modal__mensagem">
            <h2>{titulo}</h2>
            {subtitulo && !isMobile && <small>{subtitulo}</small>}
            {mensagem && <p>{mensagem}</p>}
          </div>

          {subtitulo && !isMobile && (
            <button type="button" className="modal__fechar" aria-label="Fechar" onClick={aoFechar}>
              <img src={iconeFechar} alt="" />
            </button>
          )}
        </div>

        {dados && (
          <div className="modal__resumo">
            {dados.map((dado) => (
              <div key={dado.rotulo}>
                <span>{dado.rotulo}</span>
                <strong>{dado.valor}</strong>
              </div>
            ))}
          </div>
        )}

        {children}

        <div className="modal__acoes">
          {!(isMobile && semCancelarNoMobile) && (
            <Botao type="button" secundario onClick={aoFechar}>
              {acao?.cancelar ?? 'Voltar'}
            </Botao>
          )}
          <Botao type="button" perigo={corDoIcone === 'vermelho'} onClick={acao?.aoConfirmar ?? aoFechar}>
            {acao?.confirmar}
          </Botao>
        </div>
      </div>
    </div>
  )
}
