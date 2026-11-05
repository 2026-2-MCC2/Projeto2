import { useCallback, useEffect, useRef, useState } from 'react'
import {
  apagarFotoDaProposta,
  buscarMinhaProposta,
  enviarFotoDaProposta,
  LIMITE_DE_FOTOS,
  problemaDaFoto,
  TIPOS_DE_FOTO,
} from '../../../application/propostas.js'
import {
  definirFotosPendentes,
  lerFotosPendentes,
} from '../../../application/rascunhosDePropostas.js'
import { Icone } from '../comum/Icone.jsx'
import { toast } from '../../toasts.js'
import iconeAdicionar from '../../assets/organizador/icone-adicionar.svg'
import { useRenovarFotosVencidas } from '../../hooks/useRenovarFotosVencidas.js'

const TIPOS_ACEITOS = TIPOS_DE_FOTO.join(',')

// Na proposta já enviada cada foto vai na hora para a API. Na proposta nova ainda não existe onde
// guardar a foto: ela fica com o rascunho e é enviada logo depois da proposta (enviarPropostaComFotos).
export function GaleriaDeFotos({ proposalKey, eventKey, itemKey }) {
  return (
    <section className="proposta-detalhes__fotos" aria-labelledby="titulo-fotos-servico">
      <div className="proposta-detalhes__cabecalho-fotos">
        <h3 id="titulo-fotos-servico">Fotos do serviço</h3>
        <p>Imagens de trabalhos anteriores ajudam o organizador a avaliar a proposta.</p>
      </div>

      {proposalKey ? (
        <FotosDaProposta proposalKey={proposalKey} />
      ) : (
        <FotosPendentes eventKey={eventKey} itemKey={itemKey} />
      )}

      <p className="proposta-detalhes__ajuda-fotos">
        Até {LIMITE_DE_FOTOS} fotos JPG, PNG ou WebP, com no máximo 5 MB cada.
        {!proposalKey && ' Elas são enviadas junto com a proposta.'}
      </p>
    </section>
  )
}

function FotosPendentes({ eventKey, itemKey }) {
  const [arquivos, setArquivos] = useState(() => lerFotosPendentes(eventKey, itemKey))

  function guardar(novos) {
    definirFotosPendentes(eventKey, itemKey, novos)
    setArquivos(novos)
  }

  function adicionar(evento) {
    const arquivo = evento.target.files?.[0]
    evento.target.value = ''
    if (!arquivo) return
    const problema = problemaDaFoto(arquivo)
    if (problema) {
      toast.erro('Esta foto não pode ser usada', { descricao: problema })
      return
    }
    guardar([...arquivos, arquivo])
  }

  return (
    <Galeria
      fotos={arquivos.map((arquivo, indice) => ({ chave: `${arquivo.name}-${indice}`, arquivo }))}
      aoAdicionar={adicionar}
      aoRemover={(indice) => guardar(arquivos.filter((_, posicao) => posicao !== indice))}
    />
  )
}

function FotosDaProposta({ proposalKey }) {
  const [fotos, setFotos] = useState([])
  const [enviando, setEnviando] = useState(false)
  // muda a cada envio ou remoção: uma renovação que começou antes não sobrescreve a lista mais nova
  const versaoDaLista = useRef(0)
  const aoFalharFoto = useRenovarFotosVencidas(() => {
    const versao = versaoDaLista.current
    buscarMinhaProposta(proposalKey)
      .then((detalhe) => {
        if (versaoDaLista.current === versao) setFotos(detalhe.photos ?? [])
      })
      .catch(() => {})
  })

  useEffect(() => {
    let telaAberta = true
    buscarMinhaProposta(proposalKey)
      .then((detalhe) => {
        if (telaAberta) setFotos(detalhe.photos ?? [])
      })
      .catch((falha) =>
        toast.erro('Não foi possível carregar as fotos', { descricao: falha.message }),
      )
    return () => {
      telaAberta = false
    }
  }, [proposalKey])

  async function adicionar(evento) {
    const arquivo = evento.target.files?.[0]
    evento.target.value = ''
    if (!arquivo) return
    const problema = problemaDaFoto(arquivo)
    if (problema) {
      toast.erro('Esta foto não pode ser usada', { descricao: problema })
      return
    }

    setEnviando(true)
    try {
      // sem url, a foto foi salva mas a API não conseguiu gerar o link agora: ela entra na lista do mesmo jeito
      const foto = await enviarFotoDaProposta(proposalKey, arquivo)
      versaoDaLista.current += 1
      setFotos((atuais) => [...atuais, foto])
    } catch (falha) {
      toast.erro('Não foi possível enviar a foto', { descricao: falha.message })
    } finally {
      setEnviando(false)
    }
  }

  async function remover(indice) {
    const { photo_key: photoKey } = fotos[indice]
    try {
      await apagarFotoDaProposta(proposalKey, photoKey)
      versaoDaLista.current += 1
      setFotos((atuais) => atuais.filter((foto) => foto.photo_key !== photoKey))
    } catch (falha) {
      toast.erro('Não foi possível apagar a foto', { descricao: falha.message })
    }
  }

  return (
    <Galeria
      fotos={fotos.map((foto) => ({ chave: foto.photo_key, url: foto.url }))}
      enviando={enviando}
      aoAdicionar={adicionar}
      aoRemover={remover}
      aoFalharFoto={aoFalharFoto}
    />
  )
}

// Prévia de um arquivo ainda não enviado. A URL nasce e é revogada no mesmo ref callback: no StrictMode
// ele roda duas vezes, e uma URL criada fora dele seria revogada na primeira limpeza e ficaria quebrada.
function PreviaDoArquivo({ arquivo, ...props }) {
  const mostrarArquivo = useCallback(
    (imagem) => {
      const url = URL.createObjectURL(arquivo)
      imagem.src = url
      return () => URL.revokeObjectURL(url)
    },
    [arquivo],
  )
  return <img ref={mostrarArquivo} {...props} />
}

// fotos: [{ chave, url }] das já enviadas (url null é foto salva cujo link não pôde ser gerado agora)
// ou [{ chave, arquivo }] das escolhidas que ainda vão com a proposta
function Galeria({ fotos, enviando = false, aoAdicionar, aoRemover, aoFalharFoto }) {
  return (
    <div className="proposta-detalhes__galeria">
      {fotos.map((foto, indice) => (
        <div key={foto.chave} className="proposta-detalhes__foto-item">
          {foto.arquivo ? (
            <PreviaDoArquivo
              arquivo={foto.arquivo}
              alt={`Foto ${indice + 1} do serviço`}
              className="proposta-detalhes__foto"
            />
          ) : foto.url ? (
            <img
              onError={aoFalharFoto}
              src={foto.url}
              alt={`Foto ${indice + 1} do serviço`}
              className="proposta-detalhes__foto"
            />
          ) : (
            <span className="proposta-detalhes__foto proposta-detalhes__foto--sem-link">
              Foto salva
            </span>
          )}
          <button
            type="button"
            className="proposta-detalhes__remover-foto"
            aria-label={`Apagar a foto ${indice + 1}`}
            onClick={() => aoRemover(indice)}
          >
            ×
          </button>
        </div>
      ))}

      {fotos.length < LIMITE_DE_FOTOS && (
        <label className="proposta-detalhes__adicionar">
          <Icone src={iconeAdicionar} />
          {enviando ? 'Enviando...' : 'Adicionar'}
          <input type="file" accept={TIPOS_ACEITOS} disabled={enviando} onChange={aoAdicionar} />
        </label>
      )}
    </div>
  )
}
