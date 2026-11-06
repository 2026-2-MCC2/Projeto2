import { CabecalhoDaSecao } from './CabecalhoDaSecao.jsx'
import { Ingresso } from './Ingresso.jsx'

const ETAPAS = [
  {
    titulo: 'Cadastre o evento',
    descricao: 'Comece pelo período, local e público esperado. O restante você completa depois.',
  },
  {
    titulo: 'Liste os itens de custo',
    descricao:
      'Palco, som, alimentação, bebidas: registre o que o evento precisa e o que já é custo próprio.',
  },
  {
    titulo: 'Receba propostas',
    descricao:
      'Fornecedores do segmento enviam propostas para cada item. Compare e escolha a melhor.',
  },
  {
    titulo: 'Calcule o ticket',
    descricao:
      'Com os custos consolidados, a plataforma sugere o preço do ingresso e o ponto de equilíbrio.',
  },
]

export function ComoFunciona() {
  return (
    <section id="como-funciona" className="landing__secao" aria-labelledby="como-funciona-titulo">
      <CabecalhoDaSecao
        id="como-funciona-titulo"
        sobretitulo="COMO FUNCIONA"
        titulo="Do primeiro custo ao preço final, em quatro etapas"
        subtitulo="Tudo o que antes ficava espalhado em planilhas e conversas, agora em um só lugar."
      />

      <ol className="etapas-landing">
        {ETAPAS.map((etapa, indice) => (
          <Ingresso
            key={etapa.titulo}
            elemento="li"
            orientacao="vertical"
            canhotoNoInicio
            className="etapa-landing"
            canhoto={
              <p className="etapa-landing__numero">
                <span>ETAPA</span>
                <strong>{String(indice + 1).padStart(2, '0')}</strong>
              </p>
            }
          >
            <h3 className="etapa-landing__titulo">{etapa.titulo}</h3>
            <p className="etapa-landing__descricao">{etapa.descricao}</p>
          </Ingresso>
        ))}
      </ol>
    </section>
  )
}
