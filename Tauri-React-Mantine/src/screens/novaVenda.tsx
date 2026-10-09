import {
  Button,
  Center,
  Combobox,
  Flex,
  InputBase,
  NumberInput,
  Text,
  useCombobox,
  ActionIcon,
  rem,
  TextInput,
  Box,
  Title,
  Container,
} from "@mantine/core";
import { useEffect, useRef, useState } from "react";
import { IconArrowLeft, IconTrash } from "@tabler/icons-react";
import { NavLink } from "react-router-dom";
import axios from "axios";

type product = {
  barcode: string;
  name: string;
  salesName: string;
  price: string;
  qtd: string | number;
};

type staticProduct = {
  name: string;
  price: string;
};

function NovaVenda() {
  const [dpBoxValue, setDpBoxValue] = useState<string>("Diversos");
  const [erros, setErros] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [products, setProducts] = useState<product[]>([]);
  const [canPrint, setCanPrint] = useState<boolean>(false);
  const [lastCBarras, setLastCBarras] = useState<string>("");
  const [cBarras, setCBarras] = useState<string | number>("");
  const [valorPago, setValorPago] = useState<string | number>("");
  const [valorTroco, setValorTroco] = useState<string | number>(0.0);

  const [groceries, setGroceries] = useState< staticProduct[]>  ([
    {name:"Diversos", price:""},
  ]);

  const [total, setTotal] = useState<number>(0.0);
  const [preco, setPreco] = useState<string | number>("");
  const [qtd, setQtd] = useState<string | number>("1");
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });
  const saleGridTemplateColumns =
    "minmax(72px, 1.1fr) minmax(120px, 2.2fr) minmax(64px, 1fr) minmax(72px, 1.1fr) minmax(72px, 1.1fr) minmax(104px, 1fr)";

  useEffect(() => {
    inputRef?.current?.focus();
    combobox.selectNextOption();
    combobox.clickSelectedOption();
    getStaticProducts()
  }, []);

  useEffect(() => {
    setTotal(getTotal);
  });

  function setDefaultGroceries () { // set default groceries in case the API call fails
    setGroceries(() => [
      {name: "Diversos", price: "" },
      {name: "Pão Frances", price: "0.6" },
      {name:"Ovos", price:"0.85"},
      {name:"Gelo 1Kg", price:"4.0"},
      {name:"Gelo 5Kg", price:"10.0"},
      {name:"Carvão 4Kg", price:"22.0"},
      {name:"Carvão 9Kg", price:"48.0"},
      {name:"Lenha", price:"18"},
      {name:"Sabão em Barra", price:"3.5"}]);
  }

  function getStaticProducts() {
    const url = "http://localhost:5000/staticProducts";

    axios.get(url)
      .then((result) => {
        if (result.status == 200) {
          const staticProducts = result.data;
  
          const groceriesList: staticProduct[] = staticProducts.map((product: staticProduct) => ({
            name: product.name,
            price: product.price,
          }));

          setGroceries((prev) => [...prev, ...groceriesList]);

        } else {
          setDefaultGroceries();
        }
    }).catch((_error) => {
      //console.error("Error fetching static products:", error);
      setDefaultGroceries();
    });
  }

  function removeItem(removeAtIndex: number) {
    inputRef?.current?.focus();
    setProducts((prev) => prev.filter((_, index) => index != removeAtIndex));
  }

  function reset() {
    setLastCBarras("");
    setCBarras("");
    setValorTroco("");
    setValorPago("");
    setQtd(1);
    setPreco("");
    setDpBoxValue("Diversos");
    setErros("");
    inputRef?.current?.focus();
  }

  const options = groceries.map((item) => (
    <Combobox.Option value={item.name} key={item.name}>
      {item.name}
    </Combobox.Option>
  ));

  function numberToMoney(value: number | string) {
    value = String(value).replace(",", ".");
    return String(Number(value).toFixed(2)).replace(".", ",");
  }

  function formatMoney(value: number | string) {
    if (value == 0) {
      return "R$ 0,0";
    }
    const srtValue = numberToMoney(value);
    return `R$ ${srtValue}`;
  }

  function setPrecoDiversos(item: string) {
    setPreco(groceries.find((product) => product.name === item)?.price || "");
  }

  async function sendToPrinter() {
    if (canPrint) {
      setCanPrint(false);
      const url = "http://localhost:5569/print";
      reset();
      products.forEach((item) => {
        let name = item.name.slice(0, 20);

        item.name = name;
      });

      const sale = {
        productList: products,
        total: total,
      };

      axios.post(url, sale);

      setTimeout(() => {
        setCanPrint(true);
      }, 2000);
    }
  }

  async function finishSale() {
    const url = "http://localhost:5000/sales";
    const options: Intl.DateTimeFormatOptions = {
      weekday: "short",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    };
    const date = new Date().toLocaleDateString("pt-BR", options);

    const sale = {
      productList: products,
      total: total,
      date: date,
    };

    const result = await axios.post(url, sale);

    if (result.status == 200) {
      reset();
      setErros("Venda Finalizada com Sucesso!");

      setTimeout(() => {
        reset();
        setProducts([]);
        setCanPrint(false);
      }, 2500);
    } else {
      setErros("Erro!" + result.data.text);
    }
  }

  function disableFinishButton() {
    return products.length == 0;
  }

  function disablePrintButton() {
    if (products.length == 0) return true;

    return !canPrint;
  }

  async function searchDB(codBarras: String) {
    try {
      const existentProduct = products.find((item) => item.barcode == cBarras);
      if (existentProduct != undefined && existentProduct != null) {
        if (String(qtd).length == 0) setQtd(1);

        existentProduct.qtd = Number(existentProduct.qtd) + Number(qtd);
        setTimeout(() => {
          reset();
        }, 500);
      } else {
        console.log("waiting");
        const result = await axios.get(
          "http://localhost:5000/products?codBarras=" + codBarras,
        );
        if (result.status == 200) {
          const productDb = result.data;

          console.log(productDb);

          if (Number(qtd) >= 1) productDb.qtd = qtd;
          else productDb.qtd = 1;

          setProducts((prev) => [productDb, ...prev]);
          setTimeout(() => {
            reset();
          }, 500);
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  }

  function priceToCents(value: string | number) {
    const normalized = String(value).replace(",", ".").trim();
    const parsed = Number(normalized);

    if (!Number.isFinite(parsed)) return 0;

    return Math.round(parsed * 100);
  }

  function getProductTotal(price: string, qtd: string | number) {
    let totalInCents = priceToCents(price);
    totalInCents = totalInCents * Number(qtd);
    return totalInCents / 100;
  }

  function getTotal() {
    const totalInCents = products.reduce((sum, product) => {
      const priceInCents = priceToCents(product.price);
      const quantity = Number(product.qtd) || 0;

      return sum + priceInCents * quantity;
    }, 0);

    return totalInCents / 100;
  }

  function adicionarBtOnclick() {
    if (dpBoxValue != null && preco != "") {
      let q = qtd;
      if (String(qtd) == "" || Number(qtd) == 0) {
        setQtd(1);
        q = 1;
      }

      const uncategorized = {
        barcode: "",
        name: dpBoxValue as string,
        salesName: "",
        price: numberToMoney(preco),
        qtd: q,
      };
      const existentProduct = products.find(
        (item) => item.name == uncategorized.name,
      );

      if (existentProduct == undefined || existentProduct.name == "Diversos")
        setProducts((prev) => [uncategorized, ...prev]);
      else
        existentProduct.qtd = String(Number(existentProduct.qtd) + Number(q));
      reset();
      setTotal(getTotal());

      setCanPrint(true);
    }
  }

  function cBarrasOnKeyUp() {
    if (String(qtd).length == 0) setQtd(1);
    if (
      (String(cBarras).length == 13 ||
        String(cBarras).length == 12 ||
        String(cBarras).length == 8) &&
      String(cBarras) != String(lastCBarras)
    ) {
      setLastCBarras(String(cBarras));
      searchDB(String(cBarras));
      setCanPrint(true);
    } else {
      setCBarras(String(cBarras).slice(0, 13));
    }
  }

  function cBarrasOnChange(val: string) {
    if (/^\d*$/.test(val)) {
      setCBarras(val);
    }
  }

  function precoOnChange(val: string | number) {
    setPreco(Number(val) < 10000 ? val : "1");
  }

  function qtdOnChange(val: string | number) {
    setQtd(Number(val) < 1000 ? val : "1");
  }

  function valorPagoOnChange(val: string | number) {
    setValorPago(Number(val) < 100000 ? val : "");
  }

  function valorTrocoOnChange() {
    const pago = Number(String(valorPago).replace(",", "."));
    const valorTotal = Number(total);
    if (pago > 0 && products.length > 0) {
      console.log(products.length);
      setValorTroco(pago - valorTotal);
    } else {
      setValorTroco("");
    }
  }

  useEffect(() => {
    const pago = Number(String(valorPago).replace(",", "."));
    const valorTotal = Number(total);

    if (pago > 0 && products.length > 0) {
      setValorTroco(pago - valorTotal);
    } else {
      setValorTroco("");
    }
  }, [products, total, valorPago]);

  function disableButton() {
    return dpBoxValue == null || preco == "";
  }

  return (
    <>
      <div
        style={{ position: "absolute", top: "1rem", left: "1rem", zIndex: 100 }}
      >
        <NavLink to="/">
          <ActionIcon size={42} variant="default" aria-label="Voltar">
            <IconArrowLeft style={{ width: rem(24), height: rem(24) }} />
          </ActionIcon>
        </NavLink>
      </div>
      <div
        style={{
          height: "100dvh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div style={{ flexShrink: 0 }}>
          <Container size="xl" pt="xl">
            <Title order={1} fw={800} lts="-0.5px">
              Nova Venda
            </Title>
          </Container>
          <Text ta={"center"} c={"red"} size="15px" ff="monospace">
            {erros}
          </Text>

          <Center>
            <TextInput
              mt={"10px"}
              value={cBarras}
              ref={inputRef}
              label={"Codigo de Barras"}
              onChange={(event) => cBarrasOnChange(event.currentTarget.value)}
              onKeyUp={() => cBarrasOnKeyUp()}
              pe={"md"}
              pb={"sm"}
              ps={"md"}
            />
            {
              //fix qtd > 200
            }
            <NumberInput
              value={qtd}
              onChange={(value) => qtdOnChange(value)}
              label={"Quantidade"}
              allowDecimal={false}
              allowNegative={false}
              hideControls={true}
            />
          </Center>

          <Flex
            pb={"sm"}
            gap={"md"}
            justify={"center"}
            direction={{ base: "column", sm: "row" }}
          >
            <Combobox
              width={"10%"}
              store={combobox}
              onOptionSubmit={(val) => {
                setDpBoxValue(val);
                setPrecoDiversos(val);
                combobox.closeDropdown();
              }}
            >
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

            <NumberInput
              value={preco}
              onChange={precoOnChange}
              placeholder="Preço do Produto"
              allowNegative={false}
              allowedDecimalSeparators={[","]}
              decimalScale={2}
              fixedDecimalScale={true}
              hideControls={true}
              prefix="R$ "
            />
            <Button disabled={disableButton()} onClick={adicionarBtOnclick}>
              {" "}
              Adicionar
            </Button>
          </Flex>

          <Flex align="flex-end" wrap="wrap">
            <Box style={{ flex: 1 }} />
            <Center style={{ flex: 1 }}>
              <NumberInput
                label="Valor Pago:"
                labelProps={{ size: "23px" }}
                value={valorPago}
                prefix="R$ "
                decimalScale={2}
                fixedDecimalScale={true}
                hideControls={true}
                allowedDecimalSeparators={[","]}
                onChange={valorPagoOnChange}
                onKeyUp={valorTrocoOnChange}
                pb={"md"}
                placeholder="Valor Pago"
              />
            </Center>
            <Box style={{ flex: 1 }} />
          </Flex>

          <Box
            mb={"lg"}
            style={{
              width: "100%",
              borderBottom: "1px solid #444",
              display: "grid",
              gridTemplateColumns: saleGridTemplateColumns,
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <Box style={{ textAlign: "center" }}>
              <Text c="#FFFF" fz={{ base: "13px", sm: "23px" }} fw={600}>
                Quantidade
              </Text>
            </Box>
            <Box style={{ minWidth: 0 }}>
              <Text c="#FFFF" fz={{ base: "13px", sm: "23px" }} fw={600}>
                Nome do Produto
              </Text>
            </Box>
            <Box style={{ textAlign: "center" }}>
              <Text c="#FFFF" fz={{ base: "13px", sm: "23px" }} fw={600}>
                Preço
              </Text>
            </Box>
            <Box style={{ textAlign: "center" }}>
              <Text c="#FFFF" fz={{ base: "13px", sm: "23px" }} fw={600}>
                TOTAL
              </Text>
            </Box>
            <Box style={{ textAlign: "center" }}>
              <Text c="#FFFF" fz={{ base: "13px", sm: "23px" }} fw={600}>
                TROCO
              </Text>
            </Box>
            <Box pe={"sm"} pl={"sm"}>
              <Button
                fullWidth
                disabled={disableFinishButton()}
                type="submit"
                onClick={finishSale}
              >
                Finalizar
              </Button>
            </Box>
            <Box style={{ textAlign: "center" }} />
            <Box style={{ minWidth: 0 }} />
            <Box style={{ minWidth: 0 }} />

            <Box style={{ textAlign: "center" }}>
              <Text fz={{ base: "13px", sm: "23px" }} c={"#FFFF"} fw={600}>
                {formatMoney(total)}
              </Text>
            </Box>

            <Box
              style={{
                textAlign: "center",
                padding: "0.25rem",
              }}
            >
              <Text fz={{ base: "13px", sm: "23px" }} c={"#FFFF"} fw={600}>
                {formatMoney(valorTroco)}
              </Text>
            </Box>
            <Box pe={"sm"} pl={"sm"}>
              <Button
                fullWidth
                disabled={disablePrintButton()}
                type="submit"
                onClick={sendToPrinter}
              >
                Imprimir Nota
              </Button>
            </Box>
          </Box>
        </div>

        <div className="main" style={{ flex: 1, overflow: "hidden" }}>
          <div
            id="productsDiv"
            style={{
              height: "100%",
              overflowY: "auto",
              width: "100%",
            }}
          >
            {products.map((product, index) => (
              <Box
                key={index}
                style={{
                  width: "100%",
                  padding: "0.5rem 0",
                  display: "grid",
                  gridTemplateColumns: saleGridTemplateColumns,
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <Box style={{ textAlign: "center" }}>
                  <Text c="#ffff" fz={{ base: "13px", sm: "20px" }}>
                    {product.qtd}
                  </Text>
                </Box>
                <Box style={{ minWidth: 0 }}>
                  <Text c="#ffff" fz={{ base: "15px", sm: "20px" }} truncate>
                    {product.name.toUpperCase()}
                  </Text>
                </Box>
                <Box style={{ textAlign: "center" }}>
                  <Text c="#ffff" fz={{ base: "13px", sm: "20px" }}>
                    {formatMoney(product.price)}
                  </Text>
                </Box>
                <Box style={{ textAlign: "center" }}>
                  <Text c="#ffff" fz={{ base: "13px", sm: "20px" }}>
                    {formatMoney(getProductTotal(product.price, product.qtd))}
                  </Text>
                </Box>
                <Box />
                <Box style={{ textAlign: "center" }}>
                  <ActionIcon
                    size="lg"
                    variant="subtle"
                    color="red"
                    onClick={() => removeItem(index)}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Box>
              </Box>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

export default NovaVenda;
