// Conteúdo didático exibido na tela inicial.
//
// Fica separado dos componentes para que o texto possa ser ajustado sem
// mexer no código da interface. Os exemplos usam uma lista de tarefas
// apenas como ilustração; não têm relação com o projeto em si.

export const CAMADAS = [
  {
    id: 'domain',
    nome: 'domain',
    caminho: 'src/domain/',
    resumo: 'Regras de negócio em JavaScript puro.',
    detalhe:
      'Define o que existe no sistema e o que é válido. Uma tarefa precisa de título; uma tarefa já concluída não pode ser concluída de novo. São regras que valeriam em qualquer tecnologia, então não dependem de nenhuma.',
    proibicoes: ['não importa React', 'não usa fetch', 'não conhece telas nem rotas'],
    exemplo: {
      arquivo: 'src/domain/Tarefa.js',
      codigo: `export class Tarefa {
  constructor({ id, titulo, concluida = false }) {
    if (!titulo || titulo.trim().length < 3) {
      throw new Error('O título precisa ter ao menos 3 caracteres.')
    }
    this.id = id
    this.titulo = titulo
    this.concluida = concluida
  }

  podeSerConcluida() {
    return !this.concluida
  }
}`,
    },
  },
  {
    id: 'application',
    nome: 'application',
    caminho: 'src/application/',
    resumo: 'Um arquivo por ação que o sistema oferece.',
    detalhe:
      'Cada arquivo coordena os passos de uma ação: valida a entrada, chama a API, devolve o resultado. Listar esta pasta mostra tudo que o sistema faz.',
    proibicoes: ['não importa React', 'não sabe como a tela é desenhada'],
    exemplo: {
      arquivo: 'src/application/listarTarefas.js',
      codigo: `import { api } from '../infrastructure/api.js'
import { Tarefa } from '../domain/Tarefa.js'

export async function listarTarefas() {
  const dados = await api.get('/tarefas')
  return dados.map((json) => new Tarefa(json))
}`,
    },
  },
  {
    id: 'infrastructure',
    nome: 'infrastructure',
    caminho: 'src/infrastructure/',
    resumo: 'O único ponto de contato com a API.',
    detalhe:
      'Por enquanto só o api.js, com get e post em cima do fetch. A URL do backend vem do arquivo .env e é lida aqui, então trocar de servidor ou de biblioteca HTTP altera um arquivo só.',
    proibicoes: ['não contém regra de negócio', 'não decide o que aparece na tela'],
    exemplo: {
      arquivo: 'src/infrastructure/api.js',
      codigo: `const URL_BASE = import.meta.env.VITE_API_URL

export const api = {
  get(caminho) {
    return requisitar(caminho)
  },
  post(caminho, dados) {
    return requisitar(caminho, {
      method: 'POST',
      body: JSON.stringify(dados),
    })
  },
}`,
    },
  },
  {
    id: 'presentation',
    nome: 'presentation',
    caminho: 'src/presentation/',
    resumo: 'Componentes, páginas, rotas e estilos.',
    detalhe:
      'Componentes recebem dados prontos e renderizam. Páginas chamam os casos de uso. Cálculo ou decisão de negócio dentro de um .jsx é sinal de que aquele trecho pertence a domain.',
    proibicoes: ['não chama fetch direto', 'não guarda regra de negócio no componente'],
    exemplo: {
      arquivo: 'src/presentation/pages/Tarefas.jsx',
      codigo: `import { useEffect, useState } from 'react'
import { listarTarefas } from '../../application/listarTarefas.js'

export function Tarefas() {
  const [tarefas, setTarefas] = useState([])

  useEffect(() => {
    listarTarefas().then(setTarefas)
  }, [])

  return <ul>{tarefas.map((t) => <li key={t.id}>{t.titulo}</li>)}</ul>
}`,
    },
  },
]

export const ARVORE = [
  { caminho: 'src/', tipo: 'pasta', nivel: 0, camada: null, nota: 'todo o código-fonte' },
  { caminho: 'domain/', tipo: 'pasta', nivel: 1, camada: 'domain', nota: 'regras de negócio' },
  {
    caminho: 'application/',
    tipo: 'pasta',
    nivel: 1,
    camada: 'application',
    nota: 'casos de uso',
  },
  {
    caminho: 'infrastructure/',
    tipo: 'pasta',
    nivel: 1,
    camada: 'infrastructure',
    nota: 'acesso ao mundo externo',
  },
  {
    caminho: 'api.js',
    tipo: 'arquivo',
    nivel: 2,
    camada: 'infrastructure',
    nota: 'get e post que falam com o backend',
  },
  {
    caminho: 'presentation/',
    tipo: 'pasta',
    nivel: 1,
    camada: 'presentation',
    nota: 'tudo que é React',
  },
  {
    caminho: 'components/',
    tipo: 'pasta',
    nivel: 2,
    camada: 'presentation',
    nota: 'pedaços de tela reutilizáveis',
  },
  {
    caminho: 'pages/',
    tipo: 'pasta',
    nivel: 2,
    camada: 'presentation',
    nota: 'uma tela inteira, ligada a uma rota',
  },
  {
    caminho: 'routes/',
    tipo: 'pasta',
    nivel: 2,
    camada: 'presentation',
    nota: 'qual endereço abre qual página',
  },
  { caminho: 'styles/', tipo: 'pasta', nivel: 2, camada: 'presentation', nota: 'CSS global' },
  {
    caminho: 'content/',
    tipo: 'pasta',
    nivel: 2,
    camada: 'presentation',
    nota: 'textos separados do código',
  },
  {
    caminho: 'App.jsx',
    tipo: 'arquivo',
    nivel: 1,
    camada: 'presentation',
    nota: 'monta a aplicação e carrega as rotas',
  },
  {
    caminho: 'main.jsx',
    tipo: 'arquivo',
    nivel: 1,
    camada: 'presentation',
    nota: 'coloca o App dentro do index.html',
  },
]

/** Quem pode importar quem. As setas sempre apontam para dentro. */
export const PODE_IMPORTAR = {
  presentation: ['application', 'domain', 'infrastructure'],
  application: ['domain', 'infrastructure'],
  infrastructure: ['domain'],
  domain: [],
}

export const MOTIVOS = {
  permitido:
    'A dependência aponta para dentro: uma camada externa se apoia em outra mais estável. É o sentido esperado.',
  proibido:
    'Faria uma camada estável depender de um detalhe que muda com frequência. Se a tela for redesenhada ou a API trocar, a regra de negócio quebra junto.',
  mesma: 'Mesma camada: arquivos vizinhos se importam normalmente.',
}
