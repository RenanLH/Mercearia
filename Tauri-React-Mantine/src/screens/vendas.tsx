import React, { useRef, useState, useEffect } from "react";
import {
  Container,
  Stack,
  Title,
  Text,
  Group,
  Divider,
  Box,
  Badge,
  Select,
  Paper,
  SimpleGrid,
  Pagination,
  Drawer,
  ScrollArea,
  ActionIcon,
  Button,
  NumberInput,
  TextInput,
} from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import {
  IconCalendar,
  IconReplace,
  IconPlus,
  IconRestore,
  IconTrash,
  IconColumns,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import 'dayjs/locale/pt-br';
import axios from "axios";
import * as pdfjsLib from "pdfjs-dist";
import {
  applyPdfMatchesToSales,
  buildPdfExtractedSales,
  clampNumericField,
  extractLinesFromRawText,
  formatMoney,
  getAdjustedSaleTotal,
  getProductDisplayLineTotal,
  getProductQuantityForTotal,
  getSaleStatusCounters,
  getStatusColor,
  MAX_NUMERIC_FIELD,
  mergePdfMatches,
  PAGE_SIZE,
  PAYMENT_METHOD_OPTIONS,
  productToNfceItem,
  refreshSplitParents,
  toPaymentMethodCode,
  withCashTotals,
} from "./vendasHelpers";
import type {
  Alternative,
  ExtractedPdfData,
  PaymentMethodCode,
  PdfExtractedSale,
  Product,
  Sale,
} from "./vendasTypes";
import { PdfExtractedSalesModal } from "./vendasPdfModal";
import { VendasSaleCard } from "./vendasSaleCard";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();
dayjs.locale("pt-br");
const Vendas: React.FC = () => {
  const [activePage, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sales, setSales] = useState<Sale[]>([]);
  const [date, setSelectedDate] = useState<Date | null>(new Date());
  const [activeSaleDate, setActiveSaleDate] = useState<Date | null>(new Date());
  const [opened, setOpened] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [dailyTotal, setDailyTotal] = useState(0);
  const [registeredDailyTotal, setRegisteredDailyTotal] = useState(0);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [pdfStatusMessage, setPdfStatusMessage] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [extractedPdfData, setExtractedPdfData] =
    useState<ExtractedPdfData | null>(null);
  const [pdfExtractedSales, setPdfExtractedSales] = useState<
    PdfExtractedSale[]
  >([]);
  const [pdfWindowOpened, setPdfWindowOpened] = useState(false);
  const [isReadingPdf, setIsReadingPdf] = useState(false);
  const [selectedPdfName, setSelectedPdfName] = useState<string | null>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // run side effect whenever drawer becomes opened
  useEffect(() => {
    if (opened) {
      // your function when opened
      setActiveSaleDate(activeSale ? new Date(activeSale.date) : new Date());
    }
  }, [opened]);

  const fetchSale = async (currentPage = 1) => {
    const skip = (currentPage - 1) * PAGE_SIZE;

    const response = await axios.get("http://localhost:5000/sales/registered", {
      params: {
        date,
        limit: PAGE_SIZE,
        skip,
      },
    });

    const { sales, numberSales, dailyTotal, registeredDailyTotal } =
      response.data as {
        sales: Sale[];
        numberSales: number;
        dailyTotal: number;
        registeredDailyTotal: number;
      };
    const salesWithOriginalTotal: Sale[] = sales.map(
      (sale): Sale => ({
        ...sale,
        originalTotal: sale.products.reduce((total, item) => {
          const basePrice = item.originalPrice || item.price;
          return total + basePrice * item.quantity;
        }, 0),
        paidAmount: 0,
        changeAmount: 0,
        paidAmountManual: false,
        paymentMethod: "01",
        isPdfMatched: false,
        pdfMatchedLine: null,
      }),
    );

    const matchedSales = applyPdfMatchesToSales(
      salesWithOriginalTotal,
      extractedPdfData,
      date,
    );
    setSales(matchedSales);
    setPdfExtractedSales((previousPdfSales) => {
      const selectedDayPdfSales = buildPdfExtractedSales(
        extractedPdfData,
        date,
        previousPdfSales,
      );
      return mergePdfMatches(selectedDayPdfSales, matchedSales);
    });
    setTotalPages(Math.ceil(numberSales / PAGE_SIZE));
    setDailyTotal(dailyTotal);
    setRegisteredDailyTotal(registeredDailyTotal || 0);
  };

  const handleConfirmClick = async () => {
    await fetchSale();
  };

  const validateSale = (sale: Sale) => {
    if (sale.products.length === 0) {
      return false;
    }
    if (getAdjustedSaleTotal(sale) == 0) {
      return false;
    }
  
    return true;
  };

  const handlePageChange = async (page: number) => {
    setPage(page);
    await fetchSale(page);
  };

  const handlePickPdf = () => {
    pdfInputRef.current?.click();
  };

  const handlePdfFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsReadingPdf(true);
      setPdfStatusMessage(null);

      const arrayBuffer = await file.arrayBuffer();
      const pdfDocument = await pdfjsLib.getDocument({
        data: new Uint8Array(arrayBuffer),
      }).promise;

      const allLines: string[] = [];

      for (
        let pageNumber = 1;
        pageNumber <= pdfDocument.numPages;
        pageNumber += 1
      ) {
        const page = await pdfDocument.getPage(pageNumber);
        const textContent = await page.getTextContent();
        const pageLines: string[] = [];
        const currentParts: string[] = [];

        textContent.items.forEach((item) => {
          const contentItem = item as { str?: string; hasEOL?: boolean };
          const value = contentItem.str?.trim();
          if (!value) return;

          currentParts.push(value);
          if (contentItem.hasEOL) {
            pageLines.push(currentParts.join(" ").trim());
            currentParts.length = 0;
          }
        });

        if (currentParts.length > 0) {
          pageLines.push(currentParts.join(" ").trim());
        }

        allLines.push(...pageLines);
      }

      const extractedData = {
        vendas: extractLinesFromRawText(allLines.join("\n")),
      };

      setExtractedPdfData(extractedData);
      const matchedSales = applyPdfMatchesToSales(sales, extractedData, date);
      setSales(matchedSales);
      setPdfExtractedSales(
        mergePdfMatches(
          buildPdfExtractedSales(extractedData, date),
          matchedSales,
        ),
      );
      setSelectedPdfName(file.name);
      setPdfStatusMessage({
        type: "success",
        message: `PDF lido com sucesso: ${extractedData.vendas.length} venda(s) extraída(s).`,
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Falha ao ler o PDF";
      setExtractedPdfData(null);
      setPdfExtractedSales([]);
      setPdfWindowOpened(false);
      setSales((previousSales) =>
        applyPdfMatchesToSales(previousSales, null, date),
      );
      setSelectedPdfName(null);
      setPdfStatusMessage({
        type: "error",
        message: `Erro ao processar PDF: ${errorMessage}`,
      });
    } finally {
      setIsReadingPdf(false);
      event.target.value = "";
    }
  };

  const handleClearPdf = () => {
    setExtractedPdfData(null);
    setPdfExtractedSales([]);
    setPdfWindowOpened(false);
    setSales((previousSales) =>
      applyPdfMatchesToSales(previousSales, null, date),
    );
    setSelectedPdfName(null);
    setPdfStatusMessage(null);
  };

  const updateSale = (saleId: string, updater: (sale: Sale) => Sale) => {
    setSales((previousSales) =>
      previousSales.map((sale) => (sale.id === saleId ? updater(sale) : sale)),
    );
  };

  const updateSaleProduct = (
    saleId: string,
    productIndex: number,
    updater: (product: Product) => Product,
    recalculateCashTotals = false,
  ) => {
    updateSale(saleId, (sale) => {
      const updatedProducts = sale.products.map((product, index) =>
        index === productIndex ? updater(product) : product,
      );
      const updatedSale = { ...sale, products: updatedProducts };
      return recalculateCashTotals ? withCashTotals(updatedSale) : updatedSale;
    });
  };

  const handleChangeSalePaymentMethod = (
    saleId: string,
    paymentMethod: PaymentMethodCode,
  ) => {
    updateSale(saleId, (sale) => withCashTotals({ ...sale, paymentMethod }));
  };

  const handleChangePaidAmount = (
    saleId: string,
    paidAmount: number | string,
  ) => {
    const parsedPaidAmount = clampNumericField(paidAmount);

    updateSale(saleId, (sale) => {
      const adjustedTotal = getAdjustedSaleTotal(sale);
      return {
        ...sale,
        paidAmount: parsedPaidAmount,
        paidAmountManual: true,
        changeAmount: Math.max(parsedPaidAmount - adjustedTotal, 0),
      };
    });
  };

  const handleSendSale = async () => {
    if (!activeSale) return;

    try {
      setStatusMessage(null);

      // Build NFCe payload with selected alternatives
      // Note: If an alternative was selected, product.id/name/price will already be updated
      // to the alternative's data by handleReplaceItem, so this sends the selected product
      const nfcePayload = {
        originalSaleId: activeSale.id,
        total: activeAdjustedTotal,
        paid_amount: activeSale.paidAmount || activeAdjustedTotal,
        change_amount: activeSale.changeAmount,
        date: activeSaleDate || activeSale.date,
        payment_method: activeSale.paymentMethod,
        products: activeSale.products.flatMap((item) => {
          if (item.ignored || item.hasSplitChildren) return [];
          if (item.stockStatus === "red") return [];
          return [productToNfceItem(item, getProductQuantityForTotal(item))];
        }),
      };


      // Step 1: Register the sale in database and get saleId
      let registerResponse;
      try {
        registerResponse = await axios.post(
          "http://localhost:5000/sales/registered",
          nfcePayload,
          { headers: { "Content-Type": "application/json" } },
        );
      } catch (registerError: any) {
        // Handle duplicate sale error (409)
        if (registerError.response?.status === 409) {
          const existingSaleId = registerError.response?.data?.saleId;
          setStatusMessage({
            type: "error",
            message: `This sale has already been registered as sale #${existingSaleId}. Cannot register the same sale twice.`,
          });
          return;
        }
        throw registerError;
      }

      if (registerResponse.status !== 200) {
        throw new Error("Failed to register sale in database");
      }

      const { saleId, registeredSaleId } = registerResponse.data;

      // Step 2: Send to NFCe service with the numeric numero_nota
      const nfcePayloadWithSaleId = {
        ...nfcePayload,
        numero_nota: saleId.toString(),
      };

      try {
        const nfceResult = await axios.post(
          "http://localhost:8000/emitir-nfce",
          nfcePayloadWithSaleId,
          {
            headers: {
              "Content-Type": "application/json",
            },
          },
        );

        if (nfceResult.status === 200) {
          await axios.put(`http://localhost:5000/sales/registered/${saleId}`, {
            nfcecode: nfceResult.data.chave_acesso,
          });
          updateSale(activeSale.id, (sale) => ({
            ...sale,
            isRegistered: true,
            registeredSaleId: registerResponse.data.registeredSaleId,
            registeredSaleInfo: {
              saleId: registerResponse.data.saleId,
              total: registerResponse.data.total,
              nfcecode: nfceResult.data.chave_acesso,
            },
          }));

          setStatusMessage({
            type: "success",
            message: `NFCe successfully issued! Sale ID: ${saleId}, Access Key: ${nfceResult.data.chave_acesso || "Generated"}`,
          });
          // Auto-dismiss success message after 5 seconds
          setTimeout(() => setStatusMessage(null), 5000);
        }
      } catch (nfceError: any) {
        // NFCe request failed - rollback the registered sale
        const errorMessage =
          nfceError.response?.data?.mensagem ||
          nfceError.message ||
          "Failed to issue NFCe";

        try {
          await axios.delete("http://localhost:5000/sales/registered", {
            data: { id: registeredSaleId },
          });
          updateSale(activeSale.id, (sale) => ({
            ...sale,
            isRegistered: false,
          }));
        } catch (rollbackError) {
          console.error("Rollback failed:", rollbackError);
        }

        setStatusMessage({
          type: "error",
          message: `NFCe Error: ${errorMessage}. Sale registration has been rolled back.`,
        });

        setTimeout(() => setStatusMessage(null), 10000);
      }
    } catch (error: any) {
      // Database registration failed
      const errorMessage =
        error.response?.data?.message || error.message || "An error occurred";
      setStatusMessage({
        type: "error",
        message: `Registration Error: ${errorMessage}`,
      });

      setTimeout(() => setStatusMessage(null), 5000);
    }
  };

  const handleReplaceItem = (
    saleId: string,
    productIndex: number,
    selectedAltId: string,
  ) => {
    updateSale(saleId, (sale) => {
      const updatedProducts = [...sale.products];
      const product = updatedProducts[productIndex];
      const altIndex = product.alternatives.findIndex(
        (a) => a.id === selectedAltId,
      );

      if (altIndex === -1) return sale;
      const selectedAlt = product.alternatives[altIndex];

      const trueOriginalName = product.originalName || product.name;
      const trueOriginalPrice = product.originalPrice || product.price;

      const currentAsAlternative: Alternative = {
        id: product.id,
        sku: product.sku,
        barcode: product.barcode,
        name: product.name,
        price: product.price,
        stock: product.stock || 0,
        fiscal: product.fiscal,
        isAddedAlternative: product.isAddedAlternative,
        quantity: product.alternativeQuantity,
        isOriginalItem: product.stockStatus === "red" || product.isOriginalItem,
      };

      const newAlternatives = [...product.alternatives];
      newAlternatives.splice(altIndex, 1);
      newAlternatives.push(currentAsAlternative);

      updatedProducts[productIndex] = {
        ...product,
        id: selectedAlt.id,
        sku: selectedAlt.sku || selectedAlt.id,
        barcode: selectedAlt.barcode || product.barcode,
        name: selectedAlt.name,
        price: selectedAlt.price,
        stock: selectedAlt.stock,
        stockStatus: selectedAlt.isOriginalItem ? "red" : "resolved",
        isRegistered: !selectedAlt.isOriginalItem,
        isOriginalItem: selectedAlt.isOriginalItem,
        ignored: false,
        isAddedAlternative: selectedAlt.isAddedAlternative,
        alternativeQuantity: 1,
        fiscal: selectedAlt.fiscal || product.fiscal,
        alternatives: newAlternatives,
        originalName: trueOriginalName,
        originalPrice: trueOriginalPrice,
      };

      return withCashTotals({ ...sale, products: updatedProducts });
    });
  };

  const handleToggleIgnoredProduct = (saleId: string, productIndex: number) => {
    updateSaleProduct(
      saleId,
      productIndex,
      (product) => ({ ...product, ignored: !product.ignored }),
      true,
    );
  };

  const handleAlternativeSearchField = (
    saleId: string,
    productIndex: number,
    field: "alternativeSearch" | "alternativePrice",
    value: string | number,
  ) => {
    const nextValue =
      field === "alternativePrice" ? clampNumericField(value) : value;

    updateSaleProduct(saleId, productIndex, (product) => ({
      ...product,
      [field]: nextValue,
    }));
  };

  const handleToggleAlternativeSearch = (
    saleId: string,
    productIndex: number,
  ) => {
    updateSaleProduct(saleId, productIndex, (product) => ({
      ...product,
      alternativeSearchOpened: !product.alternativeSearchOpened,
    }));
  };

  const handleSearchAlternatives = async (
    saleId: string,
    productIndex: number,
  ) => {
    const sale = sales.find((item) => item.id === saleId);
    const product = sale?.products[productIndex];
    if (!product) return;

    const response = await axios.get(
      "http://localhost:5000/registered-products",
      {
        params: {
          search: product.alternativeSearch || "",
          price: product.alternativePrice || "",
          limit: 20,
          sortBy: "stock",
          sortOrder: "desc",
        },
      },
    );

    const results = (response.data.products || []).map((registered: any) => ({
      id: String(registered._id),
      sku: String(registered.sku || registered._id),
      barcode: registered.barcode,
      name: registered.name,
      price: Number(registered.salePrice || 0),
      stock: Number(registered.stock || 0),
      isAddedAlternative: true,
      quantity: product.quantity,
      fiscal: registered.fiscal
        ? {
            ncm: registered.fiscal.ncm,
            cfop: registered.fiscal.cfopSale,
            unit: registered.unit,
            cest: registered.fiscal.cest,
            csosn: registered.fiscal.csosn,
            origin: registered.fiscal.origin,
          }
        : undefined,
    }));

    updateSaleProduct(saleId, productIndex, (product) => ({
      ...product,
      alternativeResults: results,
    }));
  };

  const handleAddAlternative = (
    saleId: string,
    productIndex: number,
    alternative: Alternative,
  ) => {
    if (alternative.stock <= 0) {
      setStatusMessage({
        type: "error",
        message: "Alternativa sem estoque disponível.",
      });
      setTimeout(() => setStatusMessage(null), 3000);
      return;
    }
    updateSaleProduct(saleId, productIndex, (product) => {
      if (product.alternatives.some((item) => item.id === alternative.id)) {
        return product;
      }

      return {
        ...product,
        alternatives: [...product.alternatives, alternative],
      };
    });
  };

  const handleSplitAlternative = (
    saleId: string,
    productIndex: number,
    alternative: Alternative,
  ) => {
    if (alternative.stock <= 0) {
      setStatusMessage({
        type: "error",
        message: "Alternativa sem estoque disponível.",
      });
      setTimeout(() => setStatusMessage(null), 3000);
      return;
    }
    updateSale(saleId, (sale) => {
      const updatedProducts = [...sale.products];
      const product = updatedProducts[productIndex];
      if (!product) return sale;

      const sourceKey =
        product.splitGroupKey || `${product.id}-${productIndex}-${Date.now()}`;
      const splitProduct: Product = {
        ...product,
        id: `${alternative.id}-${Date.now()}`,
        sku: alternative.sku || alternative.id,
        barcode: alternative.barcode || product.barcode,
        name: alternative.name,
        price: alternative.price,
        quantity: 1,
        stock: alternative.stock,
        stockStatus: "resolved",
        isRegistered: true,
        isOriginalItem: false,
        ignored: false,
        isAddedAlternative: true,
        isSplitProduct: true,
        splitParentKey: sourceKey,
        splitGroupKey: `${alternative.id}-${productIndex}-${Date.now()}`,
        hasSplitChildren: false,
        alternativeQuantity: 1,
        fiscal: alternative.fiscal || product.fiscal,
        alternatives: [],
        originalName: product.name,
        originalPrice: product.price,
        alternativeSearch: "",
        alternativePrice: "",
        alternativeResults: [],
      };

      updatedProducts[productIndex] = {
        ...product,
        ignored: false,
        splitGroupKey: sourceKey,
        hasSplitChildren: true,
      };
      updatedProducts.splice(productIndex + 1, 0, splitProduct);

      return withCashTotals({
        ...sale,
        products: refreshSplitParents(updatedProducts),
      });
    });
  };

  const handleRemoveSplitProduct = (saleId: string, productIndex: number) => {
    updateSale(saleId, (sale) => {
      const updatedProducts = sale.products.filter(
        (_, index) => index !== productIndex,
      );

      return withCashTotals({
        ...sale,
        products: refreshSplitParents(updatedProducts),
      });
    });
  };

  const handleRemoveAddedAlternative = (
    saleId: string,
    productIndex: number,
    alternativeId: string,
  ) => {
    updateSaleProduct(
      saleId,
      productIndex,
      (product) => ({
        ...product,
        alternatives: product.alternatives.filter(
          (alternative) => alternative.id !== alternativeId,
        ),
      }),
      true,
    );
  };

  const handleChangeAlternativeQuantity = (
    saleId: string,
    productIndex: number,
    quantity: number | string,
  ) => {
    const parsedQuantity = clampNumericField(quantity);

    updateSaleProduct(
      saleId,
      productIndex,
      (product) => ({
        ...product,
        alternativeQuantity: parsedQuantity,
      }),
      true,
    );
  };

  const handleViewSale = (saleId: string) => {
    setSelectedSaleId(saleId);
    setOpened(true);
  };

  const activeSale = sales.find((s) => s.id === selectedSaleId);
  const activeCounters = activeSale
    ? getSaleStatusCounters(activeSale)
    : { actionRequiredCount: 0, resolvedCount: 0 };

  let activeOriginalTotal = 0;
  let activeAdjustedTotal = 0;
  if (activeSale) {
    activeOriginalTotal = activeSale.originalTotal;
    activeAdjustedTotal = getAdjustedSaleTotal(activeSale);
  }

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        <Group justify="space-between" align="flex-end">
          <Box>
            <Title order={1} fw={900} lts="-0.5px">
              Vendas
            </Title>
            <Text fw={700} mt={6}>
              Total: {formatMoney(dailyTotal)}
            </Text>
            <Text fw={700} mt={4} c="green">
              Registradas: {formatMoney(registeredDailyTotal)}
            </Text>
          </Box>

          <Group align="flex-end">
            <DateTimePicker
              valueFormat="DD MMM YYYY hh:mm A"
              leftSection={<IconCalendar size={18} stroke={1.5} />}
              label=""
              placeholder="Pick date and time"
              value={date}
              onChange={setSelectedDate}
              w={280}
              submitButtonProps={{
                onClick: handleConfirmClick,
                "aria-label": "Confirm date and time",
              }}
            />
            <Button onClick={handlePickPdf} loading={isReadingPdf}>
              Ler PDF
            </Button>
            <Button
              variant="light"
              color="gray"
              onClick={handleClearPdf}
              disabled={!extractedPdfData}
            >
              Limpar PDF
            </Button>
            <input
              ref={pdfInputRef}
              type="file"
              accept="application/pdf"
              style={{ display: "none" }}
              onChange={handlePdfFileChange}
            />
          </Group>
        </Group>
        {selectedPdfName && (
          <Text size="sm" fw={600} c="blue">
            PDF selecionado: {selectedPdfName}
          </Text>
        )}
        {pdfStatusMessage && (
          <Paper
            p="md"
            radius="md"
            bg={
              pdfStatusMessage.type === "success"
                ? "var(--mantine-color-blue-light)"
                : "var(--mantine-color-red-light)"
            }
            style={{
              border: `1px solid ${pdfStatusMessage.type === "success" ? "var(--mantine-color-blue-5)" : "var(--mantine-color-red-5)"}`,
            }}
          >
            <Group justify="space-between" gap="sm">
              <Text
                size="sm"
                fw={500}
                c={
                  pdfStatusMessage.type === "success"
                    ? "var(--mantine-color-blue-7)"
                    : "var(--mantine-color-red-7)"
                }
              >
                {pdfStatusMessage.message}
              </Text>
              {extractedPdfData && (
                <Button
                  variant="subtle"
                  size="compact-sm"
                  onClick={() => setPdfWindowOpened(true)}
                >
                  Ver dados extraídos
                </Button>
              )}
            </Group>
          </Paper>
        )}
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
          {sales.map((sale) => (
            <VendasSaleCard
              key={sale.id}
              sale={sale}
              onViewSale={handleViewSale}
            />
          ))}
        </SimpleGrid>

        {totalPages > 1 && (
          <Group justify="center">
            <Pagination
              total={totalPages}
              value={activePage}
              onChange={handlePageChange}
              color="blue"
              radius="md"
            />
          </Group>
        )}
      </Stack>

      <PdfExtractedSalesModal
        opened={pdfWindowOpened}
        onClose={() => setPdfWindowOpened(false)}
        pdfExtractedSales={pdfExtractedSales}
      />

      <Drawer
        opened={opened}
        onClose={() => setOpened(false)}
        position="right"
        size="lg"
        title={
          <Group gap="sm">
            <Title order={3}>Detalhes</Title>
            <Badge size="lg" radius="sm">
              {activeSale?.id}
            </Badge>
          </Group>
        }
        scrollAreaComponent={ScrollArea.Autosize}
      >
        {activeSale && (
          <Stack gap="md" pb="xl">
            <Paper withBorder p="md">
              <Group justify="space-between" align="flex-start">
                <Box>
                  <Text size="sm" c="dimmed">
                    Data e Hora
                  </Text>
                  <DateTimePicker
                    valueFormat="DD MMM YYYY hh:mm:ss A"
                    leftSection={<IconCalendar size={18} stroke={1.5} />}
                    label=""
                    locale="pt-br"
                    placeholder="Pick date and time"
                    value={activeSaleDate}
                    onChange={(value) => {
                      if (!value) {
                        setActiveSaleDate(new Date());
                        return;
                      }
                    
                      // incoming value is a Date (from DatePicker)
                      const newDate = new Date(value); // copy
                    
                      // get previous seconds from activeSale.date (handle string or Date)
                      const prev = new Date(activeSale.date);
                      newDate.setSeconds(prev.getSeconds(), prev.getMilliseconds());
                    
                      setActiveSaleDate(newDate);
                    }}
                    w={280}
                    
                  />
                
                </Box>
                <Stack gap={0} align="flex-end">
                  {activeOriginalTotal !== activeAdjustedTotal && (
                    <Text size="sm" c="dimmed">
                      Orig: ${activeOriginalTotal.toFixed(2)}
                    </Text>
                  )}
                  <Text size="xl" fw={800} c="blue">
                    Total: {formatMoney(activeAdjustedTotal)}
                  </Text>
                </Stack>
              </Group>

              <Box>
                {activeSale?.isRegistered && activeSale?.registeredSaleInfo && (
                  <Text size="sm" fw={600} c="green" mt="xs">
                    NFCe #{activeSale.registeredSaleInfo.saleId}:{" "}
                    {activeSale.registeredSaleInfo.nfcecode
                      ? activeSale.registeredSaleInfo.nfcecode
                      : ""}
                  </Text>
                )}
              </Box>
            </Paper>

            <Group justify="space-between" align="flex-end" mt="md" gap="md">
              <Select
                label="Método de Pagamento"
                placeholder="Selecione"
                value={activeSale.paymentMethod}
                onChange={(val) =>
                  handleChangeSalePaymentMethod(
                    activeSale.id,
                    toPaymentMethodCode(val),
                  )
                }
                data={PAYMENT_METHOD_OPTIONS}
              />
              {activeSale.paymentMethod === "01" && (
                <>
                  <NumberInput
                    label="Pago"
                    value={activeSale.paidAmount}
                    onChange={(value) =>
                      handleChangePaidAmount(activeSale.id, value)
                    }
                    allowNegative={false}
                    max={MAX_NUMERIC_FIELD}
                    decimalScale={2}
                    fixedDecimalScale
                    allowedDecimalSeparators={[","]}
                    hideControls
                    prefix="R$ "
                    w={130}
                  />
                  <Box>
                    <Text size="sm" c="dimmed">
                      Troco
                    </Text>
                    <Text fw={700}>{formatMoney(activeSale.changeAmount)}</Text>
                  </Box>
                </>
              )}
              <Button
                mt={"lg"}
                onClick={handleSendSale}
                disabled={
                  !validateSale(activeSale) ||
                  activeSale?.isRegistered ||
                  activeCounters.actionRequiredCount > 0
                }
                title={
                  activeSale?.isRegistered
                    ? "Esta venda já foi registrada em NFCe"
                    : activeCounters.actionRequiredCount > 0
                      ? `Resolva os ${activeCounters.actionRequiredCount} erro(s) primeiro`
                      :  "Enviar para NFCe"
                }
              >
                {activeSale?.isRegistered
                  ? "Já registrada"
                  : activeCounters.actionRequiredCount > 0
                    ? `${activeCounters.actionRequiredCount} Erros na venda `
                    : "Enviar"}
              </Button>
            </Group>

            {statusMessage && (
              <Paper
                p="md"
                radius="md"
                bg={
                  statusMessage.type === "success"
                    ? "var(--mantine-color-green-light)"
                    : "var(--mantine-color-red-light)"
                }
                style={{
                  marginTop: "16px",
                  border: `1px solid ${statusMessage.type === "success" ? "var(--mantine-color-green-5)" : "var(--mantine-color-red-5)"}`,
                }}
              >
                <Text
                  size="sm"
                  fw={500}
                  c={
                    statusMessage.type === "success"
                      ? "var(--mantine-color-green-7)"
                      : "var(--mantine-color-red-7)"
                  }
                >
                  {statusMessage.message}
                </Text>
              </Paper>
            )}

            <Divider my="sm" />

            {activeSale.products.map((item, index) => {
              const quantityForTotal = getProductQuantityForTotal(item);
              const lineTotal = getProductDisplayLineTotal(item);
              const addedAlternatives = item.alternatives
                ? item.alternatives.filter(
                    (alternative) => alternative.isAddedAlternative,
                  )
                : [];
              const canManageAlternatives =
                item.stockStatus === "red" || item.isAddedAlternative || item.ignored;

              const selectOptions = [
                {
                  value: item.id,
                  label: `${item.name} (${formatMoney(item.price)}/un)${item.isAddedAlternative ? " — Adicionada" : ""}`,
                },
                ...(item.alternatives?.map((alt) => ({
                  value: alt.id,
                  label: `${alt.name} (${formatMoney(alt.price)}/un) — ${
                    alt.isOriginalItem
                      ? "Voltar ao Original"
                      : alt.isAddedAlternative
                        ? "Adicionada"
                        : `Estoque: ${alt.stock}`
                  }`,
                })) || []),
              ];

              let bg = "transparent";
              if (item.ignored) bg = "var(--mantine-color-gray-light)";
              else if (item.stockStatus === "red")
                bg = "var(--mantine-color-red-light)";
              else if (item.stockStatus === "resolved")
                bg = "var(--mantine-color-blue-light)";

              return (
                <Paper withBorder p="sm" key={`${item.id}-${index}`} bg={bg}>
                  <Group
                    justify="space-between"
                    wrap="nowrap"
                    align="flex-start"
                  >
                    <Box style={{ flex: 1 }}>
                      <Group gap="xs" mb={4}>
                        <Badge
                          variant="filled"
                          color="gray"
                          size="sm"
                          radius="sm"
                        >
                          {item.isAddedAlternative
                            ? item.alternativeQuantity
                            : item.quantity}
                          x
                        </Badge>

                        <Text
                          size="sm"
                          fw={600}
                          td={
                            item.stockStatus === "red" ? "line-through" : "none"
                          }
                          c={getStatusColor(item.stockStatus)}
                        >
                          {item.name.length > 40
                            ? `${item.name.substring(0, 40)}...`
                            : item.name}
                        </Text>

                        {item.stockStatus === "red" && (
                          <Text size="xs" c="red" fw={500}>
                            (Sem registro)
                          </Text>
                        )}
                        {item.ignored && (
                          <Text size="xs" c="gray" fw={500}>
                            (Ignorado)
                          </Text>
                        )}
                        {item.hasSplitChildren && (
                          <Text size="xs" c="blue" fw={500}>
                            (Dividido)
                          </Text>
                        )}
                        {item.isSplitProduct && (
                          <Text size="xs" c="blue" fw={500}>
                            (Parte)
                          </Text>
                        )}

                        {item.isRegistered && !activeSale?.isRegistered && (
                          <Badge
                            size="xs"
                            variant="light"
                            color={getStatusColor(item.stockStatus)}
                          >
                            Estoque: {item.stock}
                          </Badge>
                        )}
                      </Group>

                      {item.stockStatus === "resolved" && (
                        <Text size="xs" c="dimmed" mt={4} mb={8}>
                          Original: {item.originalName} (
                          {formatMoney(item.originalPrice)}/un)
                        </Text>
                      )}

                      {item.alternatives?.length > 0 && (
                        <Group gap="xs" align="flex-end" mt={8}>
                          <NumberInput
                            size="xs"
                            value={item.alternativeQuantity}
                            onChange={(value) =>
                              handleChangeAlternativeQuantity(
                                activeSale.id,
                                index,
                                value,
                              )
                            }
                            allowNegative={false}
                            max={MAX_NUMERIC_FIELD}
                            decimalScale={3}
                            allowedDecimalSeparators={[","]}
                            hideControls
                            w={45}
                          />
                          {
                            selectOptions.length > 0 && (
                              <Select
                                size="xs"
                                value={item.id}
                                data={selectOptions}
                                leftSection={<IconReplace size={14} />}
                              mt={8}
                              w={414}
                                searchable
                                allowDeselect={false}
                                onChange={(val) => {
                                  if (val && val !== item.id)
                                    handleReplaceItem(activeSale.id, index, val);
                                }}
                              />
                            )}

                        </Group>
                      )}

                      

                      {canManageAlternatives && (
                        <Stack gap="xs" mt={8}>
                          <Button
                            size="xs"
                            variant="light"
                            onClick={() =>
                              handleToggleAlternativeSearch(
                                activeSale.id,
                                index,
                              )
                            }
                          >
                            {item.alternativeSearchOpened
                              ? "Ocultar busca"
                              : "Buscar alternativas"}
                          </Button>

                          {item.alternativeSearchOpened && (
                            <>
                              <Group gap="xs" align="flex-end">
                                <TextInput
                                  size="xs"
                                  label="Buscar alternativa"
                                  value={item.alternativeSearch || ""}
                                  onChange={(event) =>
                                    handleAlternativeSearchField(
                                      activeSale.id,
                                      index,
                                      "alternativeSearch",
                                      event.currentTarget.value,
                                    )
                                  }
                                  style={{ flex: 1 }}
                                />
                                <NumberInput
                                  size="xs"
                                  label="Preço"
                                  value={item.alternativePrice || ""}
                                  onChange={(value) =>
                                    handleAlternativeSearchField(
                                      activeSale.id,
                                      index,
                                      "alternativePrice",
                                      value || "",
                                    )
                                  }
                                  allowNegative={false}
                                  max={MAX_NUMERIC_FIELD}
                                  decimalScale={2}
                                  allowedDecimalSeparators={[","]}
                                  hideControls
                                  prefix="R$ "
                                  w={110}
                                />
                                <Button
                                  size="xs"
                                  variant="light"
                                  onClick={() =>
                                    handleSearchAlternatives(
                                      activeSale.id,
                                      index,
                                    )
                                  }
                                >
                                  Buscar
                                </Button>
                              </Group>

                              {(item.alternativeResults || []).map(
                                (alternative) => (
                                  <Group
                                    key={alternative.id}
                                    justify="space-between"
                                    gap="xs"
                                  >
                                    <Text size="xs" lineClamp={1}>
                                      {alternative.stock} x {" "}
                                      {alternative.name.length>45? alternative.name.substring(0,45) : alternative.name} -{" "}
                                      {formatMoney(alternative.price)}
                                    </Text>
                                    <ActionIcon
                                      size="sm"
                                      variant="subtle"
                                      onClick={() =>
                                        handleAddAlternative(
                                          activeSale.id,
                                          index,
                                          alternative,
                                        )
                                      }
                                      aria-label="Adicionar alternativa"
                                    >
                                      <IconPlus size={14} />
                                    </ActionIcon>
                                    <ActionIcon
                                      size="sm"
                                      variant="subtle"
                                      color="blue"
                                      onClick={() =>
                                        handleSplitAlternative(
                                          activeSale.id,
                                          index,
                                          alternative,
                                        )
                                      }
                                      aria-label="Dividir com alternativa"
                                    >
                                      <IconColumns size={14} />
                                    </ActionIcon>
                                  </Group>
                                ),
                              )}
                            </>
                          )}

                          {addedAlternatives.map((alternative) => (
                            <Group
                              key={alternative.id}
                              justify="space-between"
                              gap="xs"
                            >
                              <Text size="xs" c="dimmed" lineClamp={1}>
                                Adicionada: {alternative.name}
                              </Text>
                              <ActionIcon
                                size="sm"
                                variant="subtle"
                                color="red"
                                onClick={() =>
                                  handleRemoveAddedAlternative(
                                    activeSale.id,
                                    index,
                                    alternative.id,
                                  )
                                }
                                aria-label="Remover alternativa"
                              >
                                <IconTrash size={14} />
                              </ActionIcon>
                            </Group>
                          ))}
                        </Stack>
                      )}
                    </Box>

                    <Stack gap={0} align="flex-end">
                      {item.isSplitProduct && (
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          onClick={() =>
                            handleRemoveSplitProduct(activeSale.id, index)
                          }
                          aria-label="Remover produto dividido"
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      )}
                      {!activeSale.isRegistered &&  !item.isSplitProduct && (
                        <ActionIcon
                          variant="subtle"
                          color={item.ignored ? "blue" : "gray"}
                          onClick={() =>
                            handleToggleIgnoredProduct(activeSale.id, index)
                          }
                          aria-label={
                            item.ignored
                              ? "Restaurar produto"
                              : "Ignorar produto"
                          }
                        >
                          {item.ignored ? (
                            <IconRestore size={16} />
                          ) : (
                            <IconTrash size={16} />
                          )}
                        </ActionIcon>
                      )}
                      <Text ff="monospace" fw={700}>
                        {formatMoney(lineTotal)}
                      </Text>
                      {quantityForTotal !== 1 && (
                        <Text size="xs" c="dimmed">
                          {quantityForTotal} x {formatMoney(item.price)}
                        </Text>
                      )}
                    </Stack>
                  </Group>
                </Paper>
              );
            })}
          </Stack>
        )}
      </Drawer>
    </Container>
  );
};

export default Vendas;
