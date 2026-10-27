import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useAcessibilidade } from '../../hooks/useAcessibilidade.js'
import { useFolhaArrastavel } from '../../hooks/useFolhaArrastavel.js'
import { useIsMobile } from '../../hooks/useIsMobile.js'
import { leituraDisponivel, useLeituraEmVozAlta } from '../../hooks/useLeituraEmVozAlta.js'
import { Icone } from './Icone.jsx'
import { BotaoTema, SeletorTema } from './BotaoTema.jsx'
import iconeClaro from '../../assets/comum/icone-acessibilidade-claro.svg'
import iconeEscuro from '../../assets/comum/icone-acessibilidade.svg'
import iconeFechar from '../../assets/comum/icone-fechar.svg'
import iconeOuvir from '../../assets/comum/icone-ouvir.svg'
import iconeParar from '../../assets/comum/icone-parar.svg'
import '../../styles/acessibilidade.css'

const TAMANHOS = [
  { valor: 90, nome: 'A', titulo: 'Texto menor' },
  { valor: 100, nome: 'A', titulo: 'Texto padrão' },
  { valor: 115, nome: 'A', titulo: 'Texto maior' },
  { valor: 130, nome: 'A', titulo: 'Texto bem maior' },
]

const OPCOES = [
  { chave: 'contraste', nome: 'Alto contraste', apoio: 'Reforça as cores e as bordas.' },
  {
    chave: 'leitura',
    nome: 'Leitura facilitada',
    apoio: 'Fonte OpenDyslexic e mais espaço entre letras e linhas.',
  },
  { chave: 'movimento', nome: 'Reduzir animações', apoio: 'Desliga as transições das telas.' },
]

// no desktop o flutuante leva junto o botão de tema, porque essas telas não têm cabeçalho
export function BotaoAcessibilidade({ posicao = 'flutuante' }) {
  const [aberto, setAberto] = useState(false)
  const { ajustes, alternar, mudarFonte, restaurar } = useAcessibilidade()
  const leitura = useLeituraEmVozAlta()
  const caixa = useRef(null)
  const folha = useFolhaArrastavel(() => setAberto(false))
  const flutuante = posicao === 'flutuante'
  const isMobile = useIsMobile()
  const painel = useRef(null)
  const [largo, setLargo] = useState(false)
  const [medicao, setMedicao] = useState(0)

  // No desktop, se o painel estreito não cabe na altura da tela, ele vira duas colunas.
  useLayoutEffect(() => {
    if (!aberto) return

    const medirDeNovo = () => {
      setLargo(false)
      setMedicao((atual) => atual + 1)
    }

    medirDeNovo()
    document.fonts?.ready.then(medirDeNovo) // a OpenDyslexic chega depois e muda a altura
    window.addEventListener('resize', medirDeNovo)
    return () => window.removeEventListener('resize', medirDeNovo)
  }, [aberto, ajustes.fonte, ajustes.leitura])

  useLayoutEffect(() => {
    const elemento = painel.current
    if (!elemento || largo || !window.matchMedia('(min-width: 901px)').matches) return
    if (elemento.scrollHeight > elemento.clientHeight) setLargo(true)
  }, [medicao, largo])

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
      {flutuante && !isMobile && <BotaoTema />}

      <button
        type="button"
        className={`acessibilidade acessibilidade--${posicao}${aberto ? ' acessibilidade--aberta' : ''}`}
        aria-label="Opções de acessibilidade"
        aria-expanded={aberto}
        onClick={() => setAberto((estava) => !estava)}
      >
        <Icone src={flutuante ? iconeClaro : iconeEscuro} />
      </button>

      {aberto && (
        <div
          ref={painel}
          className={`painel-acesso${largo ? ' painel-acesso--largo' : ''}${folha.expandida ? ' painel-acesso--expandida' : ''}${folha.arrasto ? ' painel-acesso--arrastando' : ''}`}
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
              <Icone src={iconeFechar} />
            </button>
          </div>

          <div className="painel-acesso__bloco">
            <span className="painel-acesso__rotulo">Aparência</span>
            <SeletorTema />
          </div>

          <div className="painel-acesso__bloco">
            <span className="painel-acesso__rotulo">Tamanho do texto</span>

            <div className="tamanhos">
              {TAMANHOS.map((tamanho, indice) => (
                <button
                  key={tamanho.valor}
                  type="button"
                  title={tamanho.titulo}
                  aria-label={tamanho.titulo}
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

          {leituraDisponivel && (
            <div className="painel-acesso__bloco">
              <span className="painel-acesso__rotulo">Leitura em voz alta</span>
              <button
                type="button"
                className={`opcao-acesso painel-acesso__ouvir${leitura.lendo ? ' painel-acesso__ouvir--lendo' : ''}`}
                aria-pressed={leitura.lendo}
                onClick={leitura.lendo ? leitura.parar : leitura.ler}
              >
                <span className="opcao-acesso__texto">
                  <strong>{leitura.lendo ? 'Parar leitura' : 'Ouvir a página'}</strong>
                  <small>Lê o texto selecionado ou, sem seleção, a página.</small>
                </span>
                <span className="painel-acesso__ouvir-icone">
                  <Icone src={leitura.lendo ? iconeParar : iconeOuvir} />
                </span>
              </button>
            </div>
          )}

          <div className="painel-acesso__bloco painel-acesso__bloco--opcoes">
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
            Restaurar padrões
          </button>
        </div>
      )}
    </div>
  )
}
