const COMUNS = [
  {
    pergunta: 'Como altero meus dados de cadastro?',
    resposta:
      'Em Configurações, na aba de dados. O CNPJ não pode ser alterado depois que o cadastro é aprovado.',
  },
  {
    pergunta: 'Como troco minha senha?',
    resposta:
      'Em Configurações, na aba Senha. Informe a senha atual e uma nova com pelo menos 8 caracteres.',
  },
  {
    pergunta: 'Quais recursos de acessibilidade a plataforma tem?',
    resposta:
      'No botão de acessibilidade você ajusta o tamanho do texto, liga o alto contraste, a leitura facilitada (fonte OpenDyslexic), reduz as animações e pode ouvir a página em voz alta.',
  },
]

export const DUVIDAS = {
  organizador: [
    {
      pergunta: 'Como cadastro um evento?',
      resposta:
        'Em Meus eventos, use o botão de novo evento. O cadastro tem 4 etapas: dados do evento, local e público, parâmetros financeiros e revisão.',
    },
    {
      pergunta: 'Qual a diferença entre item por cotação e custo próprio?',
      resposta:
        'O item por cotação fica aberto para receber propostas dos fornecedores. O custo próprio é um valor que você já conhece, como impostos e alvarás, e entra direto no custo total.',
    },
    {
      pergunta: 'Quando os fornecedores veem meu evento?',
      resposta:
        'Depois que você publica o evento para cotação. A partir daí, os fornecedores aprovados nas categorias dos itens conseguem enviar propostas.',
    },
    {
      pergunta: 'Como o valor do ticket é calculado?',
      resposta:
        'Ticket = custo total ÷ [público × (1 − margem)]. O custo total soma as propostas selecionadas e os custos próprios. O cálculo é feito para o público mínimo, o esperado e o máximo.',
    },
    ...COMUNS,
  ],
  fornecedor: [
    {
      pergunta: 'Quais eventos aparecem para mim?',
      resposta:
        'Os eventos publicados para cotação que têm itens nas categorias de atuação escolhidas em Configurações.',
    },
    {
      pergunta: 'Como envio uma proposta?',
      resposta:
        'Abra o evento em Eventos disponíveis e preencha as 3 etapas: valor e validade, descrição e fotos, e condições de execução.',
    },
    {
      pergunta: 'O que acontece depois que a proposta vence?',
      resposta:
        'Depois da data de validade, a proposta expira e não pode mais ser selecionada pelo organizador.',
    },
    {
      pergunta: 'Como acompanho minhas propostas?',
      resposta:
        'Em Minhas propostas você vê cada proposta enviada e a situação dela: enviada, em análise, aceita ou recusada.',
    },
    ...COMUNS,
  ],
  admin: [
    {
      pergunta: 'Como aprovo um cadastro?',
      resposta:
        'Em Aprovações, confira os dados da empresa e aprove ou rejeite. Ao rejeitar, informe o motivo para o usuário corrigir e enviar de novo.',
    },
    {
      pergunta: 'Como bloqueio o acesso de um usuário?',
      resposta:
        'Em Usuários, escolha o usuário e use a opção de bloquear, informando o motivo. O acesso pode ser reativado depois.',
    },
    {
      pergunta: 'Onde vejo o que foi alterado na plataforma?',
      resposta: 'No Histórico, que registra as aprovações, os bloqueios e as demais alterações.',
    },
    ...COMUNS,
  ],
}
