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
// com teclado e anuncia o estado aberto/fechado sem precisar de aria-expanded
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
          <details key={item.pergunta} className="pergunta-landing" open={indice === 0}>
            <summary className="pergunta-landing__pergunta">{item.pergunta}</summary>
            <p className="pergunta-landing__resposta">{item.resposta}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
