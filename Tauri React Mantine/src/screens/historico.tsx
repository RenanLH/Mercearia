import { Button, Center, Checkbox, Grid, Image, NumberInput, Text } from '@mantine/core'
import { DateTimePicker } from '@mantine/dates';
import axios from 'axios';
import { useState } from 'react';




function Historico() {

    const [data, setData] = useState<string>('NOT FOUND');

    async function consultarHistorico() {

        const url = "http://localhost:5000/sales?date=";

     const result = await axios.get(url + new Date().toISOString());
        setData(String(result));
        console.log(result);

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

        <Text>{data}</Text>
            


  </div>   
  )
}

export default Historico