import { useRef } from 'react'
import { useNaTela } from '../../hooks/useNaTela.js'
import { Icone } from '../comum/Icone.jsx'
import { BotaoLanding } from './BotaoLanding.jsx'
import { CabecalhoDaSecao } from './CabecalhoDaSecao.jsx'
import { Ingresso } from './Ingresso.jsx'
import iconeOrganizador from '../../assets/landing/icone-organizador.svg'
import iconeFornecedor from '../../assets/landing/icone-fornecedor.svg'
import iconeCheck from '../../assets/landing/icone-check.svg'

// o id de cada cartão é a âncora do menu ("Organizadores" e "Fornecedores")
const PERFIS = [
  {
    id: 'organizadores',
    perfil: 'organizador',
    icone: iconeOrganizador,
    rotulo: 'ORGANIZADOR',
    titulo: 'Planeje e precifique seus eventos',
    descricao:
      'Crie eventos, cadastre itens de custo, receba e compare propostas e chegue ao preço do ingresso.',
    itens: [
      'Cadastre eventos com período, local e público',
      'Organize itens de custo por categoria',
      'Compare propostas e selecione a melhor',
      'Calcule o ticket por cenário de público',
    ],
    botao: { tipo: 'primario', texto: 'Criar cadastro de organizador' },
  },
  {
    id: 'fornecedores',
    perfil: 'fornecedor',
    icone: iconeFornecedor,
    rotulo: 'FORNECEDOR',
    titulo: 'Encontre eventos e envie propostas',
    descricao: 'Consulte eventos abertos no seu segmento e envie propostas para os itens de custo.',
    itens: [
      'Veja eventos disponíveis no seu segmento',
      'Envie propostas em três etapas',
      'Acompanhe se a proposta foi aceita ou recusada',
      'Edite propostas enquanto o evento está em cotação',
    ],
    botao: { tipo: 'secundario', texto: 'Criar cadastro de fornecedor' },
  },
]

export function Perfis() {
  // os cartões começam escondidos só pela classe --animar, que vem daqui: sem JS aparecem normais
  const lista = useRef(null)
  const naTela = useNaTela(lista, { limiar: 0.2 })

  return (
    <section className="landing__secao landing__secao--sutil" aria-labelledby="perfis-titulo">
      <CabecalhoDaSecao
        id="perfis-titulo"
        sobretitulo="PARA QUEM É"
        titulo="Uma plataforma, os dois lados do evento"
        subtitulo="Cada cadastro tem um perfil, e o perfil define o que você faz na plataforma."
      />

      <div
        ref={lista}
        className={`perfis-landing perfis-landing--animar${naTela ? ' perfis-landing--visivel' : ''}`}
      >
        {PERFIS.map((perfil) => (
          <Ingresso
            key={perfil.id}
            id={perfil.id}
            elemento="article"
            orientacao="vertical"
            className={`perfil-landing perfil-landing--${perfil.perfil}`}
            aria-labelledby={`${perfil.id}-titulo`}
            canhoto={
              <BotaoLanding tipo={perfil.botao.tipo} para={`/cadastro?perfil=${perfil.perfil}`}>
                {perfil.botao.texto}
              </BotaoLanding>
            }
          >
            <div className="perfil-landing__topo">
              <span className="perfil-landing__icone">
                <Icone src={perfil.icone} />
              </span>
              <p className="perfil-landing__rotulo">{perfil.rotulo}</p>
            </div>

            <h3 id={`${perfil.id}-titulo`} className="perfil-landing__titulo">
              {perfil.titulo}
            </h3>
            <p className="perfil-landing__descricao">{perfil.descricao}</p>

            <ul className="perfil-landing__lista">
              {perfil.itens.map((item) => (
                <li key={item}>
                  <Icone src={iconeCheck} />
                  {item}
                </li>
              ))}
            </ul>
          </Ingresso>
        ))}
      </div>
    </section>
  )
}
