import { ActionIcon, Button, Center, Checkbox, Grid, NumberInput, rem, TextInput, Text} from '@mantine/core'
import { IconArrowLeft } from '@tabler/icons-react'
import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import axios from 'axios'
import { useTimeout } from '@mantine/hooks'

function NovoProduto() {
  const [found, setFound] = useState<boolean>(false);
  const [lastCBarras, setLastCBarras] = useState<string>('');
  const [title, setTitle] = useState<string>('Novo Produto');
  const [erros, setErros] = useState<string>('');
  const [cBarras, setCBarras] = useState<number | string>('')
  const [checked, setChecked] = useState(false);
  const [nomeProduto, setNomeProduto] = useState('')
  const [nomeVendaProduto, setNomeVendaProduto] = useState('')
  const [qtdProduto, setQtdProduto] = useState<number | string>('')
  const [precoProduto, setPrecoProduto] = useState<number | string>('')


  function disableButton(){
    return found || String(cBarras).length == 0 || nomeProduto.length == 0 || nomeVendaProduto.length == 0 
    || String(qtdProduto).length == 0 || String(precoProduto).length == 0; 
  }

  async function search (codBarras: String){
    try {
      const url = "https://www.google.com/search?q=" + codBarras;
      const result = await axios(`http://localhost:5000/scrape?url=${encodeURIComponent(url)}`);
      let data = String(result.data[1].text.split("-")[0]);
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

        setTitle("Atualizar Produto")
        setNomeProduto(product.name);
        setNomeVendaProduto(product.salesName);
        setPrecoProduto(product.price);
        setQtdProduto(product.qtd);
        setFound(true);
      }else {
        setFound(false);
      }
   
    } catch (error) {
      console.error("Error fetching data:", error);
    } 
  }

  function cBarrasOnChange(){
    if (String(cBarras).length == 13 && String(cBarras) != String(lastCBarras)){
      setLastCBarras(String(cBarras));

      searchDB(String(cBarras));
      
      if (checked && nomeProduto.length == 0){
        search(String(cBarras));
      }
    }else {
      setCBarras(String(cBarras).slice(0, 13));
    }
  }

  async function addProduct() {
    
    const url = "http://localhost:5000/products";
    const produto = {
      "barcode": cBarras,
      "name": nomeProduto,
      "salesName": nomeVendaProduto,
      "price": precoProduto,
      "qtd": qtdProduto,
    };

    const result = await axios.post(url, produto);
    if (result.status == 200){
    
      reset();
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
    
      reset();

      setErros('Produto Atualizado com Sucesso!');

      setTimeout(() => {
        setErros('');
      }, 5000);
    }
  }


  function reset(){
    setFound(false);
    setLastCBarras('');
    setCBarras('');
    setNomeProduto('');
    setNomeVendaProduto('');
    setPrecoProduto('');
    setQtdProduto('');
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
            <NumberInput
              value={cBarras}
              onChange={setCBarras}
              onKeyUp={()=> cBarrasOnChange()} 
              autoFocus={true}
              pe={'md'} pb={'sm'} ps={'md'} 
              placeholder='Código de Barras' 
              allowDecimal={false}
              allowNegative={false}
              hideControls={true}
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

        <Text>{erros}</Text>

        <Center>
          <Button disabled={!found} type='submit' onClick={editProduct}>Atualizar</Button>
          <Button disabled={disableButton()} type='submit' onClick={addProduct}>Cadastrar</Button>
        </Center>
    </div>
  )
}

export default NovoProduto