import {
  ActionIcon, Button, Grid,
  NumberInput, rem, TextInput,
  Text, Flex, Title,
  Container,
} from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import axios from "axios";

function NovoProduto() {
  const [found, setFound] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [lastCBarras, setLastCBarras] = useState<string>("");
  const [title, setTitle] = useState<string>("Novo Produto");
  const [erros, setErros] = useState<string>("");
  const [cBarras, setCBarras] = useState<string>("");

  const [nomeProduto, setNomeProduto] = useState("");
  const [qtdProduto, setQtdProduto] = useState<number | string>("");
  const [precoProduto, setPrecoProduto] = useState<number | string>("");

  useEffect(() => {
    inputRef?.current?.focus();
  }, []);

  function disableAddButton() {
    return (
      !found &&
      String(cBarras).length != 0 &&
      String(nomeProduto).length != 0 &&
      String(precoProduto).length != 0
    );
  }

  function disableResetButton() {
    return (
      String(cBarras).length != 0 ||
      nomeProduto.length != 0 ||
      String(qtdProduto).length != 0 ||
      String(precoProduto).length != 0
    );
  }

  function disableSearchButton() {
    return !(String(cBarras).length > 8 && !found);
  }

  function resetProduct() {
    setFound(false);
    setTitle("Novo Produto");
    setLastCBarras("");
    setCBarras("");
    setNomeProduto("");
    setPrecoProduto("");
    setQtdProduto("");

    inputRef.current?.focus();
  }

  async function searchDB(codBarras: String) {
    try {
      const result = await axios.get(
        "http://localhost:5000/productExists?codBarras=" + codBarras,
      );

      if (result.status == 200) {
        const product = result.data;

        setTitle("Atualizar Produto");
        setNomeProduto(product.name.slice(0, 20));
        setPrecoProduto(product.price);
        setQtdProduto(product.qtd);
        setFound(true);

        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.log("Error fetching data:" + error);
    }
  }

  function nomeProdutoOnKeyUp() {
    if (String(nomeProduto).length > 20) {
      setNomeProduto(nomeProduto.slice(0, 20));
    }
  }

  function cBarrasOnKeyUp() {
    if (
      String(cBarras).length == 13 ||
      (String(cBarras).length == 8 && String(cBarras) != String(lastCBarras))
    ) {
      setLastCBarras(String(cBarras));
      searchDB(String(cBarras));
    } else {
      setCBarras(String(cBarras).slice(0, 13));
    }
  }

  function cBarrasOnChange(val: string) {
    if (/^\d*$/.test(val)) {
      setCBarras(val);
    }
  }

  async function addProduct() {
    const url = "http://localhost:5000/products";
    const qtdEnviado = qtdProduto != "" ? qtdProduto : "1";
    const produto = {
      barcode: cBarras,
      name: nomeProduto,
      price: precoProduto,
      qtd: qtdEnviado,
    };

    const result = await axios.post(url, produto);
    if (result.status == 200) {
      resetProduct();
      setErros("Produto Cadastrado com Sucesso!");
      setTimeout(() => {
        setErros("");
      }, 5000);
    } else {
      setErros("Erro!" + result.data.text);
    }
  }

  async function editProduct() {
    const url = "http://localhost:5000/products";
    const produto = {
      barcode: cBarras,
      name: nomeProduto,
      price: precoProduto,
      qtd: qtdProduto,
    };

    const result = await axios.put(url, produto);

    if (result.status == 200) {
      resetProduct();

      setErros("Produto Atualizado com Sucesso!");

      setTimeout(() => {
        setErros("");
      }, 5000);
    } else {
      setErros("Erro ao Atualizar o Produto!" + result.status);
    }
  }

  return (
    <>
      <div style={{ position: "absolute", top: "1rem", left: "1rem", zIndex: 100 }}>
        <NavLink to="/">
          <ActionIcon size={42} variant="default" aria-label="Voltar">
            <IconArrowLeft style={{ width: rem(24), height: rem(24) }} />
          </ActionIcon>
        </NavLink>
      </div>
      
      <Container size="xl" py="xl" h={"100dvh"}>
        <Title order={1} fw={800} lts="-0.5px" mb="3.5rem">
          {title}
        </Title>
        <Grid>
          <Grid.Col span={9}>
            <TextInput
              value={cBarras}
              onChange={(event) => cBarrasOnChange(event.currentTarget.value)}
              onKeyUp={cBarrasOnKeyUp}
              ref={inputRef}
              pe={"md"}
              pb={"sm"}
              ps={"md"}
              placeholder="Código de Barras"
            />
          </Grid.Col>
  
          <Grid.Col span={1}>
            <Button
              disabled={disableSearchButton()}
              type="submit"
              onClick={() => searchDB(cBarras)}
            >
              Buscar
            </Button>
          </Grid.Col>
        </Grid>
  
        <TextInput
          value={nomeProduto}
          onChange={(event) => setNomeProduto(event.currentTarget.value)}
          pe={"md"}
          pb={"sm"}
          ps={"md"}
          onKeyUp={nomeProdutoOnKeyUp}
          placeholder="Nome do Produto"
        />
  
        <NumberInput
          value={precoProduto}
          onChange={setPrecoProduto}
          pe={"md"}
          pb={"sm"}
          ps={"md"}
          placeholder="Preço do Produto"
          allowNegative={false}
          decimalScale={2}
          allowedDecimalSeparators={[","]}
          fixedDecimalScale={true}
          hideControls={true}
          prefix="R$ "
        />
  
        <NumberInput
          value={qtdProduto}
          onChange={setQtdProduto}
          pe={"md"}
          pb={"sm"}
          ps={"md"}
          placeholder="Quantidade"
          allowDecimal={false}
          allowNegative={false}
          hideControls={true}
        />
  
        <Text pe={"md"} pb={"sm"} ps={"md"}>
          {erros}
        </Text>
  
        <Flex gap={"md"} justify={"center"} p={"xl"}>
          <Button
            disabled={!disableResetButton()}
            type="submit"
            onClick={resetProduct}
          >
            Limpar
          </Button>
          <Button disabled={!found} type="submit" onClick={editProduct}>
            Atualizar
          </Button>
          <Button
            disabled={!disableAddButton()}
            type="submit"
            onClick={addProduct}
          >
            Cadastrar
          </Button>
        </Flex>
        
      </Container>

    </>
  );
}

export default NovoProduto;
