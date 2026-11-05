import { Selecao } from '../../../components/organizador/Selecao.jsx'
import {
  Campo,
  CampoFixo,
  Grupo,
  Linha,
  SeDesktop,
} from '../../../components/organizador/Formulario.jsx'
import { CENARIOS } from './cenarios.js'

const CAMPO_VALOR = { inputMode: 'decimal', 'data-validar': 'valor' }

// na edição os custos próprios ficam de fora: eles são mantidos na aba Itens de custo
export function EtapaCustos({ campo, dados, definir, comCustosProprios, isMobile }) {
  return (
    <>
      <Grupo isMobile={isMobile} titulo="Margem e teto de gastos">
        <SeDesktop isMobile={isMobile} envolver={Linha}>
          <Campo
            rotulo="Margem de lucro"
            placeholder="20%"
            ajuda={isMobile ? undefined : 'Aplicada sobre a receita do evento.'}
            inputMode="decimal"
            data-validar="percentual"
            required
            {...campo('margemLucro')}
          />
          <Campo
            rotulo="Teto de gastos (opcional)"
            placeholder="R$ 150.000"
            ajuda="Quanto você pode gastar. A visão geral mostra quanto dele já foi usado."
            inputMode="decimal"
            data-validar="valorPositivo"
            {...campo('tetoDeGastos')}
          />
        </SeDesktop>
      </Grupo>

      {comCustosProprios && (
        <Grupo isMobile={isMobile} titulo="Custos próprios estimados">
          <SeDesktop isMobile={isMobile} envolver={Linha}>
            <Campo
              rotulo="Custos fiscais e alvarás"
              placeholder="R$ 24.300"
              {...CAMPO_VALOR}
              {...campo('custosFiscais')}
            />
            <Campo
              rotulo="Equipe de produção"
              placeholder="R$ 17.800"
              {...CAMPO_VALOR}
              {...campo('equipeProducao')}
            />
            <Campo
              rotulo="Outros custos variáveis"
              placeholder="R$ 0,00"
              {...CAMPO_VALOR}
              {...campo('outrosCustos')}
            />
          </SeDesktop>
        </Grupo>
      )}

      <Grupo isMobile={isMobile} titulo="Regras de cálculo">
        <Linha>
          {!isMobile && <CampoFixo rotulo="Arredondamento do ticket" valor="Duas casas decimais" />}

          <Campo as="div" rotulo="Cenário de referência">
            <Selecao
              valor={dados.cenarioReferencia}
              opcoes={CENARIOS}
              aoEscolher={(valor) => definir('cenarioReferencia', valor)}
              rotuloAcessivel="Cenário de referência"
            />
          </Campo>
        </Linha>
      </Grupo>
    </>
  )
}
