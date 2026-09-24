import { Link } from 'react-router-dom'
import { AcessoLayout } from '../../components/acesso/AcessoLayout.jsx'
import fotoMicrofone from '../../assets/acesso/foto-microfone.jpg'
import marcadorConcluido from '../../assets/acesso/marcador-concluido.svg'
import marcadorAtual from '../../assets/acesso/marcador-atual.svg'
import marcadorPendente from '../../assets/acesso/marcador-pendente.svg'
import marcadorAguardando from '../../assets/acesso/marcador-aguardando.svg'

const ETAPAS = [
  {
    id: 'enviado',
    titulo: 'Cadastro enviado',
    descricao: `${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })} · dados recebidos pela plataforma`,
    marcador: marcadorConcluido,
    situacao: 'concluida',
  },
  {
    id: 'analise',
    titulo: 'Análise do administrador',
    descricao: 'Verificação dos dados informados no cadastro',
    marcador: marcadorAtual,
    situacao: 'atual',
  },
  {
    id: 'liberado',
    titulo: 'Acesso liberado',
    descricao: 'Você entra com e-mail e senha cadastrados',
    marcador: marcadorPendente,
    situacao: 'pendente',
  },
]

export function CadastroPendente() {
  return (
    <AcessoLayout
      foto={fotoMicrofone}
      tom="azul"
      fotoNoMobile={false}
      titulo={
        <>
          Enquanto isso,
          <br />
          o palco vai sendo
          <br />
          montado.
        </>
      }
      descricao="Assim que o acesso for liberado, você já começa a cadastrar eventos e receber propostas."
    >
      <span className="acesso__situacao">
        <img src={marcadorAguardando} alt="" />
        Aguardando aprovação
      </span>

      <header className="acesso__cabecalho">
        <h1>Seu cadastro está em análise</h1>
        <p>
          O administrador da TrocaTicket precisa aprovar o cadastro antes do primeiro acesso. Você
          recebe um aviso no e-mail informado.
        </p>
      </header>

      <ol className="acesso__linha-do-tempo">
        {ETAPAS.map((etapa) => (
          <li key={etapa.id} className={`acesso__etapa acesso__etapa--${etapa.situacao}`}>
            <img src={etapa.marcador} alt="" className="acesso__etapa-marcador" />
            <div>
              <strong>{etapa.titulo}</strong>
              <span>{etapa.descricao}</span>
            </div>
          </li>
        ))}
      </ol>

      <dl className="acesso__resumo">
        <div>
          <dt>Perfil solicitado</dt>
          <dd>Organizador</dd>
        </div>
        <div>
          <dt>Razão social</dt>
          <dd>TrocaTicket Produções</dd>
        </div>
        <div>
          <dt>CNPJ</dt>
          <dd>12.345.678/0001-90</dd>
        </div>
      </dl>

      <Link to="/" className="acesso__botao">
        Voltar para o login
      </Link>
    </AcessoLayout>
  )
}
