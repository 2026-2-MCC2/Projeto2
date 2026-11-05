import { useEffect, useState } from 'react'
import {
  apagarFotoDaProposta,
  buscarMinhaProposta,
  enviarFotoDaProposta,
  LIMITE_DE_FOTOS,
  TAMANHO_MAXIMO_DA_FOTO,
} from '../../../application/propostas.js'
import { Icone } from '../comum/Icone.jsx'
import { toast } from '../../toasts.js'
import iconeAdicionar from '../../assets/organizador/icone-adicionar.svg'
import { useRenovarFotosVencidas } from '../../hooks/useRenovarFotosVencidas.js'

const TIPOS_ACEITOS = 'image/jpeg,image/png,image/webp'

// A foto precisa de uma proposta já enviada (a rota é da proposta): no envio novo a galeria só avisa.
export function GaleriaDeFotos({ proposalKey }) {
  const [fotos, setFotos] = useState([])
  const [enviando, setEnviando] = useState(false)
  const aoFalharFoto = useRenovarFotosVencidas(() =>
    buscarMinhaProposta(proposalKey)
      .then((detalhe) => setFotos(detalhe.photos ?? []))
      .catch(() => {}),
  )

  useEffect(() => {
    if (!proposalKey) return
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
    if (arquivo.size > TAMANHO_MAXIMO_DA_FOTO) {
      toast.erro('Foto acima de 5 MB', { descricao: 'Escolha uma imagem menor.' })
      return
    }

    setEnviando(true)
    try {
      const foto = await enviarFotoDaProposta(proposalKey, arquivo)
      // a foto foi salva, mas a API não conseguiu gerar o link: busca a lista de novo
      if (foto.url) setFotos((atuais) => [...atuais, foto])
      else setFotos((await buscarMinhaProposta(proposalKey)).photos ?? [])
    } catch (falha) {
      toast.erro('Não foi possível enviar a foto', { descricao: falha.message })
    } finally {
      setEnviando(false)
    }
  }

  async function remover(photoKey) {
    try {
      await apagarFotoDaProposta(proposalKey, photoKey)
      setFotos((atuais) => atuais.filter((foto) => foto.photo_key !== photoKey))
    } catch (falha) {
      toast.erro('Não foi possível apagar a foto', { descricao: falha.message })
    }
  }

  return (
    <section className="proposta-detalhes__fotos" aria-labelledby="titulo-fotos-servico">
      <div className="proposta-detalhes__cabecalho-fotos">
        <h3 id="titulo-fotos-servico">Fotos do serviço</h3>
        <p>Imagens de trabalhos anteriores ajudam o organizador a avaliar a proposta.</p>
      </div>

      {proposalKey ? (
        <>
          <div className="proposta-detalhes__galeria">
            {fotos.map((foto, indice) => (
              <div key={foto.photo_key} className="proposta-detalhes__foto-item">
                <img
                  onError={aoFalharFoto}
                  src={foto.url}
                  alt={`Foto ${indice + 1} do serviço`}
                  className="proposta-detalhes__foto"
                />
                <button
                  type="button"
                  className="proposta-detalhes__remover-foto"
                  aria-label={`Apagar a foto ${indice + 1}`}
                  onClick={() => remover(foto.photo_key)}
                >
                  ×
                </button>
              </div>
            ))}

            {fotos.length < LIMITE_DE_FOTOS && (
              <label className="proposta-detalhes__adicionar">
                <Icone src={iconeAdicionar} />
                {enviando ? 'Enviando...' : 'Adicionar'}
                <input
                  type="file"
                  accept={TIPOS_ACEITOS}
                  disabled={enviando}
                  onChange={adicionar}
                />
              </label>
            )}
          </div>
          <p className="proposta-detalhes__ajuda-fotos">
            Até {LIMITE_DE_FOTOS} fotos JPG, PNG ou WebP, com no máximo 5 MB cada.
          </p>
        </>
      ) : (
        <p className="aviso" role="note">
          As fotos podem ser anexadas depois de enviar a proposta: é só abrir a proposta e editar.
        </p>
      )}
    </section>
  )
}
