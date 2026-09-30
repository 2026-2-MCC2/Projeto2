import { useEffect, useRef, useState } from 'react'
import { useAcessibilidade } from '../../hooks/useAcessibilidade.js'
import { useFolhaArrastavel } from '../../hooks/useFolhaArrastavel.js'
import iconeClaro from '../../assets/comum/icone-acessibilidade-claro.svg'
import iconeEscuro from '../../assets/comum/icone-acessibilidade.svg'
import iconeFechar from '../../assets/comum/icone-fechar.svg'
import '../../styles/acessibilidade.css'

const TAMANHOS = [
  { valor: 90, nome: 'A', titulo: 'Texto menor' },
  { valor: 100, nome: 'A', titulo: 'Texto padrão' },
  { valor: 115, nome: 'A', titulo: 'Texto maior' },
  { valor: 130, nome: 'A', titulo: 'Texto bem maior' },
]

const OPCOES = [
  { chave: 'contraste', nome: 'Alto contraste', apoio: 'Reforça as cores e as bordas.' },
  { chave: 'leitura', nome: 'Leitura facilitada', apoio: 'Mais espaço entre letras e linhas.' },
  { chave: 'movimento', nome: 'Reduzir animações', apoio: 'Desliga as transições das telas.' },
]

// Usado pelo organizador, pelo fornecedor e pelo administrador.
export function BotaoAcessibilidade({ posicao = 'flutuante' }) {
  const [aberto, setAberto] = useState(false)
  const { ajustes, alternar, mudarFonte, restaurar } = useAcessibilidade()
  const caixa = useRef(null)
  const folha = useFolhaArrastavel(() => setAberto(false))
  const flutuante = posicao === 'flutuante'

  useEffect(() => {
    if (!aberto) return

    function aoClicarFora(evento) {
      if (!caixa.current?.contains(evento.target)) setAberto(false)
    }

    function aoTeclar(evento) {
      if (evento.key === 'Escape') setAberto(false)
    }

    document.addEventListener('mousedown', aoClicarFora)
    document.addEventListener('keydown', aoTeclar)

    return () => {
      document.removeEventListener('mousedown', aoClicarFora)
      document.removeEventListener('keydown', aoTeclar)
    }
  }, [aberto])

  return (
    <div className={`acessibilidade-area acessibilidade-area--${posicao}`} ref={caixa}>
      <button
        type="button"
        className={`acessibilidade acessibilidade--${posicao}${aberto ? ' acessibilidade--aberta' : ''}`}
        aria-label="Opções de acessibilidade"
        aria-expanded={aberto}
        onClick={() => setAberto((estava) => !estava)}
      >
        <img src={flutuante ? iconeClaro : iconeEscuro} alt="" />
      </button>

      {aberto && (
        <div
          className={`painel-acesso${folha.expandida ? ' painel-acesso--expandida' : ''}${folha.arrasto ? ' painel-acesso--arrastando' : ''}`}
          role="dialog"
          aria-label="Opções de acessibilidade"
          style={folha.estiloDoArrasto}
        >
          <button
            type="button"
            className="puxador painel-acesso__puxador"
            aria-label="Fechar"
            {...folha.puxador}
          />

          <div className="painel-acesso__topo">
            <h2>Acessibilidade</h2>
            <button type="button" aria-label="Fechar" onClick={() => setAberto(false)}>
              <img src={iconeFechar} alt="" />
            </button>
          </div>

          <div className="painel-acesso__bloco">
            <span className="painel-acesso__rotulo">Tamanho do texto</span>

            <div className="tamanhos">
              {TAMANHOS.map((tamanho, indice) => (
                <button
                  key={tamanho.valor}
                  type="button"
                  title={tamanho.titulo}
                  aria-pressed={ajustes.fonte === tamanho.valor}
                  className={`tamanhos__botao${ajustes.fonte === tamanho.valor ? ' tamanhos__botao--ativo' : ''}`}
                  style={{ fontSize: `${0.75 + indice * 0.125}rem` }}
                  onClick={() => mudarFonte(tamanho.valor)}
                >
                  {tamanho.nome}
                </button>
              ))}
            </div>
          </div>

          <div className="painel-acesso__bloco">
            {OPCOES.map((opcao) => (
              <button
                key={opcao.chave}
                type="button"
                role="switch"
                aria-checked={ajustes[opcao.chave]}
                className="opcao-acesso"
                onClick={() => alternar(opcao.chave)}
              >
                <span className="opcao-acesso__texto">
                  <strong>{opcao.nome}</strong>
                  <small>{opcao.apoio}</small>
                </span>
                <span className={`chave${ajustes[opcao.chave] ? ' chave--ligada' : ''}`} />
              </button>
            ))}
          </div>

          <button type="button" className="painel-acesso__restaurar" onClick={restaurar}>
            Restaurar padrão
          </button>
        </div>
      )}
    </div>
  )
}
