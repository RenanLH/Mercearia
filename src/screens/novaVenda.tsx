import { Button, Center, Combobox, Flex, Input, InputBase, NumberInput, Text, TextInput, useCombobox } from "@mantine/core";
import { useEffect, useState } from "react";

const products = [{
  codBarras: "",
  name:"Cerveja Spaten Puro Malte 355ml Long Neck Cerveja Spaten Puro Malte 355ml Long Neck",
  price: "5,70",
  qt: "2"    
},{
  codBarras: "",
  name:"Amendoim Japonês Elma Chips Pacote 145g ",
  price:"8,60",
  qt: "1"    
} ]

const groceries = ['🍎 Apples', '🍌 Bananas', '🥦 Broccoli', '🥕 Carrots', '🍫 Chocolate'];

const options = groceries.map((item) => (
  <Combobox.Option value={item} key={item}>
    {item}
  </Combobox.Option>
));

function numberToMoney(value:number | string){
  value = String(value).replace(",", ".");
  return String(Number(value).toFixed(2)).replace(".", ",");
}



function NovaVenda (){

  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });
  
  const [dpBoxValue, setDpBoxValue] = useState<string | null>(null);
  const [erros, setErros] = useState<string | null>(null);

  const [total, setTotal] = useState<number>(0.0);
  const [preco, setPreco] = useState<string | number>('');
  const [qtd, setQtd] = useState<string | number>('');


  
useEffect(() => {setTotal(products.reduce((sum, product) => sum + (parseFloat(product.price.replace(",", ".")) * Number(product.qt)), 0));});

  function adicionarBtOnclick(){
    if (dpBoxValue != null && preco != '' && qtd != '') {
      products.push({
        codBarras: "",
        name: dpBoxValue as string,
        price: numberToMoney(preco),
        qt: String(qtd)});
      
      
      setDpBoxValue(null);
      setErros("");
      setTotal(products.reduce((sum, product) => sum + (parseFloat(product.price.replace(",", ".")) * Number(product.qt)), 0));
    }else {
      setErros("Drop vazio ou preco vazio ou qtd vazio"!!!)
    }
   
  }


  return <div>
    <Text ta={"center"}  p={"lg"} c={"#FFFF"} size="30px" ff="monospace">Nova Venda</Text>
    <Text ta={"center"} c={"red"} size="15px" ff="monospace">{erros}</Text>

    <Center>
      <TextInput p="sm" c={"#FFFF"} color="#FFFF" placeholder="Código de Barras"/>
    </Center>

    <Flex gap={"md"} justify={"center"} direction={{ base: 'column', sm: 'row' }}>
      <Combobox width={"10%"} 
        store={combobox}
        onOptionSubmit={(val) => {
        setDpBoxValue(val);
        combobox.closeDropdown();
        }}
      >

        <Combobox.Target>
          <InputBase
            component="button"
            type="button"
            pointer
            rightSection={<Combobox.Chevron />}
            rightSectionPointerEvents="none"
            onClick={() => combobox.toggleDropdown()}>

            {dpBoxValue || <Input.Placeholder>Item</Input.Placeholder>}
          </InputBase>
        </Combobox.Target>
        
        <Combobox.Dropdown>
          <Combobox.Options >{options}</Combobox.Options>
        </Combobox.Dropdown>
        

      </Combobox>
      <NumberInput value={preco} onChange={setPreco} placeholder='Preço do Produto' allowNegative={false}/>
      <NumberInput value={qtd} onChange={setQtd} placeholder='Quantidade' allowDecimal={false} allowNegative={false}/>

      <Button onClick={adicionarBtOnclick}> Adicionar</Button> 
    </Flex>

    <Flex justify={"start"} >
        <Text w={"65%"} p="md" c={"#FFFF"} size="25px">{"Nome do Produto"}</Text>
        <Flex   >
          <Text lh={"h1"} p="md" c={"#FFFF"} size="25px">{"Preço "}</Text>
          <Text lh={"h1"} p="md" c={"#FFFF"} size="25px">{"Quantidade "}</Text>
        </Flex>
        <Text  lh={"h1"} p="md" pl={"10%"} ta={"end"} c={"#FFFF"} size="25px">{"TOTAL"}</Text>
    </Flex>

    <Text pr={ "15px"} ta={"end"} size="25px" c={"#FFFF"}>{numberToMoney(total)} R$</Text>    

    {products.map(( product,index)=>
      <Flex gap={"22%"} justify={"start"}  wrap="wrap" direction={{ base: 'column', sm: 'row' }}>
         <Text p="5px" key={"name_" + String(index)} w={{base:"20%", sm: "45%"}} lh={"h1"} c={"#FFFF"} size="20px" truncate="end"> {product.name}</Text>
         <Flex gap={"170%"} justify={"start"}>
            <Text key={"price_" + String(index)} lh={"h1"} c={"#FFFF"} size="20px"> {numberToMoney(product.price)}</Text>
            <Text key={"qt_" + String(index)} lh={"h1"} c={"#FFFF"} size="20px"> {product.qt}</Text>
          </Flex>


      </Flex>
      
      )}
 
  </div>
}

export default NovaVenda;