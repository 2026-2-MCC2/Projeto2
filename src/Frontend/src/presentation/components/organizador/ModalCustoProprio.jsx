import { useState } from 'react'
import { alterarCustoProprio, apagarCustoProprio } from '../../../application/eventos.js'
import { Modal } from '../comum/Modal.jsx'
import { toast } from '../../toasts.js'
import { TIPOS_DE_CUSTO } from '../../hooks/useNovoItemDeCusto.js'
import { Botao, Campo, Linha } from './Formulario.jsx'
import { Selecao } from './Selecao.jsx'

const valorParaCampo = (valor) =>
  Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// incluir é pelo "Adicionar item"; aqui o custo próprio já existe e pode ser alterado ou apagado
export function ModalCustoProprio({ eventKey, nomeDoEvento, custo, aoFechar }) {
  const [dados, setDados] = useState({
    descricao: custo.nome,
    tipo: custo.tipo,
    valor: valorParaCampo(custo.valorNumero),
  })
  const [enviando, setEnviando] = useState(false)
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)

  const definir = (nome) => (evento) =>
    setDados((atual) => ({ ...atual, [nome]: evento.target.value }))

  async function executar(acao, mensagemDeSucesso) {
    setEnviando(true)
    try {
      await acao()
      toast.sucesso(mensagemDeSucesso, { descricao: dados.descricao.trim() })
      aoFechar()
    } catch (falha) {
      toast.erro('Não foi possível salvar o custo', { descricao: falha.message })
      setEnviando(false)
    }
  }

  const salvar = () =>
    executar(() => alterarCustoProprio(eventKey, custo.chave, dados), 'Custo atualizado')

  const apagar = () => executar(() => apagarCustoProprio(eventKey, custo.chave), 'Custo apagado')

  return (
    <Modal
      titulo="Editar custo próprio"
      subtitulo={nomeDoEvento}
      largo
      acao={{
        cancelar: 'Cancelar',
        confirmar: enviando ? 'Salvando...' : 'Salvar custo',
        aoConfirmar: salvar,
        ocupado: enviando,
      }}
      aoFechar={() => !enviando && aoFechar()}
    >
      <Campo
        rotulo="Descrição"
        placeholder="Alvará da prefeitura"
        maxLength={255}
        required
        value={dados.descricao}
        onChange={(evento) =>
          setDados((atual) => ({ ...atual, descricao: evento.target.value.trimStart() }))
        }
      />

      <Linha>
        <Campo as="div" rotulo="Tipo">
          <Selecao
            valor={dados.tipo}
            opcoes={TIPOS_DE_CUSTO}
            aoEscolher={(tipo) => setDados((atual) => ({ ...atual, tipo }))}
            rotuloAcessivel="Tipo de custo"
          />
        </Campo>
        <Campo
          rotulo="Valor"
          placeholder="R$ 1.500,00"
          inputMode="decimal"
          data-validar="valor"
          required
          value={dados.valor}
          onChange={definir('valor')}
        />
      </Linha>

      <Botao
        type="button"
        secundario
        className="botao--texto-perigo"
        disabled={enviando}
        onClick={() => (confirmandoExclusao ? apagar() : setConfirmandoExclusao(true))}
      >
        {confirmandoExclusao ? 'Clique de novo para apagar' : 'Apagar este custo'}
      </Botao>
    </Modal>
  )
}
