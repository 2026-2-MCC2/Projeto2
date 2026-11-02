import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PassosDasEtapas, ProgressoEtapas } from '../../../components/comum/ProgressoEtapas.jsx'
import { OrganizadorLayout } from '../../../components/organizador/OrganizadorLayout.jsx'
import { Acoes, Botao } from '../../../components/organizador/Formulario.jsx'
import { useIsMobile } from '../../../hooks/useIsMobile.js'
import { useValidacao } from '../../../hooks/useValidacao.js'
import { EtapaIdentificacao } from './EtapaIdentificacao.jsx'
import { EtapaLocal } from './EtapaLocal.jsx'
import { EtapaCustos } from './EtapaCustos.jsx'
import { EtapaRevisao } from './EtapaRevisao.jsx'
import {
  validarPublicoEsperado,
  validarPublicoMaximo,
  validarTermino,
} from '../../../../domain/validacao.js'

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
    apoio: 'Revise antes de salvar o evento.',
    apoioMobile: 'Revise antes de salvar o evento.',
  },
]

// regras que comparam campos da mesma etapa
const REGRAS_ENTRE_CAMPOS = {
  dataTermino: (valor, valores) => validarTermino(valor, valores.dataInicio),
  publicoMaximo: (valor, valores) =>
    validarPublicoMaximo(valor, valores.publicoMinimo, valores.capacidadeEspaco),
  publicoEsperado: (valor, valores) =>
    validarPublicoEsperado(valor, valores.publicoMinimo, valores.publicoMaximo),
}

// titulo, textos do botão final e aoConcluir mudam entre criar e editar; o resto do fluxo é o mesmo
export function FormularioDeEvento({
  titulo,
  valorInicial,
  comCustosProprios,
  permiteDataPassada = false,
  avisoDaRevisao,
  textoDoBotaoFinal,
  textoAoSalvar,
  destinoAoSair,
  aoConcluir,
}) {
  const isMobile = useIsMobile()
  const navigate = useNavigate()
  const [etapa, setEtapa] = useState(1)
  const [dados, setDados] = useState(valorInicial)
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

  async function concluir(evento) {
    evento.preventDefault()
    setSalvando(true)
    setErroApi('')
    try {
      await aoConcluir(dados)
    } catch (falha) {
      setErroApi(falha.message || 'Não foi possível salvar o evento.')
      setSalvando(false)
    }
  }

  // Na 1ª etapa a seta do topo sai do cadastro; nas demais volta uma etapa.
  const aoVoltarNoTopo = etapa === 1 ? () => navigate(destinoAoSair) : voltar

  const acoes = (
    <Acoes>
      {etapa > 1 && (
        <Botao type="button" secundario onClick={voltar} disabled={salvando}>
          Voltar
        </Botao>
      )}
      <Botao type="submit" form="form-novo-evento" disabled={salvando}>
        {salvando ? textoAoSalvar : ultimaEtapa ? textoDoBotaoFinal : 'Continuar'}
      </Botao>
    </Acoes>
  )

  const etapasDoFormulario = {
    1: (
      <EtapaIdentificacao
        campo={campo}
        dados={dados}
        permiteDataPassada={permiteDataPassada}
        isMobile={isMobile}
      />
    ),
    2: (
      <EtapaLocal
        campo={campo}
        definir={definir}
        atualizarCampos={(novos) => setDados((atual) => ({ ...atual, ...novos }))}
        isMobile={isMobile}
      />
    ),
    3: (
      <EtapaCustos
        campo={campo}
        dados={dados}
        definir={definir}
        comCustosProprios={comCustosProprios}
        isMobile={isMobile}
      />
    ),
    4: (
      <EtapaRevisao
        dados={dados}
        comCustosProprios={comCustosProprios}
        aviso={avisoDaRevisao}
        isMobile={isMobile}
      />
    ),
  }

  return (
    <OrganizadorLayout
      titulo={titulo}
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
        onSubmit={ultimaEtapa ? concluir : avancar}
        {...validacao}
      >
        {isMobile && <p className="secao__apoio">{etapaAtual.apoioMobile}</p>}

        {erroApi && (
          <p className="formulario__erro" role="alert">
            {erroApi}
          </p>
        )}

        {etapasDoFormulario[etapa]}

        {!isMobile && acoes}
      </form>
    </OrganizadorLayout>
  )
}
