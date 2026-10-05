import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { OrganizadorLayout } from '../../components/organizador/OrganizadorLayout.jsx'
import { Botao } from '../../components/organizador/Formulario.jsx'
import { ProgressoEtapas } from '../../components/comum/ProgressoEtapas.jsx'
import { ProgressoPropostaDesktop } from './EnviarProposta.jsx'
import { useIsMobile } from '../../hooks/useIsMobile.js'
import { EVENTOS_DISPONIVEIS } from '../../data/eventosDisponiveis.js'
import { ETAPAS_PROPOSTA, NOME_ITEM_PROPOSTA } from '../../data/propostaFornecedor.js'
import { ResumoItemCotacao, ResumoProposta } from '../../components/fornecedor/ResumoProposta.jsx'
import fotoBuffet from '../../assets/fornecedor/foto-servico-2.jpeg'
import fotoJantar from '../../assets/fornecedor/foto-servico-3.jpeg'
import fotoFingerFood from '../../assets/fornecedor/foto-servico-1.jpeg'
import iconeAdicionarFoto from '../../assets/fornecedor/icone-adicionar-foto.svg'
import '../../styles/fornecedor.css'

const FOTOS_DE_EXEMPLO = [fotoBuffet, fotoJantar, fotoFingerFood]

function CampoDescricao({ id, rotulo, obrigatorio, placeholder, linhas }) {
  return (
    <label className="proposta-detalhes__campo" htmlFor={id}>
      <span>
        {rotulo} {obrigatorio && <b aria-hidden="true">*</b>}
      </span>
      <textarea id={id} rows={linhas} placeholder={placeholder} required={obrigatorio} />
    </label>
  )
}

function GaleriaFotos() {
  const [fotos, setFotos] = useState(FOTOS_DE_EXEMPLO.map((src) => ({ src })))
  const urlsCriadas = useRef([])

  useEffect(() => () => urlsCriadas.current.forEach((url) => URL.revokeObjectURL(url)), [])

  function adicionarFotos(evento) {
    const arquivos = Array.from(evento.target.files ?? []).slice(0, Math.max(0, 5 - fotos.length))
    const novasFotos = arquivos.map((arquivo) => {
      const src = URL.createObjectURL(arquivo)
      urlsCriadas.current.push(src)
      return { src, nome: arquivo.name }
    })

    if (novasFotos.length) setFotos((atuais) => [...atuais, ...novasFotos])
    evento.target.value = ''
  }

  return (
    <section className="proposta-detalhes__fotos" aria-labelledby="titulo-fotos-servico">
      <div className="proposta-detalhes__cabecalho-fotos">
        <h3 id="titulo-fotos-servico">Fotos do serviço</h3>
        <p>Imagens de trabalhos anteriores ajudam o organizador a avaliar a proposta.</p>
      </div>

      <div className="proposta-detalhes__galeria">
        {fotos.map((foto, indice) => (
          <img
            key={foto.src}
            className={`proposta-detalhes__foto${indice === 2 ? ' proposta-detalhes__foto--desktop' : ''}`}
            src={foto.src}
            alt={foto.nome ?? `Exemplo de serviço realizado ${indice + 1}`}
          />
        ))}
        {fotos.length < 5 && (
          <label className="proposta-detalhes__adicionar">
            <input type="file" accept="image/jpeg,image/png" multiple onChange={adicionarFotos} />
            <img src={iconeAdicionarFoto} alt="" />
            <span>Adicionar</span>
          </label>
        )}
      </div>
      <p className="proposta-detalhes__ajuda-fotos">Até 5 fotos, em JPG ou PNG.</p>
    </section>
  )
}

export function EnviarPropostaEtapa2() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const evento = EVENTOS_DISPONIVEIS.find((item) => item.id === id) ?? EVENTOS_DISPONIVEIS[0]
  const voltar = () => navigate(`/fornecedor/eventos/${evento.id}/propostas/etapa-1`)

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
    <OrganizadorLayout
      perfil="fornecedor"
      titulo="Enviar proposta"
      sobreTitulo={`Eventos disponíveis · ${evento.nome}`}
      apoio={`Item: ${NOME_ITEM_PROPOSTA} — até 500 convidados VIP`}
      aoVoltar={voltar}
      subCabecalho={
        isMobile ? <ProgressoEtapas etapas={ETAPAS_PROPOSTA} etapaAtual={2} /> : undefined
      }
      rodape={acoes}
    >
      {!isMobile && <ProgressoPropostaDesktop etapaAtual={2} />}
      <div className="proposta-detalhes">
        <form
          id="form-proposta-detalhes"
          className="proposta-detalhes__formulario"
          data-evento-id={evento.id}
          onSubmit={(submit) => {
            submit.preventDefault()
            navigate(`/fornecedor/eventos/${evento.id}/propostas/etapa-3`)
          }}
        >
          <div className="proposta-detalhes__conteudo">
            <h2 className="proposta-detalhes__titulo-mobile">Descrição e fotos do serviço</h2>
            <div className="proposta-detalhes__cabecalho">
              <h2>Descrição do serviço</h2>
              <p>Detalhe o que está incluído para o organizador comparar.</p>
            </div>
            <CampoDescricao
              id="descricao-servico"
              rotulo="Descrição"
              obrigatorio
              linhas={3}
              placeholder="Buffet completo com finger foods premium para até 500 convidados, equipe de 12 garçons, montagem, desmontagem e descarte de resíduos."
            />
            <CampoDescricao
              id="nao-incluido"
              rotulo="O que não está incluído"
              linhas={1}
              placeholder="Bebidas alcoólicas e mobiliário da área VIP."
            />
          </div>
          <GaleriaFotos />
          {!isMobile && acoes}
        </form>
        {!isMobile && (
          <aside className="proposta-detalhes__lateral" aria-label="Resumo do item e da proposta">
            <ResumoItemCotacao categoria={evento.categorias[0]} />
            <ResumoProposta />
          </aside>
        )}
      </div>
    </OrganizadorLayout>
  )
}
