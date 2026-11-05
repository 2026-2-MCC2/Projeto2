import { useSearchParams } from 'react-router-dom'

const PERFIS_DO_CADASTRO = ['organizador', 'fornecedor']

// /cadastro?perfil=fornecedor já abre com o fornecedor marcado (os cartões da landing usam isso);
// sem o parâmetro, ou com um valor desconhecido, começa no organizador como sempre
export function usePerfilInicialDoCadastro() {
  const [parametros] = useSearchParams()
  const pedido = parametros.get('perfil')
  return PERFIS_DO_CADASTRO.includes(pedido) ? pedido : 'organizador'
}
