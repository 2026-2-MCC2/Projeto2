import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PassosDasEtapas, ProgressoEtapas } from '../../components/comum/ProgressoEtapas.jsx'
import { OrganizadorLayout } from '../../components/organizador/OrganizadorLayout.jsx'
import { Acoes, Botao } from '../../components/organizador/Formulario.jsx'
import { useIsMobile } from '../../hooks/useIsMobile.js'
import { useValidacao } from '../../hooks/useValidacao.js'
import { EtapaIdentificacao } from './novoEvento/EtapaIdentificacao.jsx'
import { EtapaLocal } from './novoEvento/EtapaLocal.jsx'
import { EtapaCustos } from './novoEvento/EtapaCustos.jsx'
import { EtapaRevisao } from './novoEvento/EtapaRevisao.jsx'
import { criarEvento, publicarEventoParaCotacao } from '../../../application/eventos.js'
import {
  validarPublicoEsperado,
  validarPublicoMaximo,
  validarTermino,
} from '../../../domain/validacao.js'

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

// regras que comparam campos da mesma etapa
const REGRAS_ENTRE_CAMPOS = {
  dataTermino: (valor, valores) => validarTermino(valor, valores.dataInicio),
  publicoMaximo: (valor, valores) => validarPublicoMaximo(valor, valores.publicoMinimo),
  publicoEsperado: (valor, valores) =>
    validarPublicoEsperado(valor, valores.publicoMinimo, valores.publicoMaximo),
}

export function NovoEvento() {
  const isMobile = useIsMobile()
  const navigate = useNavigate()
  const [etapa, setEtapa] = useState(1)
  const [dados, setDados] = useState(VALOR_INICIAL)
  const validacao = useValidacao(REGRAS_ENTRE_CAMPOS)

  const etapaAtual = ETAPAS[etapa - 1]
  const ultimaEtapa = etapa === ETAPAS.length

  const definir = (nome, valor) => setDados((atual) => ({ ...atual, [nome]: valor }))

  const campo = (nome) => ({
    name: nome,
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

  const [salvando, setSalvando] = useState(false)
  const [erroApi, setErroApi] = useState('')

  async function publicar(evento) {
    evento.preventDefault()
    setSalvando(true)
    setErroApi('')
    try {
      const novoEvento = await criarEvento(dados)
      try {
        await publicarEventoParaCotacao(novoEvento.id)
      } catch (errStatus) {
        console.warn('Evento criado como rascunho, mas status não foi alterado:', errStatus)
      }
      navigate('/organizador/eventos', { viewTransition: true })
    } catch (err) {
      setErroApi(err.message || 'Erro ao cadastrar evento.')
      setSalvando(false)
    }
  }

  // Na 1ª etapa a seta do topo sai do cadastro; nas demais volta uma etapa.
  const aoVoltarNoTopo = etapa === 1 ? () => navigate('/organizador/eventos') : voltar

  const acoes = (
    <Acoes>
      {etapa > 1 && (
        <Botao type="button" secundario onClick={voltar} disabled={salvando}>
          Voltar
        </Botao>
      )}
      <Botao type="submit" form="form-novo-evento" disabled={salvando}>
        {salvando ? 'Publicando...' : ultimaEtapa ? 'Publicar para cotação' : 'Continuar'}
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
      subCabecalho={
        isMobile ? (
          <ProgressoEtapas etapas={ETAPAS.map((item) => item.nome)} etapaAtual={etapa} />
        ) : undefined
      }
    >
      {!isMobile && <PassosDasEtapas etapas={ETAPAS.map((item) => item.nome)} etapaAtual={etapa} />}

      <form
        id="form-novo-evento"
        className={isMobile ? 'novo-evento-form' : 'painel'}
        onSubmit={ultimaEtapa ? publicar : avancar}
        {...validacao}
      >
        {isMobile && <p className="secao__apoio">{etapaAtual.apoioMobile}</p>}

        {erroApi && (
          <p
            className="formulario__erro"
            role="alert"
            style={{
              color: 'var(--status-alerta-texto, #c92a2a)',
              background: 'var(--status-alerta-fundo, #ffe3e3)',
              padding: '0.75rem 1rem',
              borderRadius: '6px',
              margin: '0.5rem 0 1rem 0',
              fontWeight: 500,
            }}
          >
            {erroApi}
          </p>
        )}

        {etapasDoFormulario[etapa]}

        {!isMobile && acoes}
      </form>
    </OrganizadorLayout>
  )
}
