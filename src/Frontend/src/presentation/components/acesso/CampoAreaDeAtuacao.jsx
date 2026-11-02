import { AREAS_DE_ATUACAO } from '../../../domain/areasDeAtuacao.js'

// Campo "Área de atuação" do cadastro de fornecedor (desktop e mobile).
// O label envolve o select, então o leitor de tela anuncia o nome do campo. Com required e a opção
// vazia "Selecione", o useValidacao do formulário mostra "Preencha este campo." como nos outros campos.
export function CampoAreaDeAtuacao({ valor, aoMudar }) {
  return (
    <label className="campo">
      <span>Área de atuação</span>
      <select value={valor} onChange={aoMudar} required>
        <option value="">Selecione</option>
        {AREAS_DE_ATUACAO.map((area) => (
          <option key={area} value={area}>
            {area}
          </option>
        ))}
      </select>
    </label>
  )
}
