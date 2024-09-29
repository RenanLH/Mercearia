import { Button, Center, NumberInput, TextInput} from '@mantine/core'
function NovoProduto() {
  return (
    <div>
        <h1 style={{color:'white'}}>Novo Produto</h1>
        <NumberInput placeholder='Código de Barras' allowDecimal={false} allowNegative={false}/>
        <TextInput placeholder='Nome do Produto'/>
        <NumberInput placeholder='Preço do Produto'allowNegative={false}/>
        <NumberInput placeholder='Quantidade' allowDecimal={false} allowNegative={false}/>
        <Center><Button>Cadastrar</Button></Center>
    </div>
  )
}

export default NovoProduto