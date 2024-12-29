import { ActionIcon, Button, Center, Checkbox, Grid, NumberInput, rem, TextInput, Text} from '@mantine/core'
import { IconArrowLeft } from '@tabler/icons-react'
import { useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import axios from 'axios'


function NovoProduto() {
  const [found, setFound] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [lastCBarras, setLastCBarras] = useState<string>('');
  const [title, setTitle] = useState<string>('Novo Produto');
  const [erros, setErros] = useState<string>('');
  const [cBarras, setCBarras] = useState<string>('')

  const [checked, setChecked] = useState(true);
  const [nomeProduto, setNomeProduto] = useState('')
  const [nomeVendaProduto, setNomeVendaProduto] = useState('')
  const [qtdProduto, setQtdProduto] = useState<number | string>('')
  const [precoProduto, setPrecoProduto] = useState<number | string>('')


  function disableAddButton(){
    return !found && String(cBarras).length != 0 && String(nomeProduto).length != 0
    && String(precoProduto).length != 0; 
  }

  function disableResetButton(){
    return String(cBarras).length != 0 || nomeProduto.length != 0  || nomeVendaProduto.length != 0
    || String(qtdProduto).length != 0 || String(precoProduto).length != 0
    
  }

  function resetProduct(){
    setFound(false);
    setTitle('Novo Produto')
    setLastCBarras('');
    setCBarras('');
    setNomeProduto('');
    setNomeVendaProduto('');
    setPrecoProduto('');
    setQtdProduto('');
    
    inputRef.current?.focus();
    
  }

  async function search (codBarras: String){
    try {

      const url = "https://www.google.com/search?q=" + codBarras;
      const result = await axios(`http://localhost:5000/scrape?url=${encodeURIComponent(url)}`);
      let data = String(result.data[0].text.split("-")[0]);

      if (data.includes(String(codBarras)))
        data = String(result.data[1].text)
      
      data = data.split(":")[0].split("|")[0];
      setNomeProduto(data);


    } catch (error) {
      console.error("Error fetching data:", error);
    } 
  }


  async function searchDB (codBarras: String){
    try {
      const result = await axios.get("http://localhost:5000/products?codBarras=" + codBarras);

      if (result.status == 200){
        const product = result.data;
        
        setTitle("Atualizar Produto");
        setNomeProduto(product.name);
        setNomeVendaProduto(product.salesName);
        setPrecoProduto(product.price);
        setQtdProduto(product.qtd);
        setFound(true);

        return true;

      }else {
        return false;
      }
   
    } catch (error) {
      console.log("Error fetching data:" + error);

    } 
  }


  function cBarrasOnKeyUp(){
    if (String(cBarras).length == 13 || String(cBarras).length == 8 && String(cBarras) != String(lastCBarras)){
      setLastCBarras(String(cBarras));

      const result = searchDB(String(cBarras));
      
      result.then((value) => {
        if (checked && !value && String(cBarras).length == 13){
          search(String(cBarras));
        }
      })
     
    }else {
      setCBarras(String(cBarras).slice(0, 13));
    }
  }

  function cBarrasOnChange(val: string){

    if (/^\d*$/.test(val)) {
      setCBarras(val);
    } 
    
  }

  async function addProduct() {
    
    const url = "http://localhost:5000/products";
    const qtdEnviado = qtdProduto != ""? qtdProduto : "1"; 
    const produto = {
      "barcode": cBarras,
      "name": nomeProduto,
      "salesName": nomeVendaProduto,
      "price": precoProduto,
      "qtd": qtdEnviado,
    };

    const result = await axios.post(url, produto);
    if (result.status == 200){
    
      resetProduct();
      setErros('Produto Cadastrado com Sucesso!');
      setTimeout(() => {
        setErros('');
      }, 5000);
    }else {
      setErros('Erro!' + result.data.text);
    }
    
  }

  async function editProduct() {
     
    const url = "http://localhost:5000/products";
    const produto = {
      "barcode": cBarras,
      "name": nomeProduto,
      "salesName": nomeVendaProduto,
      "price": precoProduto,
      "qtd": qtdProduto,
    };

    const result = await axios.put(url, produto);
   
    if (result.status == 200){
    
      resetProduct();

      setErros('Produto Atualizado com Sucesso!');

      setTimeout(() => {
        setErros('');
      }, 5000);
    }else {
      setErros('Erro ao Atualizar o Produto!' + result.status);

    }
  }

  return (
    <div>
        <NavLink to="/">
            <ActionIcon size={42} variant="default" aria-label="ActionIcon with size as a number">
              <IconArrowLeft style={{ width: rem(24), height: rem(24) }} />
            </ActionIcon>    
        </NavLink>
        
        <h1 style={{color:'white'}}>{title}</h1>

        <Grid>
          <Grid.Col span={10}>

            <TextInput
              value={cBarras}
              onChange={(event) => cBarrasOnChange(event.currentTarget.value)}
              onKeyUp={cBarrasOnKeyUp}
              ref = {inputRef}
              pe={'md'} pb={'sm'} ps={'md'} 
              placeholder="Código de Barras"
            />
            
          </Grid.Col>
          <Grid.Col span={2}>
            <Checkbox 
              checked={checked} 
              onChange={(event) => setChecked(event.currentTarget.checked)} 
              p={'md'} defaultChecked={false} 
              label={"Buscar no Google"}/>
          </Grid.Col>
        </Grid>

        <TextInput 
          value={nomeProduto} 
          onChange={(event)=>setNomeProduto(event.currentTarget.value)} 
          pe={'md'} pb={'sm'} ps={'md'} 
          placeholder='Nome do Produto'
          />

        <TextInput 
          value={nomeVendaProduto} 
          disabled={true}
          onChange={(event)=>setNomeVendaProduto(event.currentTarget.value)}           
          pe={'md'} pb={'sm'} ps={'md'} 
          placeholder='Nome de Venda do Produto'/>

        <NumberInput
          value={precoProduto}
          onChange={setPrecoProduto} 
          pe={'md'} pb={'sm'} ps={'md'} 
          placeholder='Preço do Produto' 
          allowNegative={false} 
          decimalScale={2} 
          allowedDecimalSeparators={[',']} 
          fixedDecimalScale={true} 
          hideControls={true} 
          prefix='R$ '/>

        <NumberInput
          value={qtdProduto}
          onChange={setQtdProduto} 
          pe={'md'} pb={'sm'} ps={'md'} 
          placeholder='Quantidade' 
          allowDecimal={false} 
          allowNegative={false} 
          hideControls={true}/>

        <Text 
          pe={'md'} pb={'sm'} ps={'md'} >
          {erros}
        </Text>

        <Center>
          <Button disabled={!disableResetButton()} type='submit' onClick={resetProduct}>Limpar</Button>
          <Button disabled={!found} type='submit' onClick={editProduct}>Atualizar</Button>
          <Button disabled={!disableAddButton()} type='submit' onClick={addProduct}>Cadastrar</Button>
        </Center>
    </div>
  )
}

export default NovoProduto