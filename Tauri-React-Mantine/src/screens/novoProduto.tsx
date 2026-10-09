import {
  ActionIcon, Button, Grid,
  NumberInput, rem, TextInput,
  Text, Flex, Title, InputBase,
  Container, Combobox, useCombobox
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
  const [isStatic, setStatic] = useState<boolean>(false);

  const [nomeProduto, setNomeProduto] = useState("");
  const [qtdProduto, setQtdProduto] = useState<number | string>("");
  const [precoProduto, setPrecoProduto] = useState<number | string>("");
  const [dpBoxValue, _setDpBoxValue] = useState<string>("Escolha");

  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  const [groceries, setGroceries] = useState<string[]>([]);

  type staticProduct = {
    name: string;
    price: string;
  };

  useEffect(() => {
    inputRef?.current?.focus();
    getStaticProducts();
  }, []);

  function disableAddButton() {
    return (
      !found &&
      String(cBarras).length != 0 &&
      String(nomeProduto).length != 0 &&
      String(precoProduto).length != 0
    );
  }

  function getStaticProducts() {
    const url = "http://localhost:5000/staticProducts";

    axios.get(url)
      .then((result) => {
        if (result.status == 200) {
          const staticProducts = result.data;
  
          const groceriesList: string[] = staticProducts.map((product: staticProduct) => ([product.name]));
          console.log("Static products fetched:", groceriesList);

          setGroceries(() => [...groceriesList]);

        } else {
          setDefaultGroceries();
        }
    }).catch((_error) => {
      setDefaultGroceries();
    });
  }

  async function handleOptionSubmit(val: string) {
    const valAsString = val.toString();
    
    setStatic(true);
    
    const url = `http://localhost:5000/staticProducts/${encodeURIComponent(valAsString)}`;

    const staticProduct = await axios.get(
      url, {
        params: { productName: valAsString }
    }).catch((_err) => { });

    if (staticProduct?.status === 200) {
      setTitle("Atualizar Produto");
      setCBarras(staticProduct.data.sku);
      console.log(staticProduct.data);
      setNomeProduto(staticProduct.data.name);
      setPrecoProduto(staticProduct.data.price);
      setQtdProduto(1);
      setFound(true);
    } else {
      setCBarras("SEM CODIGO");
      setNomeProduto(val);
      setFound(false);
      setPrecoProduto("");

    }
    
    combobox.closeDropdown();
  }

  const options = groceries.map((item) => (
    <Combobox.Option value={item} key={item}>
      {item}
    </Combobox.Option>
  ));

  function setDefaultGroceries () { // set default groceries in case the API call fails
    setGroceries(() => [
      "Pão Frances",
      "Ovos",
      "Gelo 1Kg",
      "Gelo 5Kg",
      "Carvão 4Kg",
      "Carvão 9Kg",
      "Lenha",
      "Sabão em Barra"
    ]);
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
    return !(String(cBarras).length > 8 && !found && !isStatic);
  }

  function resetProduct() {
    setStatic(false);
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

      const url = "http://localhost:5000/products";
      const result = await axios.get(
        url, {params:{codBarras: codBarras}}
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
    const url = `http://localhost:5000/${isStatic ? "staticProducts" : "products"}`;

    if (isStatic) {

      const produto = {
        name: nomeProduto,
        price: precoProduto,
      };

      const result = await axios.post(url, produto);
      if (result.status == 200) {
        resetProduct();
        setErros("Produto Cadastrado com Sucesso!");
        setTimeout(() => {
          setErros("");
        }, 5000);
      } else {
        resetProduct();
        setErros("Erro!" + result.data.text||"");
      }



    } else {
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
        setErros("Erro!" + result.data.text||"");
      }

    }

  }

  async function editProduct() {
    const url = `http://localhost:5000/${isStatic ? "staticProducts" : "products"}`;

    if (isStatic) {
      const produto = {
        sku: cBarras,
        name: nomeProduto,
        price: precoProduto,
      };

      const result = await axios.put(url, produto);
      if (result.status == 200) {
        resetProduct();
        getStaticProducts();
        setErros("Produto Atualizado com Sucesso!");
        setTimeout(() => {
          setErros("");
        }, 5000);
      } else {
        setErros("Erro ao Atualizar o Produto!" + result.status);
      }

    } else {

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
              disabled={isStatic}
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
            <Combobox
              width={"10%"}
              store={combobox}
              onOptionSubmit={handleOptionSubmit}>
                <Combobox.Target>
                  <InputBase
                    component="button"
                    type="button"
                    pointer
                    rightSection={<Combobox.Chevron />}
                    rightSectionPointerEvents="none"
                    onClick={() => combobox.toggleDropdown()}
                  >
                    {dpBoxValue}
                  </InputBase>
                </Combobox.Target>

                <Combobox.Dropdown>
                  <Combobox.Options>{options}</Combobox.Options>
                </Combobox.Dropdown>
            </Combobox>
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
          disabled={isStatic}
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
