import {
  Button, Center, Combobox, Flex,
  Grid, InputBase, NumberInput, Text,
  useCombobox, ActionIcon, rem, TextInput,
  Box
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

  const groceries = [
    "Diversos",
    "Pão Frances",
    "Ovos",
    "Gelo 1Kg",
    "Gelo 5Kg",
    "Carvão 4Kg",
    "Carvão 9Kg",
    "Lenha",
    "Sabão em Barra",
  ];
  const [total, setTotal] = useState<number>(0.0);
  const [preco, setPreco] = useState<string | number>("");
  const [qtd, setQtd] = useState<string | number>("1");
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


  function removeItem(removeAtIndex: number) {
    inputRef?.current?.focus();
    setProducts((prev) => prev.filter((_, index) => index != removeAtIndex));
    setValorPago("");
    setValorTroco("");
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
    <Combobox.Option value={item} key={item}>
      {item}
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
    if (item == "Gelo 1Kg") {
      setPreco(4);
    } else if (item == "Pão Frances") {
      setPreco(0.6);
    } else if (item == "Ovos") {
      setPreco(0.85);
    } else if (item == "Gelo 5Kg") {
      setPreco(10);
    } else if (item == "Carvão 4Kg") {
      setPreco(20);
    } else if (item == "Carvão 9Kg") {
      setPreco(46);
    } else if (item == "Lenha") {
      setPreco(16);
    } else if (item == "Sabão em Barra") {
      setPreco(3.5);
    } else {
      setPreco("");
    }
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
        existentProduct.qtd = String(Number(existentProduct.qtd) + Number(qtd));
      reset();
      setTotal(getTotal());

      setCanPrint(true);
    } else {
      setErros("Drop vazio ou preco vazio ou qtd vazio"!!!);
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
      console.log(products.length)
      setValorTroco(pago - valorTotal);
    } else {
      setValorTroco("");
    }
  }

  function disableButton() {
    return dpBoxValue == null || preco == "";
  }

  return (
    <div>
      <div className="header" style={{ height: "100%" }}>
        <NavLink to="/">
          <ActionIcon
            size={42}
            variant="default"
            aria-label="ActionIcon with size as a number"
          >
            <IconArrowLeft style={{ width: rem(24), height: rem(24) }} />
          </ActionIcon>
        </NavLink>
        <h1>Nova Venda</h1>
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
          pb={"2%"}
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

        <Center>
          <NumberInput
            label="Valor Pago:"
            labelProps={{ size: "25px" }}
            value={valorPago}
            prefix="R$ "
            decimalScale={2}
            fixedDecimalScale={true}
            hideControls={true}
            allowedDecimalSeparators={[","]}
            onChange={valorPagoOnChange}
            onKeyUp={valorTrocoOnChange}
            pe={"md"}
            pb={"sm"}
            ps={"md"}
            placeholder="Valor Pago"
          />
        </Center>

        <Grid>
          <Grid.Col span={6} ta={"center"}>
            {" "}
          </Grid.Col>

          <Grid.Col span={4} ms={"10%"} ta={"end"}>
            <Button
              ml={"18%"}
              disabled={disableFinishButton()}
              type="submit"
              onClick={finishSale}
            >
              Finalizar
            </Button>
            <Button
              ml={"18%"}
              disabled={disablePrintButton()}
              type="submit"
              onClick={sendToPrinter}
            >
              Imprimir Nota
            </Button>
          </Grid.Col>
        </Grid>

        <Flex gap="sm" align="center" wrap="nowrap" style={{ width: "100%", padding: "0.5rem 0", borderBottom: "1px solid #444" }}>
          <Box style={{ flex: "0 0 15%", textAlign: "center" }}>
            <Text c="#FFFF" fz={{ base: "13px", sm: "20px" }} fw={600}>
              Quantidade
            </Text>
          </Box>
          <Box style={{ flex: "0 0 30%", minWidth: 0 }}>
            <Text c="#FFFF" fz={{ base: "13px", sm: "20px" }} fw={600}>
              Nome do Produto
            </Text>
          </Box>
          <Box style={{ flex: "0 0 14%", textAlign: "center" }}>
            <Text c="#FFFF" fz={{ base: "13px", sm: "20px" }} fw={600}>
              Preço
            </Text>
          </Box>
          <Box style={{ flex: "0 0 15%", textAlign: "center" }}>
            <Text c="#FFFF" fz={{ base: "13px", sm: "20px" }} fw={600}>
              TOTAL
            </Text>
          </Box>
          <Box style={{ flex: "0 0 15%", textAlign: "center" }}>
            <Text c="#FFFF" fz={{ base: "13px", sm: "20px" }} fw={600}>
              TROCO
            </Text>
          </Box>
        </Flex>

        <Flex gap="sm" align="center" wrap="nowrap" mb="1%" style={{ width: "100%", padding: "0.5rem 0" }}>
          <Box style={{ flex: "0 0 15%", textAlign: "center" }} />
          <Box style={{ flex: "0 0 15%", minWidth: 0 }} />
          <Box style={{ flex: "0 0 30%", minWidth: 0 }} />

          <Box style={{ flex: "0 0 14%", textAlign: "center" }}>
            <Text fz={{ base: "13px", sm: "18px" }} c={"#FFFF"} fw={600}>
              {formatMoney(total)}
            </Text>
          </Box>

          <Box style={{ flex: "0 0 15%", textAlign: "center", padding: "0.25rem" }}>
            <Text fz={{ base: "13px", sm: "18px" }} c={"#FFFF"} fw={600}>
              {formatMoney(valorTroco)}
            </Text>
          </Box>

          <Box style={{ flex: "0 0 10%" }} />
        </Flex>
      </div>

      <div className="main" style={{ height: "100%", overflowY: "auto" }}>
        <div
          id="productsDiv"
          style={{
            minHeight: "40vh",
            maxHeight: "100%",
            minWidth: "90%",
            maxWidth: "99%",
          }}
        >
          {products.map((product, index) => (
            <Flex gap="sm" align="center" wrap="nowrap" style={{ width: "100%", padding: "0.5rem 0" }}>
              <Box style={{ flex: "0 0 15%", textAlign: "center" }}>
                <Text c="#ffff" fz={{ base: "13px", sm: "18px" }}>
                  {product.qtd}
                </Text>
              </Box>
              <Box style={{ flex: "0 0 35%", minWidth: 0 }}>
                <Text c="#ffff" fz={{ base: "13px", sm: "18px" }} truncate>
                  {product.name}
                </Text>
              </Box>
              <Box style={{ flex: "0 0 15%", textAlign: "left" }}>
                <Text c="#ffff" fz={{ base: "13px", sm: "18px" }}>
                  {formatMoney(product.price)}
                </Text>
              </Box>
              <Box style={{ flex: "0 0 15%", textAlign: "left" }}>
                <Text c="#ffff" fz={{ base: "13px", sm: "18px" }}>
                  {formatMoney(getProductTotal(product.price, product.qtd))}
                </Text>
              </Box>
              <ActionIcon
                size="lg"
                variant="subtle"
                color="red"
                onClick={() => removeItem(index)}
              >
                <IconTrash size={16} />
              </ActionIcon>
            </Flex>
          ))}
        </div>
      </div>
    </div>
  );
}

export default NovaVenda;
