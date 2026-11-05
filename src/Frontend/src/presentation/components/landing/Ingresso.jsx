import '../../styles/ingresso.css'

// Forma de ingresso: corpo e canhoto separados por um picote, com recortes nas pontas do picote.
// orientacao: 'horizontal' (canhoto à direita), 'vertical' (canhoto embaixo) ou
// 'responsiva' (horizontal no desktop e vertical no mobile).
// canhotoNoInicio põe o canhoto à esquerda ou em cima (como no passo do "Como funciona").
// Cores e medidas vêm de variáveis CSS (ver styles/ingresso.css).
export function Ingresso({
  orientacao = 'horizontal',
  canhoto,
  canhotoNoInicio = false,
  elemento: Elemento = 'div',
  className = '',
  children,
  ...resto
}) {
  const corpo = { classe: 'ingresso__corpo', conteudo: children }
  const parteDoCanhoto = { classe: 'ingresso__canhoto', conteudo: canhoto }
  const partes = canhotoNoInicio ? [parteDoCanhoto, corpo] : [corpo, parteDoCanhoto]

  return (
    <Elemento
      className={`ingresso ingresso--${orientacao}${className ? ` ${className}` : ''}`}
      {...resto}
    >
      {partes.map((parte, indice) => (
        <div
          key={parte.classe}
          className={`ingresso__parte ingresso__parte--${indice === 0 ? 'antes' : 'depois'} ${parte.classe}`}
        >
          {parte.conteudo}
        </div>
      ))}
    </Elemento>
  )
}
