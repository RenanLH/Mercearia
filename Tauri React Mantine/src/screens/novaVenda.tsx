import { Button, Center, Combobox, Flex, Grid, Input, InputBase, NumberInput, Text, useCombobox, ActionIcon, rem } from "@mantine/core";
import { useEffect, useRef, useState } from "react";
import { IconArrowLeft } from '@tabler/icons-react';
import { NavLink } from "react-router-dom";
import axios from "axios";

type product = {
  barcode: string,
  name: string,
  salesName: string,
  price: string,
  qtd: string | number  
};

const groceries = ['🍎 Frutas', '🍫 Diversos'];

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
  useEffect(() => {
    setTotal(getTotal);
  });

  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });
  
  

  const [dpBoxValue, setDpBoxValue] = useState<string | null>(null);
  const [erros, setErros] = useState<string | null>(null);

  const [products, setProducts] = useState<product[]>([]);

  const [lastCBarras, setLastCBarras] = useState<string>('');
  const [cBarras, setCBarras] = useState<string | number>('');
  const [total, setTotal] = useState<number>(0.0);
  const [preco, setPreco] = useState<string | number>('');
  const [qtd, setQtd] = useState<string | number>('1');

  function removeItem(removeAtIndex: number){
    setProducts((prev) => (prev.filter((_, index) => index != removeAtIndex))); 
  }
  function reset(){
    setLastCBarras('')
    setCBarras('')
    setQtd(1);
    setPreco("");
    setDpBoxValue(null);
    setErros('');

  }


  async function finishSale(){
    const url = "http://localhost:5000/sales";

    const sale = {
      "productList" : products,
      "total": total
    };

    const result = await axios.post(url, sale);

    if (result.status == 200){
      reset();
      setErros('Venda Finalizada com Sucesso!');

      setTimeout(() => {
        setErros('');
      }, 5000);
    }else {
      setErros('Erro!' + result.data.text);
    }
  }


  
  function disableFinishButton(){
    return products.length == 0; 
  }


  
  async function searchDB (codBarras: String){
    try { 

      const existentProduct = products.find((item)=> item.barcode == cBarras);
      if (existentProduct != undefined && existentProduct != null){
        
        if (String(qtd).length == 0) 
            setQtd(1)

        existentProduct.qtd = Number(existentProduct.qtd) +  Number(qtd);
        setTimeout(() => {
          reset()
        }, 500);
      }else {
        const result = await axios.get("http://localhost:5000/products?codBarras=" + codBarras);
        if (result.status == 200){
          const productDb = result.data;
  
          if(Number(qtd) >= 1) productDb.qtd = qtd;
          else productDb.qtd = 1;

          setProducts((prev) => [...prev, productDb]);
          setTimeout(() => {
            reset()
          }, 500);
        }
      }
   
    } catch (error) {
      console.error("Error fetching data:", error);
    } 
  }


  function getTotal(){
    return products.reduce((sum, product) => sum + (parseFloat(product.price.replace(",", ".")) * Number(product.qtd)), 0);
  }

  function adicionarBtOnclick(){
    if (dpBoxValue != null && preco != '' ) {

      const uncategorized = {
        barcode: "",
        name: dpBoxValue as string,
        salesName: "",
        price: numberToMoney(preco),
        qtd: String(qtd)
      }
      const existentProduct = products.find((item) => item.name == uncategorized.name);
      
      if (existentProduct == undefined)   
        setProducts((prev) => [...prev, uncategorized])
      else
        existentProduct.qtd = String(Number(existentProduct.qtd) + Number(qtd));
      reset()
      setTotal(getTotal());
    }else {
      setErros("Drop vazio ou preco vazio ou qtd vazio"!!!)
    }
   
  }

  /// arrumar 8
  function cBarrasOnChange(){
    if (String(cBarras).length == 13 && String(cBarras) != String(lastCBarras)){
      setLastCBarras(String(cBarras));

      searchDB(String(cBarras));
    
    }else {
      setCBarras(String(cBarras).slice(0, 13));
    }
  }

  function disableButton(){
    return dpBoxValue == null || preco == ""; 
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
      <NumberInput 
        value={cBarras} 
        onChange={setCBarras} 
        onKeyUp={()=> cBarrasOnChange()} 
        p="sm" 
        placeholder="Código de Barras" 
        hideControls={true}
        autoFocus={true}/>

      <NumberInput 
        value={qtd} 
        onChange={setQtd} 
        placeholder='Quantidade' 
        allowDecimal={false} 
        allowNegative={false} 
        hideControls={true}/>
    </Center>

    <Flex pb={"2%"} gap={"md"} justify={"center"} direction={{ base: 'column', sm: 'row' }}>
      <Combobox width={"10%"} 
        store={combobox}
        onOptionSubmit={(val) => {
        setDpBoxValue(val);
        combobox.closeDropdown();}}>

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
      <Button disabled={disableButton()} onClick={adicionarBtOnclick}> Adicionar</Button> 

    </Flex>

    <Flex pb={"2%"} pe={"2%"} justify={"end"} direction={{ base: 'column', sm: 'row' }}>

      <Button disabled={disableFinishButton()} type='submit' onClick={finishSale}>Finalizar</Button>
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
          <Text pl={"55px"} c={"#ffff"} size="20px"> {product.qtd}</Text>
        </Grid.Col>
        <Button hidden={true} disabled={false} type='submit' onClick={()=>removeItem(index)}>Limpar</Button>

      </Grid>
      )}
 
  </div>
}

export default NovaVenda;