# FECAP - Fundação de Comércio Álvares Penteado

<p align="center">
<a href= "https://www.fecap.br/"><img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRhZPrRa89Kma0ZZogxm0pi-tCn_TLKeHGVxywp-LXAFGR3B1DPouAJYHgKZGV0XTEf4AE&usqp=CAU" alt="FECAP - Fundação de Comércio Álvares Penteado" border="0"></a>
</p>

# Gestão Troca Ticket

## DKCA DEVS

## Integrantes: <a href="https://www.linkedin.com/in/andre-makoto-molitor/">Andre Makoto Molitor</a>, <a href="https://www.linkedin.com/in/caio-fabio-freitas/">Caio Fabio Freitas</a>, <a href="https://www.linkedin.com/in/davivarella/">Davi Varella</a>, <a href="https://www.linkedin.com/in/kaua-casella/">Kauã Casella da Silva</a>

## Professores Orientadores: <a href="https://www.linkedin.com/in/cristina-machado-corr%C3%AAa-leite-630309160/">Cristina Machado Corrêa Leite</a>, <a href="https://www.linkedin.com/in/dolemes/">David de Oliveira Lemes</a>, <a href="https://www.linkedin.com/in/francisco-escobar/">Francisco de Souza Escobar</a>, <a href="https://www.linkedin.com/in/j%C3%A9sus-gomes-83b769108/">Jésus Gomes</a>, <a href="https://www.linkedin.com/in/katia-bossi/">Kátia Bossi</a>

## Descrição

<p align="center">
<img src="Imagens/login_desktop.png" alt="Tela de login da plataforma Gestão Troca Ticket" border="0">
<br>
Tela de login da plataforma, do protótipo navegável.
</p>

A **Gestão Troca Ticket** é uma plataforma Web de planejamento e precificação de eventos, feita como Projeto Interdisciplinar do 2º semestre de Ciência da Computação da FECAP em parceria com a TrocaTicket.

São três módulos: o **Organizador** cadastra eventos, itens de custo e parâmetros financeiros; o **Fornecedor** envia propostas por item; o **Administrador** aprova cadastros e acompanha os eventos. Com os custos consolidados, o público previsto e a margem, o sistema calcula o ticket estimado:

> `Ticket = Custo Total / [Público × (1 − Margem)]`

O MVP não vende ingressos nem processa pagamentos, e cada evento tem um único tipo de ingresso.

## 🎯 Funcionalidades

| ID   | Funcionalidade                      | Descrição                                           |
| ---- | ----------------------------------- | --------------------------------------------------- |
| RF01 | Autocadastro de Organizador         | Conta fica pendente até a análise do Administrador. |
| RF02 | Autocadastro de Fornecedor          | Dados de identificação e área de atuação.           |
| RF03 | Aprovação de cadastros              | Administrador aprova ou rejeita o cadastro.         |
| RF04 | Autenticação e perfis               | Acesso restrito conforme o perfil.                  |
| RF05 | Cadastro de eventos                 | Período, local, público mínimo e máximo.            |
| RF06 | Itens de composição de custo        | Estrutura, alimentação, segurança e outros.         |
| RF07 | Custos próprios do evento           | Custos fiscais e operacionais, sem cotação.         |
| RF08 | Publicação para cotação             | Abre o evento para os Fornecedores aprovados.       |
| RF09 | Consulta de eventos pelo Fornecedor | Lista os eventos abertos para proposta.             |
| RF10 | Envio de propostas                  | Valor, descrição, validade e observações.           |
| RF11 | Comparação de propostas             | Compara as propostas recebidas por item.            |
| RF12 | Consolidação do orçamento           | Propostas escolhidas formam o custo do evento.      |
| RF13 | Cálculo do ticket                   | Cenários de público mínimo, esperado e máximo.      |
| RF14 | Visão administrativa e relatórios   | Usuários, eventos, propostas e valores.             |

## 🛠 Estrutura de pastas

```
Projeto2
├── Documentos
│   ├── Entrega 1
│   │   ├── Calculo II
│   │   ├── Desenvolvimento Web Fullstack
│   │   ├── Gestao Empresarial e Dinamica das Organizacoes
│   │   ├── Projeto em Banco de Dados
│   │   └── Projeto Interdisciplinar - Programacao Web
│   └── Entrega 2
│       └── (mesmas pastas da Entrega 1)
├── Imagens
├── src
│   ├── Backend
│   └── Frontend
└── README.md
```

<b>Documentos</b>: entregas separadas por Unidade Curricular, com os diagramas do banco e o protótipo.<br>
<b>Imagens</b>: capturas de tela usadas na documentação.<br>
<b>src</b>: código-fonte, entre <b>Backend</b> (Node.js + Express com MySQL) e <b>Frontend</b> (React com Vite).

## 🗄 Banco de dados

Diagrama entidade-relacionamento e modelo lógico em [Documentos/Entrega 1/Projeto em Banco de Dados](Documentos/Entrega%201/Projeto%20em%20Banco%20de%20Dados).

## 🎨 Protótipo

O protótipo navegável cobre os fluxos dos três módulos: <https://www.figma.com/design/0oyfFP6b20mcmb75p0lVVF/TrocaTicket---Telas?node-id=70-43>

## 🛠 Instalação

Plataforma Web: não há executável, basta acessar pelo navegador em desktop ou celular. Para rodar localmente, siga a seção abaixo.

## 💻 Configuração para Desenvolvimento

Requer <a href="https://nodejs.org">Node.js</a> 22+, <a href="https://git-scm.com">Git</a>, <a href="https://dev.mysql.com/downloads/">MySQL</a> (backend) e um editor como o <a href="https://code.visualstudio.com/">VS Code</a>.

```sh
git clone https://github.com/2026-2-MCC2/Projeto2.git
cd Projeto2/src/Frontend
cp .env.example .env
npm install
npm run dev
```

Abre em <http://localhost:5173>.

| Comando | O que faz |
| --- | --- |
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` | gera a versão de produção |
| `npm run lint` | procura erros no código |
| `npm run format` | formata o código |

Passo a passo com os erros mais comuns em [COMO_RODAR.md](src/Frontend/COMO_RODAR.md) e as camadas do front-end em [Frontend/README.md](src/Frontend/README.md).

## 🧰 Tecnologias

- **Front-end**: React, React Router e Vite
- **Back-end**: Node.js com Express
- **Banco de dados**: MySQL
- **Testes de API**: Postman
- **Prototipação**: Figma
- **Modelagem de dados**: brModelo e MySQL Workbench
- **Versionamento e gestão**: Git, GitHub e GitHub Project

## 📋 Licença/License

<p xmlns:cc="http://creativecommons.org/ns#" xmlns:dct="http://purl.org/dc/terms/"><a property="dct:title" rel="cc:attributionURL" href="https://github.com/2026-2-MCC2/Projeto2">Gestão Troca Ticket</a> by <span property="cc:attributionName">DKCA DEVS</span> is licensed under <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="license noopener noreferrer">CC BY 4.0</a></p>

## 🎓 Referências

1. <https://github.com/iuricode/readme-template>
2. <https://github.com/gabrieldejesus/readme-model>
3. <https://chooser-beta.creativecommons.org/>
4. <https://www.toptal.com/developers/gitignore>
5. <https://react.dev/>
6. <https://vite.dev/>
7. <https://expressjs.com/pt-br/>
8. <https://dev.mysql.com/doc/>
