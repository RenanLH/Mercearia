import { ActionIcon, Button, Center, Checkbox, Grid, NumberInput, rem, TextInput, Text} from '@mantine/core'
import { IconArrowLeft } from '@tabler/icons-react'
import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import axios from 'axios'

function NovoProduto() {

  const [erros, setErros] = useState<string>('');
  const [cBarras, setCBarras] = useState<number | string>('')
  const [checked, setChecked] = useState(false);
  const [nomeProduto, setNomeProduto] = useState('')


  async function search (codBarras: String){
    try {
      const url = "https://www.google.com/search?q=" + codBarras;
      const result = await axios(`http://localhost:5000/scrape?url=${encodeURIComponent(url)}`);
      let data = String(result.data[0].text.split("-")[0]);
      data = data.split(":")[0];
      setNomeProduto(data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } 
  }

  function cBarrasOnChange(){
  
    if (String(cBarras).length >= 13){
      if (checked){
        search(String(cBarras));
      }
      setCBarras(String(cBarras).slice(0, 13));
    }else {
      setErros('Erro ao buscar no Google. Digite manualmete os dados.');
    }
  }

  function reset(){
    setCBarras('');
    setErros('');
  }

  return (
    <div>
        <NavLink to="/">
            <ActionIcon size={42} variant="default" aria-label="ActionIcon with size as a number">
              <IconArrowLeft style={{ width: rem(24), height: rem(24) }} />
            </ActionIcon>    
        </NavLink>
        
        <h1 style={{color:'white'}}>Novo Produto</h1>
        <Grid>
          <Grid.Col span={10}>
            <NumberInput
              value={cBarras}
              onChange={setCBarras}
              onKeyUp={()=> cBarrasOnChange()} 
              pe={'md'} 
              pb={'sm'} 
              ps={'md'} 
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

        <TextInput value={nomeProduto} onChange={(event)=>setNomeProduto(event.currentTarget.value)} pe={'md'} pb={'sm'} ps={'md'} placeholder='Nome do Produto'/>
        <NumberInput pe={'md'} pb={'sm'} ps={'md'} placeholder='Preço do Produto' allowNegative={false} decimalScale={2} allowedDecimalSeparators={[',']} fixedDecimalScale={true} hideControls={true} prefix='R$ '/>
        <NumberInput pe={'md'} pb={'sm'} ps={'md'} placeholder='Quantidade' allowDecimal={false} allowNegative={false} hideControls={true}/>
        <Text>{erros}</Text>
        <Center><Button type='submit' onClick={reset}>Cadastrar</Button></Center>
    </div>
  )
}

export default NovoProduto