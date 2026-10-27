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

export function EtapaCustos({ campo, dados, definir, isMobile }) {
  return (
    <>
      <Grupo isMobile={isMobile} titulo="Margem de lucro">
        <Campo
          rotulo="Margem de lucro"
          placeholder="20%"
          ajuda={isMobile ? undefined : 'Aplicada sobre a receita do evento.'}
          inputMode="decimal"
          data-validar="percentual"
          required
          {...campo('margemLucro')}
        />
      </Grupo>

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

      <Grupo isMobile={isMobile} titulo="Regras de cálculo">
        <Linha>
          {!isMobile && <CampoFixo rotulo="Arredondamento do ticket" valor="Duas casas decimais" />}

          <Campo rotulo="Cenário de referência">
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
