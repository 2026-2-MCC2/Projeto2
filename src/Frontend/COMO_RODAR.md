# Como rodar o projeto

Guia para quem vai mexer no frontend pela primeira vez. Se travar em algum
passo, chama no grupo antes de tentar adivinhar.

## O que precisa estar instalado

Só três coisas. Nenhuma delas é paga e todas rodam em Windows, Mac e Linux.

| Programa | Versão           | Para quê                                 |
| -------- | ---------------- | ---------------------------------------- |
| Node.js  | 22 ou superior   | Roda o projeto e instala as bibliotecas  |
| Git      | qualquer recente | Baixar o código e enviar suas alterações |
| VS Code  | qualquer recente | Editar o código (pode ser outro editor)  |

O `npm`, que aparece nos comandos, vem junto com o Node. Não precisa instalar
separado.

Não precisa de banco de dados, nem de XAMPP, nem de nada além disso por
enquanto.

## Passo 1: instalar o Node

Antes de instalar, veja se já não tem. Abra o terminal e rode:

```sh
node --version
```

Se aparecer algo como `v22.14.0` ou `v24.18.0`, está pronto, pule para o passo 2.
Se aparecer `v18` ou algo menor que 22, precisa atualizar. Se der erro de
"comando não encontrado", precisa instalar.

**Windows:** baixe o instalador LTS em <https://nodejs.org> e vá clicando em
avançar. Quem usa winget pode rodar `winget install OpenJS.NodeJS.LTS`.

**Mac:** baixe o instalador LTS em <https://nodejs.org>, ou rode
`brew install node` se já usa Homebrew.

**Linux:** o Node que vem na loja da distribuição costuma ser antigo. O caminho
mais seguro é o nvm:

```sh
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
nvm install 24
```

Depois de instalar, **feche e abra o terminal de novo** e confira com
`node --version`.

## Passo 2: baixar o projeto

```sh
git clone https://github.com/2026-2-MCC2/Projeto2.git
cd Projeto2
git checkout dev
```

O `git checkout dev` importa: é na branch `dev` que o trabalho acontece.

## Passo 3: instalar as bibliotecas e rodar

```sh
cd src/Frontend
npm install
npm run dev
```

O `npm install` demora alguns minutos na primeira vez e cria a pasta
`node_modules`. Ela é grande e não vai para o Git, então cada um roda esse
comando no próprio computador.

Ao final, o terminal mostra um endereço parecido com este:

```
➜  Local:   http://localhost:5173/
```

Abra esse endereço no navegador. Deve aparecer a tela do DKCA DEVS.

Para parar o servidor, aperte `Ctrl + C` no terminal.

Enquanto ele estiver rodando, qualquer arquivo que você salvar aparece
atualizado no navegador sozinho, sem precisar recarregar.

## Passo 4: só na primeira vez

Copie o arquivo de exemplo das variáveis de ambiente:

```sh
cp .env.example .env
```

No Windows, pelo PowerShell:

```powershell
Copy-Item .env.example .env
```

Esse arquivo guarda o endereço da API. Enquanto o backend não existir, ele não
faz diferença, mas é bom já deixar criado.

## Comandos do dia a dia

| Comando          | O que faz                                         |
| ---------------- | ------------------------------------------------- |
| `npm run dev`    | Liga o projeto para desenvolver                   |
| `npm run lint`   | Aponta erros no código                            |
| `npm run format` | Arruma a formatação de tudo automaticamente       |
| `npm run build`  | Gera a versão final, usada só na hora de publicar |

Vale rodar `npm run format` antes de commitar. Assim o código de todo mundo
fica com o mesmo estilo e o Git não acusa mudanças que são só de espaçamento.

## Quando der errado

**`node` ou `npm` não é reconhecido como comando**
O terminal foi aberto antes da instalação terminar. Feche todos os terminais,
abra um novo e tente de novo. Se persistir no Windows, reinicie o computador.

**`npm install` falha com erro de permissão**
Não use `sudo`. No Linux ou Mac, isso costuma ser sinal de que o Node foi
instalado pela loja da distribuição; instale pelo nvm como está no passo 1.

**Erro de versão do Node ao rodar `npm run dev`**
Sua versão é anterior à 22. Confira com `node --version` e atualize.

**A porta 5173 já está em uso**
Alguma coisa já está ocupando o endereço. O Vite escolhe outra porta sozinho e
avisa no terminal qual foi. É só abrir a que ele mostrar.

**No PowerShell: "execução de scripts foi desabilitada neste sistema"**
Rode uma vez, no PowerShell como administrador:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

**Apaguei sem querer algo e nada funciona**
Apague a pasta `node_modules` e rode `npm install` de novo. Isso resolve a
maioria dos casos e não perde nenhum código seu.
