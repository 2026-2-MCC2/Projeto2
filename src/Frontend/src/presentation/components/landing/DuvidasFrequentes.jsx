import { useEffect, useRef, useState } from 'react'
import { semMovimento } from '../../movimento.js'
import { CabecalhoDaSecao } from './CabecalhoDaSecao.jsx'

const PERGUNTAS = [
  {
    pergunta: 'Quem pode usar o TrocaTicket?',
    resposta:
      'Organizadores de eventos, que planejam custos e precificam ingressos, e fornecedores, que enviam propostas para os itens de custo dos eventos.',
  },
  {
    pergunta: 'Por que meu cadastro precisa de aprovação?',
    resposta:
      'Todo cadastro passa pela análise do administrador antes do primeiro acesso. Você recebe um aviso no e-mail informado assim que o acesso for liberado.',
  },
  {
    pergunta: 'Como o preço do ingresso é calculado?',
    resposta:
      'O ticket é o custo total dividido pelo público multiplicado por (1 − margem). A plataforma mostra o resultado nos cenários pessimista, realista e otimista.',
  },
  {
    pergunta: 'Posso editar uma proposta já enviada?',
    resposta:
      'Sim, enquanto o evento estiver em cotação. Depois que o organizador seleciona uma proposta, ela não pode mais ser alterada.',
  },
  {
    pergunta: 'Esqueci minha senha. E agora?',
    // o link da tela de login se chama "Esqueceu sua senha?"
    resposta:
      'Na tela de login, use "Esqueceu sua senha?" e enviamos um link de redefinição para o e-mail cadastrado.',
  },
]

// mesmo padrão da página Dúvidas da área logada: <details>/<summary>, que já abre e fecha
// com teclado e anuncia o estado aberto/fechado sem precisar de aria-expanded.
// O <details> fechado some na hora, então o open e a animação têm estados separados: ao abrir, o
// open vem antes (dois quadros, para o navegador pintar o estado fechado); ao fechar, depois
function Pergunta({ pergunta, resposta, inicial }) {
  const [montada, setMontada] = useState(inicial)
  const [aberta, setAberta] = useState(inicial)
  const quadro = useRef(0)
  // só um fechamento animado tira o open: a transição de 0,01ms do "menos movimento" também
  // dispara transitionend, e podia fechar uma pergunta que acabou de reabrir
  const fechando = useRef(false)

  useEffect(() => () => cancelAnimationFrame(quadro.current), [])

  const alternar = (evento) => {
    evento.preventDefault()
    cancelAnimationFrame(quadro.current)

    if (aberta) {
      setAberta(false)
      if (semMovimento()) setMontada(false)
      else fechando.current = true
      return
    }

    fechando.current = false
    setMontada(true)
    quadro.current = requestAnimationFrame(() => {
      quadro.current = requestAnimationFrame(() => setAberta(true))
    })
  }

  const aoTerminarDeFechar = (evento) => {
    if (evento.propertyName !== 'grid-template-rows' || !fechando.current) return
    fechando.current = false
    setMontada(false)
  }

  // a busca da página (Ctrl+F) abre o <details> sem passar pelo clique
  const aoAbrirSozinha = (evento) => {
    if (!evento.currentTarget.open || montada) return
    setMontada(true)
    setAberta(true)
  }

  return (
    <details
      className={`pergunta-landing${aberta ? ' pergunta-landing--aberta' : ''}`}
      open={montada}
      onToggle={aoAbrirSozinha}
    >
      <summary className="pergunta-landing__pergunta" onClick={alternar}>
        {pergunta}
      </summary>
      <div className="pergunta-landing__corpo" onTransitionEnd={aoTerminarDeFechar}>
        <div className="pergunta-landing__recorte">
          <p className="pergunta-landing__resposta">{resposta}</p>
        </div>
      </div>
    </details>
  )
}

export function DuvidasFrequentes() {
  return (
    <section
      id="duvidas"
      className="landing__secao landing__secao--sutil duvidas-landing"
      aria-labelledby="duvidas-titulo"
    >
      <CabecalhoDaSecao
        id="duvidas-titulo"
        sobretitulo="DÚVIDAS FREQUENTES"
        titulo="Ficou alguma pergunta?"
      />

      <div className="duvidas-landing__lista">
        {PERGUNTAS.map((item, indice) => (
          <Pergunta key={item.pergunta} {...item} inicial={indice === 0} />
        ))}
      </div>
    </section>
  )
}
