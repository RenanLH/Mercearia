import { Button, Center, Combobox, Flex, Grid, Input, InputBase, NumberInput, Text, useCombobox, ActionIcon, rem } from "@mantine/core";
import { useEffect, useState } from "react";
import { IconArrowLeft } from '@tabler/icons-react';
import { NavLink } from "react-router-dom";


const products = [{
  codBarras: "",
  name:"",
  price: "0",
  qt: ""    
},{
  codBarras: "",
  name:"Amendoim Japonês Elma Chips Pacote 145g ",
  price:"8,01",
  qt: "1"    
},{
  codBarras: "",
  name:"Amendoim Japonês Elma Chips Pacote 145g ",
  price:"8,99",
  qt: "1"    
},]

const groceries = ['🍎 Apples', '🍌 Bananas', '🥦 Broccoli', '🥕 Carrots', '🍫 Chocolate'];

const options = groceries.map((item) => (
  <Combobox.Option value={item} key={item}>
    {item}
  </Combobox.Option>
));


function numberToMoney(value:number | string){
  value = String(value).replace(",", ".");
  return  String(Number(value).toFixed(2)).replace(".", ",");
}

function showMoney(value: number| string){
  if (value == "0"){
    return "";
  }
  const srtValue = numberToMoney(value);
  return "R$ "  + srtValue;
}

function NovaVenda (){
  useEffect(() => {setTotal(getTotal);});

  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });
  
  const [dpBoxValue, setDpBoxValue] = useState<string | null>(null);
  const [erros, setErros] = useState<string | null>(null);

  const [cBarras, setCBarras] = useState<string | number>('');
  const [total, setTotal] = useState<number>(0.0);
  const [preco, setPreco] = useState<string | number>('');
  const [qtd, setQtd] = useState<string | number>('');

  function reset(){
    setCBarras('')
    setQtd(1);
    setPreco(0);
    setDpBoxValue(null);
    setErros('');
  }

  function getTotal(){
    return products.reduce((sum, product) => sum + (parseFloat(product.price.replace(",", ".")) * Number(product.qt)), 0);
  }

  function adicionarBtOnclick(){
    if (dpBoxValue != null && preco != '' && qtd != '') {
      products.push({
        codBarras: "",
        name: dpBoxValue as string,
        price: numberToMoney(preco),
        qt: String(qtd)});
      
      reset()
      setTotal(getTotal());
    }else {
      setErros("Drop vazio ou preco vazio ou qtd vazio"!!!)
    }
   
  }


  return <div>

    <NavLink to='/'>
    <ActionIcon size={42} variant="default" aria-label="ActionIcon with size as a number">
      <IconArrowLeft style={{ width: rem(24), height: rem(24) }} />
    </ActionIcon>    
    </NavLink>
    <Text ta={"center"}  p={"lg"} c={"#FFFF"} size="30px" ff="monospace">Nova Venda</Text>
    <Text ta={"center"} c={"red"} size="15px" ff="monospace">{erros}</Text>

    <Center>
      <NumberInput value={cBarras} onChange={setCBarras} p="sm" c={"#FFFF"} color="#FFFF" placeholder="Código de Barras" hideControls={true}/>
    </Center>

    <Flex pb={"5%"} gap={"md"} justify={"center"} direction={{ base: 'column', sm: 'row' }}>
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
      <NumberInput 
        value={preco} 
        onChange={setPreco}
        placeholder='Preço do Produto'
        allowNegative={false}
        allowedDecimalSeparators={[',']}
        decimalScale={2}
        fixedDecimalScale={true}
        hideControls={true}
        prefix="R$ "/>
      <NumberInput value={qtd} onChange={setQtd} placeholder='Quantidade' allowDecimal={false} allowNegative={false} hideControls={true}/>

      <Button onClick={adicionarBtOnclick}> Adicionar</Button> 
    </Flex>

    <Grid>
        <Grid.Col span={6}>
          <Text p="md" c={"#FFFF"} size="25px">{"Nome do Produto"}</Text>
        </Grid.Col>
        <Grid.Col span={2}>
          <Text p="md" c={"#FFFF"} size="25px">{"Preço "}</Text>
        </Grid.Col>
        <Grid.Col span={2}>
          <Text lh={"h1"} p="md" c={"#FFFF"} size="25px">{"Quantidade "}</Text>
        </Grid.Col>
        <Grid.Col span={2}>
          <Text  lh={"h1"} p="md" pl={"10%"} ta={"end"} c={"#FFFF"} size="25px">{"TOTAL"}</Text>
        </Grid.Col>
    </Grid>

    <Text pr={ "15px"} ta={"end"} size="25px" c={"#FFFF"}>{showMoney(total)} </Text>    

    {products.map((product, index)=>
      <Grid justify={"start"}>
        <Grid.Col span={6}>
          <Text ps={"md"} c={"#ffff"} size="20px" truncate="end">{product.name}</Text>
        </Grid.Col>
        <Grid.Col span={2}>
          <Text pl={"10px"} c={"#ffff"} size="20px">{showMoney(product.price)}</Text>
        </Grid.Col>
        <Grid.Col span={2}>
          <Text pl={"55px"} c={"#ffff"} size="20px"> {product.qt}</Text>
        </Grid.Col>
      </Grid>
      )}
 
  </div>
}

export default NovaVenda;