import { useState } from 'react'
import { Modal } from '../comum/Modal.jsx'
import { Campo, Linha } from './Formulario.jsx'
import iconeSelecionado from '../../assets/organizador/icone-selecionado.svg'

const ORIGENS = [
  { valor: 'cotacao', nome: 'Cotação com fornecedores', apoio: 'O item fica aberto para receber propostas.' },
  { valor: 'proprio', nome: 'Custo próprio', apoio: 'Valor definido por você, sem cotação.' },
]

export function ModalNovoItem({ evento, aoFechar }) {
  const [origem, setOrigem] = useState('cotacao')
  const porCotacao = origem === 'cotacao'

  return (
    <Modal
      titulo="Novo item de custo"
      subtitulo={evento}
      largo
      acao={{ cancelar: 'Cancelar', confirmar: 'Adicionar item' }}
      semCancelarNoMobile
      aoFechar={aoFechar}
    >
      <Campo rotulo="Descrição do item" placeholder="Iluminação cênica do palco principal" />

      <Linha>
        <Campo rotulo="Categoria" placeholder="Estrutura" />
        <Campo rotulo={porCotacao ? 'Valor previsto' : 'Valor do custo'} placeholder="R$ 38.000,00" />
      </Linha>

      <div className="origem">
        <span className="origem__rotulo">Como este custo será definido</span>

        <div className="origem__opcoes">
          {ORIGENS.map((opcao) => (
            <button
              key={opcao.valor}
              type="button"
              className={`origem__opcao${origem === opcao.valor ? ' origem__opcao--ativa' : ''}`}
              onClick={() => setOrigem(opcao.valor)}
            >
              <span className="origem__titulo">
                {opcao.nome}
                {origem === opcao.valor && <img src={iconeSelecionado} alt="" />}
              </span>
              <small>{opcao.apoio}</small>
            </button>
          ))}
        </div>
      </div>

      <Campo rotulo={porCotacao ? 'Observações para os fornecedores' : 'Observações internas'}>
        <textarea rows={2} placeholder="Opcional — requisitos técnicos, prazos, restrições do espaço." />
      </Campo>
    </Modal>
  )
}
