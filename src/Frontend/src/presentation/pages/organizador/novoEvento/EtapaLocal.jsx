import { useState } from 'react'
import { Campo, Grupo, Linha, SeDesktop } from '../../../components/organizador/Formulario.jsx'
import { consultarCep } from '../../../../application/localizacao.js'
import { mascararCep } from '../../../../domain/formatacao.js'

const CAMPO_PUBLICO = { inputMode: 'numeric', 'data-validar': 'inteiro', required: true }

export function EtapaLocal({ campo, definir, atualizarCampos, isMobile }) {
  const [buscandoCep, setBuscandoCep] = useState(false)

  async function preencherEndereco(cepDigitos) {
    if (cepDigitos.length !== 8 || buscandoCep) return
    setBuscandoCep(true)
    try {
      const enderecoEncontrado = await consultarCep(cepDigitos)
      if (enderecoEncontrado) {
        const novos = {
          cidade: enderecoEncontrado.cidade || '',
          estado: enderecoEncontrado.estado || '',
        }
        if (enderecoEncontrado.enderecoCompleto) {
          novos.endereco = enderecoEncontrado.enderecoCompleto
        } else if (enderecoEncontrado.logradouro) {
          novos.endereco = enderecoEncontrado.logradouro
        }

        if (atualizarCampos) {
          atualizarCampos(novos)
        } else if (definir) {
          Object.entries(novos).forEach(([k, v]) => definir(k, v))
        }
      }
    } finally {
      setBuscandoCep(false)
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

    const digitos = valorMascarado.replace(/\D/g, '')
    if (digitos.length === 8) {
      preencherEndereco(digitos)
    }
  }

  function aoSairCep(evento) {
    const digitos = evento.target.value.replace(/\D/g, '')
    if (digitos.length === 8) {
      preencherEndereco(digitos)
    }
  }

  const propsCep = campo('cep')

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
            onBlur={aoSairCep}
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
