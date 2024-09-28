import { Button, Center, Text, TextInput } from "@mantine/core";

const products = [{
  name:"Nome do Produto ",
  price:"Preço do Produto",
  qt: "Quantidade do Produto"    
},{
  name:"Cerveja Spaten Puro Malte 355ml Long Neck ",
  price:"5,70",
  qt: "2"    
},
{
  name:"Amendoim Japonês Elma Chips Pacote 145g ",
  price:"8,60",
  qt: "1"    
} ]

function NovaVenda (){
  return <div>
    <Center p="xl">
      <Text c={"#FFFF"} size="30px" ff="monospace">Nova Venda</Text>
    </Center>
    
    <Center>
      <TextInput c={"#FFFF"} color="#FFFF" placeholder="Código de Barras"/>
      <Button> Adicionar</Button> 
    </Center>

    {products.map(( product,index)=>
      <Center >
         <Text  lh={"h1"} c={"violet"} size="25px"> {product.name}</Text>
         <Text  lh={"h1"} c={"violet"} size="25px"> {product.price}</Text>
         <Text  lh={"h1"} c={"violet"} size="25px"> {product.qt}</Text>

      </Center>
      
      )}
 
  </div>
}

export default NovaVenda;