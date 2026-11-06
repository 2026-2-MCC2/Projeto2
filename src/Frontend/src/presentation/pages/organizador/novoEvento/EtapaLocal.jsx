import { useRef, useState } from 'react'
import { Campo, Grupo, Linha, SeDesktop } from '../../../components/organizador/Formulario.jsx'
import { consultarCep } from '../../../../application/localizacao.js'
import { digitos, mascararCep } from '../../../../domain/formatacao.js'

const CAMPO_PUBLICO = { inputMode: 'numeric', 'data-validar': 'inteiro', required: true }

export function EtapaLocal({ campo, definir, atualizarCampos, isMobile }) {
  const [buscandoCep, setBuscandoCep] = useState(false)
  // o endereço só é preenchido quando o CEP muda, para não apagar o número que a pessoa já digitou
  const ultimoCepBuscado = useRef(digitos(campo('cep').value) || null)

  async function preencherEndereco(cepDigitos) {
    if (cepDigitos === ultimoCepBuscado.current) return
    ultimoCepBuscado.current = cepDigitos
    setBuscandoCep(true)

    const enderecoEncontrado = await consultarCep(cepDigitos)
    // a pessoa mudou o CEP enquanto esta busca andava: a resposta antiga é descartada
    if (cepDigitos !== ultimoCepBuscado.current) return
    setBuscandoCep(false)

    if (!enderecoEncontrado) {
      ultimoCepBuscado.current = null
      return
    }
    // CEP geral de cidade não traz rua: o que a pessoa já digitou continua
    const encontrados = {
      cidade: enderecoEncontrado.cidade,
      estado: enderecoEncontrado.estado,
      endereco: enderecoEncontrado.enderecoCompleto || enderecoEncontrado.logradouro,
    }
    preencherCampos(Object.fromEntries(Object.entries(encontrados).filter(([, valor]) => valor)))
  }

  function preencherCampos(novos) {
    if (atualizarCampos) {
      atualizarCampos(novos)
    } else if (definir) {
      Object.entries(novos).forEach(([nome, valor]) => definir(nome, valor))
    }
  }

  function aoMudarCep(evento) {
    const valorOriginal = evento.target.value
    const valorMascarado = mascararCep(valorOriginal)

    if (definir) {
      definir('cep', valorMascarado)
    } else {
      campo('cep').onChange({ target: { value: valorMascarado } })
    }

    const cepDigitos = digitos(valorMascarado)
    if (cepDigitos.length === 8) {
      preencherEndereco(cepDigitos)
    } else {
      ultimoCepBuscado.current = null
      setBuscandoCep(false)
    }
  }

  const propsCep = campo('cep')

  const campoCapacidade = (
    <Campo
      rotulo="Capacidade do espaço"
      placeholder="20.000 pessoas"
      data-validar="inteiro"
      {...campo('capacidadeEspaco')}
    />
  )

  return (
    <>
      <Grupo isMobile={isMobile} titulo="Local">
        <SeDesktop isMobile={isMobile} envolver={Linha}>
          <Campo
            rotulo="Nome do espaço"
            placeholder="Allianz Parque"
            required
            {...campo('nomeEspaco')}
          />
          <Campo
            rotulo="CEP"
            placeholder="05001-100"
            data-validar="cep"
            inputMode="numeric"
            maxLength={9}
            ajuda={buscandoCep ? 'Buscando endereço no ViaCEP...' : undefined}
            {...propsCep}
            onChange={aoMudarCep}
          />
        </SeDesktop>

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
          {!isMobile && campoCapacidade}
        </Linha>

        {/* no celular também: o público máximo é conferido contra a capacidade */}
        {isMobile && campoCapacidade}
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
