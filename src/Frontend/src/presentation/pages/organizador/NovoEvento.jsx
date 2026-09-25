import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { OrganizadorLayout } from '../../components/organizador/OrganizadorLayout.jsx'
import { Selecao } from '../../components/organizador/Selecao.jsx'
import {
  Acoes,
  Botao,
  Campo,
  CampoFixo,
  Grupo,
  Linha,
  SeDesktop,
} from '../../components/organizador/Formulario.jsx'
import { useIsMobile } from '../../hooks/useIsMobile.js'
import iconeConcluido from '../../assets/organizador/icone-concluido.svg'

// Cadastro de evento em 4 etapas

const ETAPAS = [
  {
    numero: 1,
    nome: 'Dados do evento',
    apoio: 'Preencha as informações básicas para começar o planejamento.',
    apoioMobile: 'Informações básicas do evento.',
  },
  {
    numero: 2,
    nome: 'Local e público',
    apoio: 'Onde o evento acontece e quantas pessoas são esperadas.',
    apoioMobile: 'Onde acontece e quantas pessoas são esperadas.',
  },
  {
    numero: 3,
    nome: 'Parâmetros financeiros',
    apoio: 'Parâmetros que entram no cálculo do ticket.',
    apoioMobile: 'Parâmetros que entram no cálculo do ticket.',
  },
  {
    numero: 4,
    nome: 'Revisão',
    apoio: 'Revise antes de publicar o evento para cotação.',
    apoioMobile: 'Revise antes de publicar para cotação.',
  },
]

const VALOR_INICIAL = {
  nome: '',
  categoria: '',
  descricao: '',
  dataInicio: '',
  dataTermino: '',
  horarioAbertura: '',
  horarioEncerramento: '',
  nomeEspaco: '',
  cep: '',
  endereco: '',
  cidade: '',
  estado: '',
  capacidadeEspaco: '',
  publicoMinimo: '',
  publicoEsperado: '',
  publicoMaximo: '',
  margemLucro: '',
  custosFiscais: '',
  equipeProducao: '',
  outrosCustos: '',
  cenarioReferencia: 'esperado',
}

const CENARIOS = [
  { valor: 'minimo', nome: 'Público mínimo' },
  { valor: 'esperado', nome: 'Público esperado' },
  { valor: 'maximo', nome: 'Público máximo' },
]

const nomeDoCenario = (valor) => CENARIOS.find((cenario) => cenario.valor === valor)?.nome

export function NovoEvento() {
  const isMobile = useIsMobile()
  const navigate = useNavigate()
  const [etapa, setEtapa] = useState(1)
  const [dados, setDados] = useState(VALOR_INICIAL)

  const etapaAtual = ETAPAS[etapa - 1]
  const ultimaEtapa = etapa === ETAPAS.length

  const definir = (nome, valor) => setDados((atual) => ({ ...atual, [nome]: valor }))

  const campo = (nome) => ({
    value: dados[nome],
    onChange: (evento) => definir(nome, evento.target.value),
  })

  function avancar(evento) {
    evento.preventDefault()
    setEtapa((atual) => Math.min(atual + 1, ETAPAS.length))
  }

  function voltar() {
    setEtapa((atual) => Math.max(atual - 1, 1))
  }

  function publicar(evento) {
    evento.preventDefault()
    navigate('/organizador/eventos')
  }

  // Na 1ª etapa a seta do topo sai do cadastro; nas demais volta uma etapa.
  const aoVoltarNoTopo = etapa === 1 ? () => navigate('/organizador/eventos') : voltar

  const acoes = (
    <Acoes>
      {etapa > 1 && (
        <Botao type="button" secundario onClick={voltar}>
          Voltar
        </Botao>
      )}
      <Botao type="submit" form="form-novo-evento">
        {ultimaEtapa ? 'Publicar para cotação' : 'Continuar'}
      </Botao>
    </Acoes>
  )

  const etapasDoFormulario = {
    1: <EtapaIdentificacao campo={campo} isMobile={isMobile} />,
    2: <EtapaLocal campo={campo} isMobile={isMobile} />,
    3: <EtapaCustos campo={campo} dados={dados} definir={definir} isMobile={isMobile} />,
    4: <EtapaRevisao dados={dados} isMobile={isMobile} />,
  }

  return (
    <OrganizadorLayout
      titulo="Novo evento"
      apoio={isMobile ? undefined : etapaAtual.apoio}
      aoVoltar={isMobile ? aoVoltarNoTopo : undefined}
      rodape={isMobile ? acoes : undefined}
      subCabecalho={isMobile ? <ProgressoMobile etapa={etapa} /> : undefined}
    >
      {!isMobile && <ProgressoDesktop etapa={etapa} />}

      <form
        id="form-novo-evento"
        className={isMobile ? 'novo-evento-form' : 'painel'}
        onSubmit={ultimaEtapa ? publicar : avancar}
      >
        {isMobile && <p className="secao__apoio">{etapaAtual.apoioMobile}</p>}

        {etapasDoFormulario[etapa]}

        {!isMobile && acoes}
      </form>
    </OrganizadorLayout>
  )
}

/* ---------- indicadores de etapa ---------- */

function ProgressoDesktop({ etapa }) {
  return (
    <div className="etapas-evento">
      {ETAPAS.map((item, indice) => {
        const estado =
          item.numero < etapa ? 'concluida' : item.numero === etapa ? 'atual' : 'futura'
        const ultimo = indice === ETAPAS.length - 1

        return (
          <div key={item.numero} className="etapas-evento__item">
            <div className={`etapas-evento__marcador etapas-evento__marcador--${estado}`}>
              {estado === 'concluida' ? <img src={iconeConcluido} alt="" /> : item.numero}
            </div>

            <div className="etapas-evento__rotulo">
              <span>Etapa {item.numero}</span>
              <strong className={estado === 'futura' ? '' : 'etapas-evento__nome--destaque'}>
                {item.nome}
              </strong>
            </div>

            {!ultimo && (
              <div
                className={`etapas-evento__conector${estado === 'concluida' ? ' etapas-evento__conector--feito' : ''}`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

function ProgressoMobile({ etapa }) {
  return (
    <div className="progresso">
      <div className="progresso__legenda">
        <strong>
          Etapa {etapa} de {ETAPAS.length}
        </strong>
        <span>{ETAPAS[etapa - 1].nome}</span>
      </div>

      <div className="progresso__trilho">
        {ETAPAS.map((item) => {
          const estado =
            item.numero < etapa
              ? ' progresso__passo--feito'
              : item.numero === etapa
                ? ' progresso__passo--atual'
                : ''
          return <span key={item.numero} className={`progresso__passo${estado}`} />
        })}
      </div>
    </div>
  )
}

/* ---------- etapas ---------- */

function EtapaIdentificacao({ campo, isMobile }) {
  return (
    <>
      <Grupo isMobile={isMobile} titulo="Identificação">
        <Campo
          rotulo="Nome do evento"
          placeholder="Festival Primavera Som & Luz 2026"
          {...campo('nome')}
        />

        <Linha>
          <Campo rotulo="Categoria" placeholder="Festival" {...campo('categoria')} />
          {!isMobile && (
            <CampoFixo rotulo="Tipo de ingresso" valor="Inteira — único tipo por evento" />
          )}
        </Linha>

        <Campo rotulo="Descrição">
          <textarea
            rows={3}
            placeholder={
              isMobile
                ? 'Festival de música ao ar livre com três palcos.'
                : 'Festival de música ao ar livre com três palcos, área gastronômica e espaço VIP.'
            }
            {...campo('descricao')}
          />
        </Campo>
      </Grupo>

      <Grupo isMobile={isMobile} titulo="Período">
        <Linha>
          <Campo
            rotulo={isMobile ? 'Início' : 'Data de início'}
            placeholder="18/10/2026"
            {...campo('dataInicio')}
          />
          <Campo
            rotulo={isMobile ? 'Término' : 'Data de término'}
            placeholder="20/10/2026"
            {...campo('dataTermino')}
          />
        </Linha>

        {!isMobile && (
          <Linha>
            <Campo rotulo="Horário de abertura" placeholder="14:00" {...campo('horarioAbertura')} />
            <Campo
              rotulo="Horário de encerramento"
              placeholder="23:00"
              {...campo('horarioEncerramento')}
            />
          </Linha>
        )}
      </Grupo>
    </>
  )
}

function EtapaLocal({ campo, isMobile }) {
  return (
    <>
      <Grupo isMobile={isMobile} titulo="Local">
        <Linha>
          <Campo rotulo="Nome do espaço" placeholder="Allianz Parque" {...campo('nomeEspaco')} />
          {!isMobile && <Campo rotulo="CEP" placeholder="05001-100" {...campo('cep')} />}
        </Linha>

        <Campo
          rotulo="Endereço"
          placeholder={
            isMobile
              ? 'Av. Francisco Matarazzo, 1705'
              : 'Av. Francisco Matarazzo, 1705 — Água Branca'
          }
          {...campo('endereco')}
        />

        <Linha>
          <Campo rotulo="Cidade" placeholder="São Paulo" {...campo('cidade')} />
          <Campo rotulo="Estado" placeholder="SP" {...campo('estado')} />
          {!isMobile && (
            <Campo
              rotulo="Capacidade do espaço"
              placeholder="20.000 pessoas"
              {...campo('capacidadeEspaco')}
            />
          )}
        </Linha>
      </Grupo>

      <Grupo isMobile={isMobile} titulo="Público estimado">
        {isMobile ? (
          <>
            <Linha>
              <Campo rotulo="Público mínimo" placeholder="8.000" {...campo('publicoMinimo')} />
              <Campo rotulo="Público máximo" placeholder="15.000" {...campo('publicoMaximo')} />
            </Linha>
            <Campo rotulo="Público esperado" placeholder="12.000" {...campo('publicoEsperado')} />
          </>
        ) : (
          <Linha>
            <Campo
              rotulo="Público mínimo"
              placeholder="8.000"
              ajuda="Cenário conservador do cálculo do ticket."
              {...campo('publicoMinimo')}
            />
            <Campo
              rotulo="Público esperado"
              placeholder="12.000"
              ajuda="Usado como referência principal."
              {...campo('publicoEsperado')}
            />
            <Campo
              rotulo="Público máximo"
              placeholder="15.000"
              ajuda="Limitado pela capacidade do espaço."
              {...campo('publicoMaximo')}
            />
          </Linha>
        )}
      </Grupo>
    </>
  )
}

function EtapaCustos({ campo, dados, definir, isMobile }) {
  return (
    <>
      <Grupo isMobile={isMobile} titulo="Margem de lucro">
        <Campo
          rotulo="Margem de lucro"
          placeholder="20%"
          ajuda={isMobile ? undefined : 'Aplicada sobre a receita do evento.'}
          {...campo('margemLucro')}
        />
      </Grupo>

      <Grupo isMobile={isMobile} titulo="Custos próprios estimados">
        <SeDesktop isMobile={isMobile} envolver={Linha}>
          <Campo
            rotulo="Custos fiscais e alvarás"
            placeholder="R$ 24.300"
            {...campo('custosFiscais')}
          />
          <Campo rotulo="Equipe de produção" placeholder="R$ 17.800" {...campo('equipeProducao')} />
          <Campo
            rotulo="Outros custos variáveis"
            placeholder="R$ 0,00"
            {...campo('outrosCustos')}
          />
        </SeDesktop>
      </Grupo>

      <Grupo isMobile={isMobile} titulo="Regras de cálculo">
        <Linha>
          {!isMobile && <CampoFixo rotulo="Arredondamento do ticket" valor="Duas casas decimais" />}

          <Campo rotulo="Cenário de referência">
            <Selecao
              valor={dados.cenarioReferencia}
              opcoes={CENARIOS}
              aoEscolher={(valor) => definir('cenarioReferencia', valor)}
              rotuloAcessivel="Cenário de referência"
            />
          </Campo>
        </Linha>
      </Grupo>
    </>
  )
}

function EtapaRevisao({ dados, isMobile }) {
  const periodo = [dados.dataInicio, dados.dataTermino].filter(Boolean).join(' a ')
  const custosProprios = [dados.custosFiscais, dados.equipeProducao, dados.outrosCustos]
    .filter(Boolean)
    .join(' + ')

  if (isMobile) {
    return (
      <>
        <div className="resumo resumo--cartao">
          <DadoResumo rotulo="Evento" valor={dados.nome} />
          <DadoResumo rotulo="Período" valor={periodo} />
          <DadoResumo
            rotulo="Local"
            valor={[dados.nomeEspaco, dados.estado].filter(Boolean).join(', ')}
          />
          <DadoResumo rotulo="Público esperado" valor={dados.publicoEsperado} />
          <DadoResumo rotulo="Margem de lucro" valor={dados.margemLucro} />
          <DadoResumo rotulo="Custos próprios" valor={custosProprios} />
        </div>

        <div className="preveia-ticket preveia-ticket--mobile">
          <p className="preveia-ticket__titulo">Prévia do ticket no público esperado</p>
          <strong>—</strong>
          <p className="preveia-ticket__apoio">{APOIO_PREVIA}</p>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="resumo">
        <BlocoResumo titulo="Dados do evento">
          <DadoResumo rotulo="Nome" valor={dados.nome} />
          <DadoResumo rotulo="Categoria" valor={dados.categoria} />
          <DadoResumo rotulo="Período" valor={periodo} />
        </BlocoResumo>

        <BlocoResumo titulo="Local e público">
          <DadoResumo
            rotulo="Espaço"
            valor={[dados.nomeEspaco, dados.cidade, dados.estado].filter(Boolean).join(' — ')}
          />
          <DadoResumo rotulo="Público mínimo" valor={dados.publicoMinimo} />
          <DadoResumo rotulo="Público esperado" valor={dados.publicoEsperado} />
          <DadoResumo rotulo="Público máximo" valor={dados.publicoMaximo} />
        </BlocoResumo>

        <BlocoResumo titulo="Financeiro">
          <DadoResumo rotulo="Margem de lucro" valor={dados.margemLucro} />
          <DadoResumo rotulo="Custos próprios" valor={custosProprios} />
          <DadoResumo
            rotulo="Cenário de referência"
            valor={nomeDoCenario(dados.cenarioReferencia)}
          />
        </BlocoResumo>
      </div>

      <div className="preveia-ticket">
        <div>
          <p className="preveia-ticket__titulo">Prévia do ticket no público esperado</p>
          <p className="preveia-ticket__apoio">{APOIO_PREVIA}</p>
        </div>
        <strong>—</strong>
      </div>

      <p className="aviso">
        Ao publicar, o evento e seus itens de custo ficam visíveis para os fornecedores aprovados
        nas categorias escolhidas.
      </p>
    </>
  )
}

const APOIO_PREVIA =
  'Ainda sem propostas de fornecedores. O valor é recalculado a cada proposta selecionada.'

function BlocoResumo({ titulo, children }) {
  return (
    <div className="resumo__bloco">
      <h2 className="secao__titulo">{titulo}</h2>
      {children}
    </div>
  )
}

function DadoResumo({ rotulo, valor }) {
  return (
    <div className="resumo__dado">
      <span>{rotulo}</span>
      <strong>{valor || '—'}</strong>
    </div>
  )
}
