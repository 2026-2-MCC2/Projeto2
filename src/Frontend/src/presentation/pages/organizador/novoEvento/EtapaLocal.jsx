import { Campo, Grupo, Linha } from '../../../components/organizador/Formulario.jsx'

const CAMPO_PUBLICO = { inputMode: 'numeric', 'data-validar': 'inteiro', required: true }

export function EtapaLocal({ campo, isMobile }) {
  return (
    <>
      <Grupo isMobile={isMobile} titulo="Local">
        <Linha>
          <Campo
            rotulo="Nome do espaço"
            placeholder="Allianz Parque"
            required
            {...campo('nomeEspaco')}
          />
          {!isMobile && (
            <Campo rotulo="CEP" placeholder="05001-100" data-validar="cep" {...campo('cep')} />
          )}
        </Linha>

        <Campo
          rotulo="Endereço"
          placeholder={
            isMobile
              ? 'Av. Francisco Matarazzo, 1705'
              : 'Av. Francisco Matarazzo, 1705 — Água Branca'
          }
          required
          {...campo('endereco')}
        />

        <Linha>
          <Campo rotulo="Cidade" placeholder="São Paulo" required {...campo('cidade')} />
          <Campo
            rotulo="Estado"
            placeholder="SP"
            data-validar="estado"
            required
            {...campo('estado')}
          />
          {!isMobile && (
            <Campo
              rotulo="Capacidade do espaço"
              placeholder="20.000 pessoas"
              data-validar="inteiro"
              {...campo('capacidadeEspaco')}
            />
          )}
        </Linha>
      </Grupo>

      <Grupo isMobile={isMobile} titulo="Público estimado">
        {isMobile ? (
          <>
            <Linha>
              <Campo
                rotulo="Público mínimo"
                placeholder="8.000"
                {...CAMPO_PUBLICO}
                {...campo('publicoMinimo')}
              />
              <Campo
                rotulo="Público máximo"
                placeholder="15.000"
                {...CAMPO_PUBLICO}
                {...campo('publicoMaximo')}
              />
            </Linha>
            <Campo
              rotulo="Público esperado"
              placeholder="12.000"
              {...CAMPO_PUBLICO}
              {...campo('publicoEsperado')}
            />
          </>
        ) : (
          <Linha>
            <Campo
              rotulo="Público mínimo"
              placeholder="8.000"
              ajuda="Cenário conservador do cálculo do ticket."
              {...CAMPO_PUBLICO}
              {...campo('publicoMinimo')}
            />
            <Campo
              rotulo="Público esperado"
              placeholder="12.000"
              ajuda="Usado como referência principal."
              {...CAMPO_PUBLICO}
              {...campo('publicoEsperado')}
            />
            <Campo
              rotulo="Público máximo"
              placeholder="15.000"
              ajuda="Limitado pela capacidade do espaço."
              {...CAMPO_PUBLICO}
              {...campo('publicoMaximo')}
            />
          </Linha>
        )}
      </Grupo>
    </>
  )
}
