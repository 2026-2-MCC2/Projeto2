import '../../styles/ingresso.css'

// corpo e canhoto separados por um picote; 'responsiva' fica horizontal no desktop e vertical no mobile
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
