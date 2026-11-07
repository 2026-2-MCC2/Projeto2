import { useEffect, useState } from 'react'
import { formatarDataEHora } from '../../../application/eventos.js'
import { listarHistorico } from '../../../infrastructure/historicoAdmin.js'
import { Carregando, ErroNaTela, Vazio } from '../../components/comum/EstadoDaTela.jsx'
import { Botao } from '../../components/organizador/Formulario.jsx'
import { OrganizadorLayout } from '../../components/organizador/OrganizadorLayout.jsx'
import { useIsMobile } from '../../hooks/useIsMobile.js'
import '../../styles/admin.css'

const PERFIS = { organizador: 'Organizador', fornecedor: 'Fornecedor' }

const FILTROS = ['Todos', 'Aprovado', 'Rejeitado', 'Bloqueado', 'Reativado']

// a reativação é a volta de bloqueado para aprovado
function acaoDoRegistro({ de, para }) {
  if (para === 'approved') return de === 'blocked' ? 'Reativado' : 'Aprovado'
  return para === 'rejected' ? 'Rejeitado' : 'Bloqueado'
}

function Filtros({ selecionado, aoSelecionar }) {
  return (
    <div className="barra__filtros" role="group" aria-label="Filtrar histórico por ação">
      {FILTROS.map((filtro) => (
        <button
          key={filtro}
          type="button"
          className={`filtro${selecionado === filtro ? ' filtro--ativo' : ''}`}
          aria-pressed={selecionado === filtro}
          onClick={() => aoSelecionar(filtro)}
        >
          {filtro}
        </button>
      ))}
    </div>
  )
}

export function Historico() {
  const isMobile = useIsMobile()
  const [filtro, setFiltro] = useState('Todos')
  const [tentativa, setTentativa] = useState(0)
  const [estado, setEstado] = useState({ situacao: 'carregando' })
  const [carregandoMais, setCarregandoMais] = useState(false)
  const [erroAoCarregarMais, setErroAoCarregarMais] = useState('')

  useEffect(() => {
    let telaAberta = true
    listarHistorico(0)
      .then(({ registros, temMais }) => {
        if (telaAberta) setEstado({ situacao: 'pronto', registros, temMais, pagina: 0 })
      })
      .catch((erro) => {
        if (telaAberta) setEstado({ situacao: 'erro', erro })
      })
    return () => {
      telaAberta = false
    }
  }, [tentativa])

  async function carregarMais() {
    setCarregandoMais(true)
    setErroAoCarregarMais('')
    try {
      const proxima = estado.pagina + 1
      const { registros, temMais } = await listarHistorico(proxima)
      setEstado((atual) => ({
        ...atual,
        registros: [...atual.registros, ...registros],
        temMais,
        pagina: proxima,
      }))
    } catch (falha) {
      setErroAoCarregarMais(falha.message)
    } finally {
      setCarregandoMais(false)
    }
  }

  const filtros = <Filtros selecionado={filtro} aoSelecionar={setFiltro} />
  const registros =
    estado.situacao === 'pronto'
      ? estado.registros.filter(
          (registro) => filtro === 'Todos' || acaoDoRegistro(registro) === filtro,
        )
      : []

  return (
    <OrganizadorLayout
      perfil="admin"
      titulo={isMobile ? 'Histórico' : 'Histórico de alterações'}
      apoio="Registro das aprovações, rejeições, bloqueios e reativações."
      acoes={isMobile ? undefined : filtros}
    >
      {estado.situacao === 'carregando' && <Carregando mensagem="Carregando o histórico…" />}

      {estado.situacao === 'erro' && (
        <ErroNaTela
          erro={estado.erro}
          aoTentarDeNovo={() => {
            setEstado({ situacao: 'carregando' })
            setTentativa((valor) => valor + 1)
          }}
        />
      )}

      {estado.situacao === 'pronto' && estado.registros.length === 0 && (
        <Vazio
          icone="atencao"
          titulo="Nenhuma decisão registrada ainda"
          mensagem="As aprovações, rejeições e bloqueios aparecem aqui assim que forem feitos."
        />
      )}

      {estado.situacao === 'pronto' && estado.registros.length > 0 && (
        <>
          {isMobile && filtros}

          <section className="historico" aria-label="Histórico de alterações">
            <div className="historico__cabecalho" aria-hidden="true">
              <span>Data</span>
              <span>Ação</span>
              <span>Usuário</span>
              <span>Perfil</span>
              <span>Responsável</span>
            </div>

            {registros.map((registro) => {
              const acao = acaoDoRegistro(registro)
              return (
                <article className="historico__linha" key={registro.chave}>
                  <time className="historico__data" dateTime={registro.decididoEm}>
                    {formatarDataEHora(registro.decididoEm)}
                  </time>
                  <div className="historico__acao">
                    <span className="historico__rotulo">Ação</span>
                    <span
                      className={`historico__etiqueta historico__etiqueta--${acao.toLowerCase()}`}
                    >
                      {acao}
                    </span>
                  </div>
                  <div className="historico__empresa">
                    <p>{registro.nome}</p>
                    {registro.motivo && (
                      <p className="historico__motivo">Motivo: {registro.motivo}</p>
                    )}
                  </div>
                  <p className="historico__perfil">
                    <span className="historico__rotulo">Perfil</span>
                    {PERFIS[registro.perfil] ?? registro.perfil}
                  </p>
                  <p className="historico__responsavel">
                    <span className="historico__rotulo">Responsável</span>
                    {registro.responsavel}
                  </p>
                </article>
              )
            })}

            {registros.length === 0 && (
              <p className="historico__vazio" role="status">
                Nenhum registro carregado para esse filtro.
              </p>
            )}
          </section>

          {erroAoCarregarMais && (
            <p className="mensagem-erro" role="alert">
              {erroAoCarregarMais}
            </p>
          )}
          {estado.temMais && (
            <Botao type="button" secundario onClick={carregarMais} disabled={carregandoMais}>
              {carregandoMais ? 'Carregando...' : 'Carregar mais'}
            </Botao>
          )}
        </>
      )}
    </OrganizadorLayout>
  )
}
