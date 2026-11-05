import { Link, useLocation } from 'react-router-dom'
import { AcessoLayout } from '../../components/acesso/AcessoLayout.jsx'
import { Icone } from '../../components/comum/Icone.jsx'
import fotoMicrofone from '../../assets/acesso/foto-microfone.jpg'
import marcadorConcluido from '../../assets/acesso/marcador-concluido.svg'
import marcadorAtual from '../../assets/acesso/marcador-atual.svg'
import marcadorPendente from '../../assets/acesso/marcador-pendente.svg'
import marcadorAguardando from '../../assets/acesso/marcador-aguardando.svg'
import marcadorRejeitado from '../../assets/acesso/marcador-rejeitado.svg'
import { formatarCnpj, formatarData } from '../../../domain/formatacao.js'

const TEXTOS = {
  pendente: {
    tituloDaPagina: 'Cadastro em análise',
    selo: 'Aguardando aprovação',
    titulo: 'Seu cadastro está em análise',
    explicacao:
      'O administrador da TrocaTicket precisa aprovar o cadastro antes do primeiro acesso. Tente entrar mais tarde com o e-mail e a senha cadastrados.',
    chamada: ['Enquanto isso,', 'o palco vai sendo', 'montado.'],
    apoio:
      'Assim que o acesso for liberado, você já começa a cadastrar eventos e receber propostas.',
  },
  rejeitado: {
    tituloDaPagina: 'Cadastro não aprovado',
    selo: 'Cadastro não aprovado',
    titulo: 'Seu cadastro não foi aprovado',
    explicacao:
      'O administrador analisou os dados e não aprovou o cadastro. Veja o motivo na análise abaixo e, se for o caso, faça um cadastro novo com os dados corrigidos.',
    chamada: ['Confira os dados', 'e tente de', 'novo.'],
    apoio: 'Se tiver dúvidas sobre o motivo, fale com a equipe do TrocaTicket.',
  },
  bloqueado: {
    tituloDaPagina: 'Acesso bloqueado',
    selo: 'Acesso bloqueado',
    titulo: 'Seu acesso foi bloqueado',
    explicacao:
      'O administrador bloqueou esta conta. Enquanto durar o bloqueio, não é possível entrar nem movimentar eventos ou propostas.',
    chamada: ['Fale com a', 'equipe do', 'TrocaTicket.'],
    apoio: 'Para pedir a revisão do bloqueio, entre em contato com a equipe da plataforma.',
  },
}

const SITUACOES = Object.keys(TEXTOS)

function etapasDoCadastro({ situacao, enviadoEm, decididoEm, motivo }) {
  const analise =
    situacao === 'rejeitado'
      ? {
          descricao: decididoEm ? `Rejeitado em ${formatarData(decididoEm)}` : 'Rejeitado',
          motivo,
          marcador: marcadorRejeitado,
          estado: 'rejeitada',
        }
      : {
          descricao: 'Verificação dos dados informados no cadastro',
          marcador: marcadorAtual,
          estado: 'atual',
        }

  return [
    {
      id: 'enviado',
      titulo: 'Cadastro enviado',
      descricao: `${formatarData(enviadoEm ?? new Date())} · dados recebidos pela plataforma`,
      marcador: marcadorConcluido,
      estado: 'concluida',
    },
    { id: 'analise', titulo: 'Análise do administrador', ...analise },
    {
      id: 'liberado',
      titulo: 'Acesso liberado',
      descricao: 'Você entra com e-mail e senha cadastrados',
      marcador: marcadorPendente,
      estado: 'pendente',
    },
  ]
}

const NOMES_DOS_PERFIS = { organizador: 'Organizador', fornecedor: 'Fornecedor' }

// quando a página é aberta direto, sem vir do cadastro ou do login
const NAO_INFORMADO = 'Não informado'

export function CadastroPendente() {
  const acompanhamento = useLocation().state ?? {}
  const { perfil, nome, cnpj, categorias } = acompanhamento
  const situacao = SITUACOES.includes(acompanhamento.situacao)
    ? acompanhamento.situacao
    : 'pendente'
  const textos = TEXTOS[situacao]
  const bloqueado = situacao === 'bloqueado'
  const etapas = bloqueado ? [] : etapasDoCadastro({ ...acompanhamento, situacao })

  return (
    <AcessoLayout
      tituloDaPagina={textos.tituloDaPagina}
      foto={fotoMicrofone}
      tom="azul"
      fotoNoMobile={false}
      titulo={textos.chamada.map((linha, indice) => (
        <span key={linha}>
          {indice > 0 && <br />}
          {linha}
        </span>
      ))}
      descricao={textos.apoio}
    >
      <span className={`acesso__situacao acesso__situacao--${bloqueado ? 'rejeitado' : situacao}`}>
        <Icone src={marcadorAguardando} />
        {textos.selo}
      </span>

      <header className="acesso__cabecalho">
        <h1>{textos.titulo}</h1>
        <p>{textos.explicacao}</p>
      </header>

      {bloqueado && (
        <div className="acesso__motivo" role="note">
          <span>Motivo informado pelo administrador</span>
          <p>{acompanhamento.motivo || 'O administrador não informou o motivo.'}</p>
        </div>
      )}

      {etapas.length > 0 && (
        <ol className="acesso__linha-do-tempo">
          {etapas.map((etapa) => (
            <li key={etapa.id} className={`acesso__etapa acesso__etapa--${etapa.estado}`}>
              <Icone src={etapa.marcador} className="acesso__etapa-marcador" />
              <div>
                <strong>{etapa.titulo}</strong>
                <span>{etapa.descricao}</span>
                {etapa.motivo && <p className="acesso__etapa-motivo">Motivo: {etapa.motivo}</p>}
              </div>
            </li>
          ))}
        </ol>
      )}

      <dl className="acesso__resumo">
        <div>
          <dt>Perfil solicitado</dt>
          <dd>{NOMES_DOS_PERFIS[perfil] ?? NAO_INFORMADO}</dd>
        </div>
        <div>
          <dt>Razão social</dt>
          <dd>{nome || NAO_INFORMADO}</dd>
        </div>
        <div>
          <dt>CNPJ</dt>
          <dd>{cnpj ? formatarCnpj(cnpj) : NAO_INFORMADO}</dd>
        </div>
        {perfil === 'fornecedor' && (
          <div>
            <dt>Categorias de atuação</dt>
            <dd>{categorias?.length ? categorias.join(', ') : NAO_INFORMADO}</dd>
          </div>
        )}
      </dl>

      <Link to="/entrar" className="acesso__botao">
        Voltar para o login
      </Link>
    </AcessoLayout>
  )
}
