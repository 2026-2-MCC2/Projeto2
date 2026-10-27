import { Campo, CampoFixo, Grupo, Linha } from '../../../components/organizador/Formulario.jsx'

export function EtapaIdentificacao({ campo, isMobile }) {
  return (
    <>
      <Grupo isMobile={isMobile} titulo="Identificação">
        <Campo
          rotulo="Nome do evento"
          placeholder="Festival Primavera Som & Luz 2026"
          required
          {...campo('nome')}
        />

        <Linha>
          <Campo rotulo="Categoria" placeholder="Festival" required {...campo('categoria')} />
          {!isMobile && (
            <CampoFixo rotulo="Tipo de ingresso" valor="Inteira — único tipo por evento" />
          )}
        </Linha>

        <Campo rotulo="Descrição">
          <textarea
            rows={3}
            placeholder={
              isMobile
                ? 'Festival de música ao ar livre com três palcos.'
                : 'Festival de música ao ar livre com três palcos, área gastronômica e espaço VIP.'
            }
            {...campo('descricao')}
          />
        </Campo>
      </Grupo>

      <Grupo isMobile={isMobile} titulo="Período">
        <Linha>
          <Campo
            rotulo={isMobile ? 'Início' : 'Data de início'}
            placeholder="18/10/2026"
            inputMode="numeric"
            data-validar="dataFutura"
            required
            {...campo('dataInicio')}
          />
          <Campo
            rotulo={isMobile ? 'Término' : 'Data de término'}
            placeholder="20/10/2026"
            inputMode="numeric"
            data-validar="data"
            required
            {...campo('dataTermino')}
          />
        </Linha>

        {!isMobile && (
          <Linha>
            <Campo
              rotulo="Horário de abertura"
              placeholder="14:00"
              data-validar="horario"
              {...campo('horarioAbertura')}
            />
            <Campo
              rotulo="Horário de encerramento"
              placeholder="23:00"
              data-validar="horario"
              {...campo('horarioEncerramento')}
            />
          </Linha>
        )}
      </Grupo>
    </>
  )
}
