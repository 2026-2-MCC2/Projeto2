import { useState } from 'react'
import { Campo, Linha, SeDesktop } from './Formulario.jsx'
import iconeSelecionado from '../../assets/organizador/icone-selecionado.svg'

const ORIGENS = [
  {
    valor: 'cotacao',
    nome: 'Cotação com fornecedores',
    apoio: 'O item fica aberto para receber propostas.',
  },
  { valor: 'proprio', nome: 'Custo próprio', apoio: 'Valor definido por você, sem cotação.' },
]

// Os mesmos campos servem ao modal do desktop e à página do mobile.
export function CamposDoItem({ isMobile = false, linhas = 2 }) {
  const [origem, setOrigem] = useState('cotacao')
  const porCotacao = origem === 'cotacao'

  return (
    <>
      <Campo rotulo="Descrição do item" placeholder="Iluminação cênica do palco principal" />

      <SeDesktop isMobile={isMobile} envolver={Linha}>
        <Campo rotulo="Categoria" placeholder="Estrutura" />
        <Campo
          rotulo={porCotacao ? 'Valor previsto' : 'Valor do custo'}
          placeholder="R$ 38.000,00"
        />
      </SeDesktop>

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
        <textarea
          rows={linhas}
          placeholder="Opcional — requisitos técnicos, prazos, restrições do espaço."
        />
      </Campo>
    </>
  )
}
