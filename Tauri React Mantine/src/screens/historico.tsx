import { ActionIcon, Button, Center, Grid, rem, Text } from '@mantine/core'
import { DateTimePicker, DateValue } from '@mantine/dates';
import { IconArrowLeft } from '@tabler/icons-react';
import { NavLink } from 'react-router-dom'
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

    type VendaDb = {
        id: string
        date: string
        total: string
        products: string[]
    }

    type Venda = {
        id: string
        date: string
        total: string
        products: Product[]
    }

    const [date, setDate] = useState<DateValue>(new Date());
    const [data, setData] = useState<Venda[] |[]>([]);
    const [canPrint, setCanPrint] = useState<boolean>(true);
    const [produtos, setProdutos] = useState<Product[]>([]);
    const [visibility, setVisibility] = useState(() =>
        produtos.map(() => false) // Create a `false` state for each text item
    );

    const toggleVisibility = (index: number) => {
        setVisibility((prev) =>
          prev.map((isVisible, i) => (i === index ? !isVisible : isVisible))
        );

      };

       async function sendToPrinter(index: number){
          if (canPrint){
            setCanPrint (false);
            const url = "http://localhost:5569/print";
            let products: Product[] = [];
            
            data[index].products.forEach((item) => {
              
              let name = item.name.slice(0, 20);
              products.push({  
                    id: item.id,
                    barcode: item.barcode,
                    name: name,
                    salesName: item.salesName,
                    qtd: item.qtd,
                    price: item.price
                })  
      
            })
      
            const sale = {
              "productList" : products,
              "total": String(Number(data[index].total).toFixed(2)).replace(",", "."),
            };
      
            axios.post(url, sale);
      
            setTimeout(() => {
                setCanPrint(true);
            }, 2000);
      
          }
          
        }

    async function consultarHistorico() {

        setData([]);
        setProdutos([]);
        console.log(date);
        const url = "http://localhost:5000/sales?date="+ date;

        await axios.get(url).then((result) =>{
            const vendasDb: VendaDb[] = result.data as VendaDb[];
            const vendas: Venda[] = [];
    
            vendasDb.map((item) =>{
                return (convertVenda(item));
            }).forEach((venda) => {
                vendas.push(venda);
            });
            
            setData(vendas);
        });
      
    }

    function convertVenda(vendaDb: VendaDb){
        const venda = {} as Venda;
        venda.date = vendaDb.date;
        venda.total = vendaDb.total;
        venda.id = vendaDb.id;
        venda.products = [];

        vendaDb.products.map((item) => {
            return convertProducts(item);}
        ).forEach((produto) => {
            venda.products.push(produto)
            setVisibility((prev) =>[...prev, false]);
        })
        
        return venda;
    }
    function disablePrintButton(index:number){
        if (!visibility[index]) return true;     

        return !canPrint;
    }

    function convertProducts(prod: string){
        return JSON.parse(prod) as Product;
    }

    function numberToMoney(value:number | string){
        value = String(value).replace(",", ".");
        return  String(Number(value).toFixed(2)).replace(".", ",");
    }

    function formatDate(date: string){
        var options:Intl.DateTimeFormatOptions  = { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric',hour:'2-digit', minute:'2-digit', second:'2-digit' };
        return new Date(date).toLocaleDateString("pt-BR", options);
    }
 

  return (
    <div>
        <NavLink to="/">
            <ActionIcon size={42} variant="default" aria-label="ActionIcon with size as a number">
              <IconArrowLeft style={{ width: rem(24), height: rem(24) }} />
            </ActionIcon>    
        </NavLink>

        <Center>
            <Text size="55px" c={'#FFFF'} mb={75}>Historico</Text>
        </Center>
        <Center>
            <DateTimePicker 
                label="Escolha uma data"
                value={date}
                onChange={(d) => setDate(d)}
                size='sm'/>

            <Button ml="50px" mt={25} onClick={consultarHistorico}>Enviar</Button>
        </Center>
        {data.length > 0 && 
            <div>
                {data.map((item, index)=>
                    <div>
                        <Grid justify={"start"} >
                            <Grid.Col span={4}> 
                                <Text mt={"2%"} size='xl'>Data: {formatDate(item?.date)}</Text>
                            </Grid.Col>
                            <Grid.Col span={4}>
                                <Text mt={"2%"} size='xl'>Total: R${numberToMoney(item?.total)}</Text>
                            </Grid.Col>
                            <Grid.Col mt={"2%"} span={4}>
                                <Button onClick={() => toggleVisibility(index)}>Mostrar Produtos</Button>
                                <Button ml={"10%"} type='submit' disabled={disablePrintButton(index)} onClick={()=> sendToPrinter(index)}>Imprimir Nota</Button>
                            </Grid.Col>
                        </Grid>

                        {visibility[index] && 
                            <div>
                                <Grid justify={"start"}>
                                    <Grid.Col span={6}>
                                    <Text fw={700} ps={"md"} c={"#ffff"} size="20px">Nome do Produto</Text>
                                    </Grid.Col>
                                    <Grid.Col span={2}>
                                    <Text fw={700} pl={"10px"} c={"#ffff"} size="20px">Preço</Text>
                                    </Grid.Col>
                                    <Grid.Col span={2}>
                                    <Text fw={700} pl={"55px"} c={"#ffff"} size="20px"> Quantidade</Text>
                                    </Grid.Col>
                                </Grid>
                        {item.products.map((product, _index)=>
                            <Grid justify={"start"}>
                                <Grid.Col span={6}>
                                <Text ps={"md"} c={"#ffff"} size="20px" truncate="end">{product.name}</Text>
                                </Grid.Col>
                                <Grid.Col span={2}>
                                <Text pl={"10px"} c={"#ffff"} size="20px">{numberToMoney(product.price)}</Text>
                                </Grid.Col>
                                <Grid.Col span={2}>
                                <Text pl={"55px"} c={"#ffff"} size="20px"> {product.qtd}</Text>
                                </Grid.Col>
                            </Grid>
                        )}
                        </div>}
                        <Text size="55px" c={'#FFFF'} mb={"2%"}></Text>
                    </div>
                )}
                
            </div>  
        }
  </div>   
  )}

export default Historico