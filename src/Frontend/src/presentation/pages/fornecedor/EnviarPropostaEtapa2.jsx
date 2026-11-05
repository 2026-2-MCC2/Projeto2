import { useNavigate } from 'react-router-dom'
import { EtapaDaProposta } from '../../components/fornecedor/EtapaDaProposta.jsx'
import { GaleriaDeFotos } from '../../components/fornecedor/GaleriaDeFotos.jsx'
import { ResumoItemCotacao, ResumoProposta } from '../../components/fornecedor/ResumoProposta.jsx'
import { Botao } from '../../components/organizador/Formulario.jsx'
import { useIsMobile } from '../../hooks/useIsMobile.js'
import { usePropostaEmEdicao } from '../../hooks/usePropostaEmEdicao.js'
import { useValidacao } from '../../hooks/useValidacao.js'
import '../../styles/fornecedor.css'

function CampoDescricao({ id, rotulo, obrigatorio, placeholder, linhas, maximo, value, onChange }) {
  return (
    <label className="proposta-detalhes__campo" htmlFor={id}>
      <span>
        {rotulo} {obrigatorio && <b aria-hidden="true">*</b>}
      </span>
      <textarea
        id={id}
        rows={linhas}
        placeholder={placeholder}
        required={obrigatorio}
        maxLength={maximo}
        value={value}
        onChange={onChange}
      />
    </label>
  )
}

// Etapa 2 do envio de proposta: descrição do serviço.
export function EnviarPropostaEtapa2() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const validacao = useValidacao()
  const proposta = usePropostaEmEdicao()
  const { rascunho, preencher, item, evento } = proposta
  const voltar = () => navigate(proposta.rotaDaEtapa(1))

  const acoes = (
    <div className="proposta-detalhes__acoes">
      {!isMobile && <span>* Campos obrigatórios</span>}
      <div>
        <Botao type="button" secundario onClick={voltar}>
          Voltar
        </Botao>
        <Botao type="submit" form="form-proposta-detalhes">
          Continuar
        </Botao>
      </div>
    </div>
  )

  return (
    <EtapaDaProposta proposta={proposta} etapa={2} aoVoltar={voltar} rodape={acoes}>
      {() => (
        <div className="proposta-detalhes">
          <form
            id="form-proposta-detalhes"
            className="proposta-detalhes__formulario"
            onSubmit={(envio) => {
              envio.preventDefault()
              navigate(proposta.rotaDaEtapa(3))
            }}
            {...validacao}
          >
            <div className="proposta-detalhes__conteudo">
              <h2 className="proposta-detalhes__titulo-mobile">Descrição do serviço</h2>
              <div className="proposta-detalhes__cabecalho">
                <h2>Descrição do serviço</h2>
                <p>Detalhe o que está incluído para o organizador comparar.</p>
              </div>
              <CampoDescricao
                id="descricao-servico"
                rotulo="Descrição"
                obrigatorio
                linhas={3}
                maximo={16383}
                placeholder="O que está incluído: materiais, equipe, montagem, desmontagem e limpeza."
                value={rascunho.descricao}
                onChange={preencher('descricao')}
              />
              <CampoDescricao
                id="nao-incluido"
                rotulo="O que não está incluído"
                linhas={1}
                maximo={500}
                placeholder="Itens que ficam por conta do organizador."
                value={rascunho.naoIncluido}
                onChange={preencher('naoIncluido')}
              />
            </div>
            <GaleriaDeFotos proposalKey={proposta.proposalKey} />
            {!isMobile && acoes}
          </form>
          {!isMobile && (
            <aside className="proposta-detalhes__lateral" aria-label="Resumo do item e da proposta">
              <ResumoItemCotacao item={item} evento={evento} />
              <ResumoProposta rascunho={rascunho} item={item} />
            </aside>
          )}
        </div>
      )}
    </EtapaDaProposta>
  )
}
