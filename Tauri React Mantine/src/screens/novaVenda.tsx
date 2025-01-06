import { Button, Center, Combobox, Flex, Grid, Input, InputBase, NumberInput, Text, useCombobox, ActionIcon, rem, TextInput } from "@mantine/core";
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

function NovaVenda (){

  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  useEffect(() => {
    inputRef?.current?.focus();
    combobox.selectNextOption();
    combobox.clickSelectedOption();
  }, []);

  useEffect(() => {
    setTotal(getTotal);
  });


  const [dpBoxValue, setDpBoxValue] = useState<string | null>(null);
  const [erros, setErros] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const [products, setProducts] = useState<product[]>([]);

  const [lastCBarras, setLastCBarras] = useState<string>('');
  const [cBarras, setCBarras] = useState<string | number>('');
  const [valorPago, setValorPago] = useState<string | number>('');
  const [valorTroco, setValorTroco] = useState<string | number>(0.0);

  const groceries = ['Diversos','Pão Frances', 'Ovo', 'Gelo 1Kg', 'Gelo 5Kg', 'Carvão 4Kg', 'Carvão 9Kg', 'Lenha', 'Sabão em Barra'];
  const [total, setTotal] = useState<number>(0.0);
  const [preco, setPreco] = useState<string | number>('');
  const [qtd, setQtd] = useState<string | number>('1');

  function removeItem(removeAtIndex: number){
    setProducts((prev) => (prev.filter((_, index) => index != removeAtIndex))); 
  }
  function reset(){
    setLastCBarras('');
    setCBarras('');
    setValorTroco('');
    setValorPago('');
    setQtd(1);
    setPreco("");
    setDpBoxValue(null);
    setErros('');
    inputRef?.current?.focus(); 
  }

const options = groceries.map((item) => (
  <Combobox.Option value={item} key={item} >
    {item}
  </Combobox.Option>
));

function numberToMoney(value:number | string){
  value = String(value).replace(",", ".");
  return  String(Number(value).toFixed(2)).replace(".", ",");
}

function showMoney(value: number| string){
  if (value == 0  ){
    return "";
  }
  const srtValue = numberToMoney(value);
  return "R$ "  + srtValue;
}

  function setPrecoDiversos(item: string){
    if (item == "Gelo 1Kg"){
      setPreco(4);
    }else if (item == "Pão Frances"){
      setPreco(0.6);
    }
    else if (item == "Ovo"){
      setPreco(0.75);
    }
    else if (item == "Gelo 5Kg"){
      setPreco(10);
    }else if (item == "Carvão 4Kg"){
      setPreco(20);
    }else if (item == "Carvão 9Kg"){
      setPreco(46);
    }else if (item == "Lenha"){
      setPreco(16);
    }else if (item == "Sabão em Barra"){
      setPreco(3.5);
    }
    else{
      setPreco('');
    }
  }

  /*async function sendToPrinter(){
    const url = "http://localhost:5550/print";

    const sale = {
      "productList" : products,
      "total": total
    };

    const result = await axios.post(url, sale);

    if (result.status == 200){
      setErros('Nota Fiscal Gerada com Sucesso!');
    }else {
      setErros('Erro!' + result.data.text);
    }
  }*/


  async function finishSale(){
    const url = "http://localhost:5000/sales";
    const options:Intl.DateTimeFormatOptions  = { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric',hour:'2-digit', minute:'2-digit', second:'2-digit' };
    const date = new Date().toLocaleDateString("pt-BR", options);

    const sale = {
      "productList" : products,
      "total": total,
      "date": date
    };

    const result = await axios.post(url, sale);

    if (result.status == 200){
      reset();
      setErros('Venda Finalizada com Sucesso!');

      setTimeout(() => {
        reset();
        setProducts([]);
      }, 2500);
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
        console.log("waiting");
        const result = await axios.get("http://localhost:5000/products?codBarras=" + codBarras);
        if (result.status == 200){
          const productDb = result.data;
  
          if(Number(qtd) >= 1) productDb.qtd = qtd;
          else productDb.qtd = 1;

          setProducts((prev) => [productDb, ...prev]);
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

      let q = qtd;
      if (String(qtd) == '' || Number(qtd) == 0) {
        setQtd(1);
        q = 1;
      }

      const uncategorized = {
        barcode: "",
        name: dpBoxValue as string,
        salesName: "",
        price: numberToMoney(preco),
        qtd: q
      }
      const existentProduct = products.find((item) => item.name == uncategorized.name);
      
      if (existentProduct == undefined || existentProduct.name == "Diversos")   
        setProducts((prev) => [uncategorized, ...prev])
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

    if (String(qtd).length == 0) 
      setQtd(1)
    if ((String(cBarras).length == 13 || String(cBarras).length == 12 || String(cBarras).length == 8) && String(cBarras) != String(lastCBarras)){
      setLastCBarras(String(cBarras));

      searchDB(String(cBarras));
    
    }else {
      setCBarras(String(cBarras).slice(0, 13));
    }
  }

  function valorPagoOnChange(){
    const pago = Number(String(valorPago).replace(",", "."));
    const valorTotal = Number(total);
    if (pago > 0 && products.length > 0){
      setValorTroco(pago - valorTotal);
    }else {
      setValorTroco("");
    }
  }

  function disableButton(){
    return dpBoxValue == null || preco == ""; 
  }

return <div>
    
    <div className="header" style={{height:"100%"}}>
      <NavLink to='/'>
      <ActionIcon size={42} variant="default" aria-label="ActionIcon with size as a number">
        <IconArrowLeft style={{ width: rem(24), height: rem(24) }} />
      </ActionIcon>    
      </NavLink>
      <Text ta={"center"} p={"xs"} c={"#FFFF"} size="30px" ff="monospace">Nova Venda</Text>
      <Text ta={"center"} c={"red"} size="15px" ff="monospace">{erros}</Text>

       
    <Center>
      <TextInput
        mt={"10px"}
        value={cBarras}
        ref={inputRef}
        label={"Codigo de Barras"}
        onChange={(event) =>setCBarras(event.currentTarget.value)}
        onKeyUp={() => cBarrasOnChange()}
        pe={'md'} pb={'sm'} ps={'md'} 
      />

      <NumberInput 
          value={qtd} 
          onChange={setQtd} 
          label={"Quantidade"}
          allowDecimal={false} 
          allowNegative={false} 
          hideControls={true}/>
        {/*<Button hidden={true} ml={"1%"} disabled={disableSearchButton()} type='submit' onClick={()=> searchDB(String(cBarras))}>Buscar</Button> */}
      </Center>

      <Flex pb={"2%"} gap={"md"} justify={"center"} direction={{ base: 'column', sm: 'row' }}>
        <Combobox width={"10%"} 
          store={combobox}
          onOptionSubmit={(val) => {
            setDpBoxValue(val);
            setPrecoDiversos(val);
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

      <Grid>
        <Grid.Col span={10} ta={"end"}> 
          {/**<Button ml={"18%"} disabled={disableFinishButton()} type='submit' onClick={sendToPrinter}>Imprimir Nota</Button>**/}
          </Grid.Col>

        <Grid.Col span={10} ta={"center"}> 
          <Button ml={"18%"} disabled={disableFinishButton()} type='submit' onClick={finishSale}>Finalizar</Button>
        </Grid.Col>
        <Grid.Col span={2}> 
          <TextInput
              label="Valor Pago:"
              labelProps={{"size": "25px"}} // fix it 
              value={valorPago}
              prefix="R$ "
              onChange={(event) =>setValorPago(event.currentTarget.value)}
              onKeyUp={() => valorPagoOnChange()}
              pe={'md'} pb={'sm'} ps={'md'} 
              placeholder="Valor Pago"
            />
        </Grid.Col>
      </Grid>    

      <Grid>
          <Grid.Col span={2}>
            <Text lh={"h1"} p="md" c={"#FFFF"} size="25px">{"Quantidade "}</Text>
          </Grid.Col>
          <Grid.Col span={5}>
            <Text p="md" c={"#FFFF"} size="25px">{"Nome do Produto"}</Text>
          </Grid.Col>
          <Grid.Col span={2}>
            <Text p="md" c={"#FFFF"} size="25px">{"Preço "}</Text>
          </Grid.Col>
          <Grid.Col span={1}>
            <Text  lh={"h1"} p="md" pl={"10%"} ta={"end"} c={"#FFFF"} size="25px">{"TOTAL"}</Text>
          </Grid.Col>
          <Grid.Col span={1}>
            <Text lh={"h1"} p="md" pl={"10%"}  size="25px" ta={"end"}>{"TROCO"}</Text>
          </Grid.Col>
      </Grid>

      <Grid mb={"2%"}>
          <Grid.Col span={10}>
            <Text me={"15px"} ta={"end"} size="25px" c={"#FFFF"}>{showMoney(total)} </Text>    
          </Grid.Col>      
          <Grid.Col span={2}>
            <Text pr={ "40%"} me={"16%"}  mb={"2%"} ta={"end"} size="25px" c={"#FFFF"}>{showMoney(valorTroco)} </Text>    
    
          </Grid.Col>
      </Grid>

    </div>  

    <div className="main" style={{height:"100%", overflowY:"auto"}}>
     
      <div id="productsDiv" style={{minHeight:"40vh", maxHeight: "40vh", minWidth:"90%", maxWidth:"99%"}}>
      {products.map((product, index)=>
        <Grid justify={"start"}>
          <Grid.Col span={2}>
            <Text pl={"55px"} c={"#ffff"} size="20px"> {product.qtd}</Text>
          </Grid.Col>
          <Grid.Col span={5}>
            <Text ps={"md"} c={"#ffff"} size="20px" truncate="end">{product.name}</Text>
          </Grid.Col>
          <Grid.Col span={2}>
            <Text pl={"15px"} c={"#ffff"} size="20px">{showMoney(product.price)}</Text>
          </Grid.Col>
          
          <Grid.Col ta={"end"} span={2}>
            <Button hidden={true} disabled={false} type='submit' onClick={()=>removeItem(index)}>Remover</Button>
          </Grid.Col>
        </Grid>
        )}

      </div>
      
    </div>
  
  </div>
}

export default NovaVenda;