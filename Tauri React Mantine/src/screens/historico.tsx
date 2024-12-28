import { Button, Center, Checkbox, Grid, Image, NumberInput, Text } from '@mantine/core'
import { DateTimePicker } from '@mantine/dates';
import axios from 'axios';
import { useState } from 'react';




function Historico() {

    type Product = {
        id: string
        barcode: string
        name: string
        salesName: string
        qtd: number
        price: string 
    }

    type Venda = {
        id: string
        date: string
        total: string
        products: Product[]
    }
    const [data, setData] = useState<Venda | null>(null);

    async function consultarHistorico() {

        const url = "http://localhost:5000/sales?date=";

        const result = await axios.get(url + new Date().toISOString());
        
        const venda = result.data as Venda;
        setData(venda);

    }

 

  return (
    <div className="container">
        <Text size="55px" c={'#FFFF'} mb={100}>Historico</Text>
        

        <Center>
            <DateTimePicker 
                label="Escolha uma data"
                defaultValue={new Date()}
                size='sm'/>

            <Button ml="50px" mt={25} onClick={consultarHistorico}>Enviar</Button>
        </Center>
        {
            data != null &&
            <div>
                <Text mt={"2%"} size='xl'>Data {new Date(String(data?.date)).toLocaleDateString()}</Text>
                <Text size='xl'>Total R${data?.total}</Text>

            </div>  
           
        }
            


  </div>   
  )
}

export default Historico