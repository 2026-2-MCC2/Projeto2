import { Campo, Linha, SeDesktop } from './Formulario.jsx'
import { Icone } from '../comum/Icone.jsx'
import iconeSelecionado from '../../assets/organizador/icone-selecionado.svg'
import { TIPOS_DE_CUSTO } from '../../hooks/useNovoItemDeCusto.js'
import { Selecao } from './Selecao.jsx'
import { CATEGORIAS_DE_ATUACAO } from '../../../domain/categoriasDeAtuacao.js'

// as mesmas categorias de atuação dos fornecedores: é por elas que o item chega a quem pode cotar
const OPCOES_DE_CATEGORIA = CATEGORIAS_DE_ATUACAO.map((categoria) => ({
  valor: categoria,
  nome: categoria,
}))

const ORIGENS = [
  {
    valor: 'cotacao',
    nome: 'Cotação com fornecedores',
    apoio: 'O item fica aberto para receber propostas.',
  },
  { valor: 'proprio', nome: 'Custo próprio', apoio: 'Valor definido por você, sem cotação.' },
]

// Os mesmos campos servem ao modal do desktop e à página do mobile.
export function CamposDoItem({ dados, definir, isMobile = false, linhas = 2 }) {
  const porCotacao = dados.origem === 'cotacao'
  const campo = (nome) => ({
    value: dados[nome],
    onChange: (evento) => definir(nome, evento.target.value),
  })

  return (
    <>
      <Campo
        rotulo="Descrição do item"
        placeholder="Iluminação cênica do palco principal"
        maxLength={255}
        required
        {...campo('descricao')}
      />

      <SeDesktop isMobile={isMobile} envolver={Linha}>
        {porCotacao ? (
          <Campo as="div" rotulo="Categoria">
            <Selecao
              valor={dados.categoria}
              opcoes={OPCOES_DE_CATEGORIA}
              aoEscolher={(valor) => definir('categoria', valor)}
              rotuloAcessivel="Categoria"
            />
          </Campo>
        ) : (
          <Campo as="div" rotulo="Tipo de custo">
            <Selecao
              valor={dados.tipoDeCusto}
              opcoes={TIPOS_DE_CUSTO}
              aoEscolher={(valor) => definir('tipoDeCusto', valor)}
              rotuloAcessivel="Tipo de custo"
            />
          </Campo>
        )}
        {/* o valor previsto é opcional; o custo próprio precisa de valor */}
        <Campo
          rotulo={porCotacao ? 'Valor previsto' : 'Valor do custo'}
          placeholder="R$ 38.000,00"
          inputMode="decimal"
          data-validar={porCotacao ? 'valor' : 'valorPositivo'}
          required={!porCotacao}
          {...campo('valor')}
        />
      </SeDesktop>

      <div className="origem">
        <span className="origem__rotulo">Como este custo será definido</span>

        <div className="origem__opcoes">
          {ORIGENS.map((opcao) => (
            <button
              key={opcao.valor}
              type="button"
              aria-pressed={dados.origem === opcao.valor}
              className={`origem__opcao${dados.origem === opcao.valor ? ' origem__opcao--ativa' : ''}`}
              onClick={() => definir('origem', opcao.valor)}
            >
              <span className="origem__titulo">
                {opcao.nome}
                {dados.origem === opcao.valor && <Icone src={iconeSelecionado} />}
              </span>
              <small>{opcao.apoio}</small>
            </button>
          ))}
        </div>
      </div>

      {porCotacao && (
        <Campo rotulo="Observações para os fornecedores">
          <textarea
            rows={linhas}
            placeholder="Opcional — requisitos técnicos, prazos, restrições do espaço."
            {...campo('observacoes')}
          />
        </Campo>
      )}
    </>
  )
}
