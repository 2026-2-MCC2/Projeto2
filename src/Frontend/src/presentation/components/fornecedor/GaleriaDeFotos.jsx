import { useEffect, useRef, useState } from 'react'
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
import { ErroNaTela } from '../comum/EstadoDaTela.jsx'
import { Icone } from '../comum/Icone.jsx'
import { Modal } from '../comum/Modal.jsx'
import { FotoDoServico } from './FotoDoServico.jsx'
import { toast } from '../../toasts.js'
import iconeAdicionar from '../../assets/organizador/icone-adicionar.svg'
import iconeApagar from '../../assets/admin/icone-modal-rejeitar.svg'
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
        <FotosDaProposta key={proposalKey} proposalKey={proposalKey} />
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

// a foto do campo de arquivo, ou null quando nada foi escolhido ou ela não pode ser usada (com o aviso)
function fotoEscolhida(evento) {
  const arquivo = evento.target.files?.[0]
  evento.target.value = ''
  if (!arquivo) return null
  const problema = problemaDaFoto(arquivo)
  if (problema) {
    toast.erro('Esta foto não pode ser usada', { descricao: problema })
    return null
  }
  return arquivo
}

// o navegador não diz se dois File são o mesmo arquivo do disco: nome, tamanho e data bastam aqui
const identidadeDoArquivo = (arquivo) => `${arquivo.name}|${arquivo.size}|${arquivo.lastModified}`

function FotosPendentes({ eventKey, itemKey }) {
  const [arquivos, setArquivos] = useState(() => lerFotosPendentes(eventKey, itemKey))

  function guardar(novos) {
    definirFotosPendentes(eventKey, itemKey, novos)
    setArquivos(novos)
  }

  function adicionar(evento) {
    const arquivo = fotoEscolhida(evento)
    if (!arquivo) return
    const identidade = identidadeDoArquivo(arquivo)
    if (arquivos.some((escolhido) => identidadeDoArquivo(escolhido) === identidade)) {
      toast.info('Esta foto já foi escolhida')
      return
    }
    guardar([...arquivos, arquivo])
  }

  return (
    <Galeria
      fotos={arquivos.map((arquivo) => ({ chave: identidadeDoArquivo(arquivo), arquivo }))}
      aoAdicionar={adicionar}
      aoRemover={(indice) => guardar(arquivos.filter((_, posicao) => posicao !== indice))}
    />
  )
}

function FotosDaProposta({ proposalKey }) {
  const [fotos, setFotos] = useState([])
  const [carga, setCarga] = useState({ carregando: true, erro: null })
  const [tentativa, setTentativa] = useState(0)
  const [enviando, setEnviando] = useState(false)
  const [fotoParaApagar, setFotoParaApagar] = useState(null)
  const [apagando, setApagando] = useState(false)
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
    const versao = versaoDaLista.current
    buscarMinhaProposta(proposalKey)
      .then((detalhe) => {
        if (!telaAberta) return
        if (versaoDaLista.current === versao) setFotos(detalhe.photos ?? [])
        setCarga({ carregando: false, erro: null })
      })
      .catch((erro) => {
        if (telaAberta) setCarga({ carregando: false, erro })
      })
    return () => {
      telaAberta = false
    }
  }, [proposalKey, tentativa])

  async function adicionar(evento) {
    const arquivo = fotoEscolhida(evento)
    if (!arquivo) return

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

  async function confirmarRemocao() {
    const { photo_key: photoKey } = fotoParaApagar
    setApagando(true)
    try {
      await apagarFotoDaProposta(proposalKey, photoKey)
      tirarDaLista(photoKey)
    } catch (falha) {
      // 404: já tinha sido apagada (em outra aba, por exemplo), então o resultado é o mesmo
      if (falha.status === 404) tirarDaLista(photoKey)
      else toast.erro('Não foi possível apagar a foto', { descricao: falha.message })
    } finally {
      setApagando(false)
      setFotoParaApagar(null)
    }
  }

  function tirarDaLista(photoKey) {
    versaoDaLista.current += 1
    setFotos((atuais) => atuais.filter((foto) => foto.photo_key !== photoKey))
  }

  if (carga.erro) {
    return (
      <ErroNaTela
        erro={carga.erro}
        aoTentarDeNovo={() => {
          setCarga({ carregando: true, erro: null })
          setTentativa((valor) => valor + 1)
        }}
      />
    )
  }

  return (
    <>
      <Galeria
        fotos={fotos.map((foto) => ({ chave: foto.photo_key, url: foto.url }))}
        ocupadoCom={carga.carregando ? 'Carregando...' : enviando ? 'Enviando...' : null}
        aoAdicionar={adicionar}
        aoRemover={(indice) => setFotoParaApagar(fotos[indice])}
        aoFalharFoto={aoFalharFoto}
      />
      {fotoParaApagar && (
        <Modal
          icone={iconeApagar}
          corDoIcone="vermelho"
          titulo="Apagar esta foto?"
          mensagem="Ela sai da proposta na hora, sem precisar salvar as alterações."
          acao={{
            cancelar: 'Cancelar',
            confirmar: apagando ? 'Apagando...' : 'Apagar foto',
            aoConfirmar: confirmarRemocao,
            ocupado: apagando,
          }}
          aoFechar={() => !apagando && setFotoParaApagar(null)}
        />
      )}
    </>
  )
}

// fotos: [{ chave, url }] das já enviadas ou [{ chave, arquivo }] das escolhidas (ver FotoDoServico)
// ocupadoCom: texto que troca o Adicionar enquanto a lista carrega ou uma foto é enviada. O leitor de
// tela ouve só esse texto, numa região à parte que fica vazia quando nada está acontecendo (assim a
// volta para "Adicionar" não é anunciada)
function Galeria({ fotos, ocupadoCom = null, aoAdicionar, aoRemover, aoFalharFoto }) {
  return (
    <div className="proposta-detalhes__galeria">
      <span role="status" className="so-leitor">
        {ocupadoCom}
      </span>
      {fotos.map((foto, indice) => (
        <div key={foto.chave} className="proposta-detalhes__foto-item">
          <FotoDoServico foto={foto} indice={indice} aoFalharFoto={aoFalharFoto} />
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
          <span aria-hidden="true">{ocupadoCom ?? 'Adicionar'}</span>
          <input
            type="file"
            aria-label="Adicionar foto"
            accept={TIPOS_ACEITOS}
            disabled={ocupadoCom !== null}
            onChange={aoAdicionar}
          />
        </label>
      )}
    </div>
  )
}
