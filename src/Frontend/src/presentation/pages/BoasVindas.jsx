import { ExploradorEstrutura } from '../components/ExploradorEstrutura.jsx'
import { RegraDependencia } from '../components/RegraDependencia.jsx'

export function BoasVindas() {
  return (
    <section>
      <header className="abertura">
        <p className="abertura__saudacao">Bem-vindos!</p>
        <h1 className="abertura__titulo">DKCA DEVS</h1>
        <p className="abertura__descricao">
          Espero que se ambientem bem garotos e aprendam muito com o projeto. Vamos ganhar esses 4k!
        </p>

        <ul className="integrantes">
          <li>André Makoto Molitor</li>
          <li>Caio Fábio Freitas</li>
          <li>Davi Varella</li>
          <li>Kauã Casella da Silva</li>
        </ul>
      </header>

      <section className="bloco">
        <h2>Como o projeto está organizado</h2>
        <p>
          O código está dividido em camadas, seguindo a clean architecture. A ideia é separar o que
          o sistema faz das telas que o mostram e da API que fornece os dados.
        </p>
        <p className="apoio">
          Um exemplo: &ldquo;uma tarefa sem título não pode ser salva&rdquo; é uma regra do sistema
          e vale em qualquer tecnologia. Já o endereço da API e a cor do botão são detalhes, e
          detalhes mudam. Manter os dois separados evita que a troca de um quebre o outro.
        </p>
        <p className="apoio">As seções abaixo são clicáveis.</p>
      </section>

      <ExploradorEstrutura />
      <RegraDependencia />

      <section className="bloco">
        <h2>Antes de sair criando pastas</h2>
        <p>
          Não é preciso usar as quatro camadas em toda funcionalidade. Uma tela estática vive só em
          presentation. Quando ela precisar de dados, entra o api.js. Quando uma regra começar a se
          repetir em lugares diferentes, ela sobe para domain.
        </p>
        <p>
          As pastas <code>domain/</code> e <code>application/</code> estão vazias.
        </p>
      </section>
    </section>
  )
}
