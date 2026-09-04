# DKCA DEVS — Frontend

Aplicação React criada com Vite (JSX), organizada em camadas seguindo a clean
architecture.

## Como rodar

```sh
npm install
npm run dev
```

| Comando           | O que faz                            |
| ----------------- | ------------------------------------ |
| `npm run dev`     | Servidor de desenvolvimento          |
| `npm run build`   | Gera a versão de produção em `dist/` |
| `npm run preview` | Testa localmente o build de produção |
| `npm run lint`    | Procura erros no código (oxlint)     |
| `npm run format`  | Formata o código (Prettier)          |

Copie o `.env.example` para `.env` e ajuste a URL da API quando o backend existir.

## Estrutura

```
src/
├── domain/          Regras de negócio em JavaScript puro
├── application/     Casos de uso: uma ação do sistema por arquivo
├── infrastructure/  Único ponto de contato com a API (api.js)
└── presentation/    React: componentes, páginas, rotas, estilos e textos
```

## A regra

As importações apontam para dentro: `presentation` pode importar de
`application`, que pode importar de `domain`. O contrário não acontece.

O motivo é prático. Telas, endereços de API e bibliotecas mudam com frequência;
regras de negócio mudam pouco. Se a regra depende da tela, redesenhar a tela
quebra a regra. Invertendo a dependência, o núcleo fica isolado dessas trocas.

## Onde colocar cada coisa

1. O que existe no sistema, e o que é válido → `domain/`
2. Uma ação que o usuário realiza → `application/`
3. Chamada à API → `infrastructure/api.js`
4. O que aparece na tela → `presentation/pages/` e `presentation/components/`

Não é preciso criar as quatro coisas de uma vez. Uma tela estática vive só em
`presentation/`; as outras camadas entram quando houver necessidade. As pastas
`domain/` e `application/` estão vazias por isso.

A tela inicial da aplicação traz essa explicação de forma interativa: rode
`npm run dev` e abra no navegador.
