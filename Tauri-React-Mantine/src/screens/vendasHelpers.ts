import type {
  Alternative,
  ExtractedPdfData,
  ParsedPdfLine,
  PaymentMethodCode,
  PdfExtractedSale,
  Product,
  Sale,
} from "./vendasTypes";

export const PAGE_SIZE = 12;
export const PDF_MATCH_WINDOW_MINUTES = 10;
export const PDF_MATCH_WINDOW_MS = PDF_MATCH_WINDOW_MINUTES * 60 * 1500;
export const MAX_NUMERIC_FIELD = 9999;

export const PAYMENT_METHOD_OPTIONS = [
  { value: "01", label: "Dinheiro" },
  { value: "02", label: "Cartão de Crédito" },
  { value: "03", label: "Cartão de Débito" },
  { value: "17", label: "PIX" },
];

const normalizeMoneyStringToNumber = (value: string) =>
  Number(value.replace(/\./g, "").replace(",", "."));

const normalizePaymentLabel = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const paymentLabelToCode = (value: string): PaymentMethodCode => {
  const normalized = normalizePaymentLabel(value);
  if (normalized.includes("credito")) return "02";
  if (normalized.includes("debito")) return "03";
  if (normalized.includes("pix")) return "17";
  return "01";
};

export const toPaymentMethodCode = (
  value: string | null | undefined,
): PaymentMethodCode => {
  if (value === "02" || value === "03" || value === "17") return value;
  return "01";
};

export const paymentCodeToLabel = (value: PaymentMethodCode) => {
  if (value === "02") return "Crédito";
  if (value === "03") return "Débito";
  if (value === "17") return "Pix";
  return "Dinheiro";
};

const getLikelyPaidAmount = (total: number) => {
  if (total <= 0) return 0;
  const roundedTotal = Math.ceil(total);
  const commonAmounts = [1, 2, 5, 10, 20, 50, 100, 200];
  const commonAmount = commonAmounts.find((amount) => amount >= total);
  if (commonAmount) return commonAmount;
  return Math.min(Math.ceil(roundedTotal / 100) * 100, MAX_NUMERIC_FIELD);
};

export const getProductQuantityForTotal = (product: Product) =>
  product.isAddedAlternative
    ? Number(product.alternativeQuantity ?? product.quantity ?? 0)
    : product.quantity;

export const clampNumericField = (value: number | string) => {
  const parsedValue = Number(String(value || 0).replace(",", "."));
  if (Number.isNaN(parsedValue)) return 0;
  return Math.min(Math.max(parsedValue, 0), MAX_NUMERIC_FIELD);
};

export const getProductLineTotal = (product: Product) => {
  if (product.ignored || product.hasSplitChildren) return 0;
  if (product.stockStatus === "red") return 0;
  return product.price * getProductQuantityForTotal(product);
};

export const getProductDisplayLineTotal = (product: Product) => {
  if (product.ignored || product.hasSplitChildren) return 0;
  return product.price * getProductQuantityForTotal(product);
};

export const getAdjustedSaleTotal = (sale: Sale) =>
  sale.products.reduce((total, item) => {
    return total + getProductLineTotal(item);
  }, 0);

export const withCashTotals = (sale: Sale): Sale => {
  if (sale.paymentMethod !== "01") {
    return { ...sale, paidAmount: 0, changeAmount: 0 };
  }

  const adjustedTotal = getAdjustedSaleTotal(sale);
  const paidAmount = sale.paidAmountManual
    ? clampNumericField(sale.paidAmount)
    : getLikelyPaidAmount(adjustedTotal);
  return {
    ...sale,
    paidAmount,
    changeAmount: Math.max(paidAmount - adjustedTotal, 0),
  };
};

export const getSaleStatusCounters = (sale: Sale) =>
  sale.products.reduce(
    (acc, product) => {
      if (product.ignored) return acc;
      if (product.hasSplitChildren) {
        acc.resolvedCount += 1;
        return acc;
      }
      if (product.stockStatus === "red") acc.actionRequiredCount += 1;
      if (product.stockStatus === "resolved") acc.resolvedCount += 1;
      return acc;
    },
    { actionRequiredCount: 0, resolvedCount: 0 },
  );

const parseDateTimeToTimestamp = (value: string) => {
  const match = value.match(/(\d{2})\/(\d{2})\/(\d{4})\s(\d{2}):(\d{2})/);
  if (!match) return null;
  const [, day, month, year, hour, minute] = match;
  const timestamp = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    0,
    0,
  ).getTime();

  return Number.isNaN(timestamp) ? null : timestamp;
};

const getDateKey = (value: Date | null) => {
  if (!value) return null;

  return [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, "0"),
    String(value.getDate()).padStart(2, "0"),
  ].join("-");
};

const isSameSelectedDay = (timestampMs: number, selectedDate: Date | null) => {
  const selectedDateKey = getDateKey(selectedDate);
  if (!selectedDateKey) return false;

  return getDateKey(new Date(timestampMs)) === selectedDateKey;
};

export const extractLinesFromRawText = (rawText: string) =>
  rawText
    .split("\n")
    .map((linha) => linha.trim())
    .filter(
      (linha) => linha.includes("R$") && /\d{2}\/\d{2}\/\d{4}/.test(linha),
    )
    .map((linha) => {
      const matchDataHora = linha.match(/\d{2}\/\d{2}\/\d{4}\s\d{2}:\d{2}/);
      const matchValor = linha.match(/R\$\s\d{1,3}(?:\.\d{3})*,\d{2}/);
      const matchTipo = linha.match(/(crédito|débito|pix)/i);

      if (!matchDataHora || !matchValor) return null;

      const tipoFormatado = matchTipo
        ? matchTipo[0].charAt(0).toUpperCase() +
          matchTipo[0].slice(1).toLowerCase()
        : "Dinheiro";

      return `${matchDataHora[0]} - ${matchValor[0]} - ${tipoFormatado}`;
    })
    .filter((linha): linha is string => Boolean(linha));

const parsePdfLine = (line: string, index: number): ParsedPdfLine | null => {
  const [datePart, amountPart, paymentPart = "Dinheiro"] = line
    .split(" - ")
    .map((part) => part.trim());

  if (!datePart || !amountPart) return null;

  const valueMatch = amountPart.match(/R\$\s?(\d{1,3}(?:\.\d{3})*,\d{2})/);
  if (!valueMatch) return null;
  const timestampMs = parseDateTimeToTimestamp(datePart);
  if (timestampMs === null) return null;

  return {
    id: `${timestampMs}-${valueMatch[1]}-${paymentLabelToCode(paymentPart)}-${index}`,
    timestampMs,
    dateTime: datePart,
    amount: normalizeMoneyStringToNumber(valueMatch[1]),
    paymentCode: paymentLabelToCode(paymentPart),
  };
};

export const buildPdfExtractedSales = (
  pdfData: ExtractedPdfData | null,
  selectedDate: Date | null,
  previousPdfSales: PdfExtractedSale[] = [],
) => {
  if (!pdfData || pdfData.vendas.length === 0) return [];

  const previousById = new Map(
    previousPdfSales.map((pdfSale) => [pdfSale.id, pdfSale]),
  );

  return pdfData.vendas
    .map(parsePdfLine)
    .filter((line): line is ParsedPdfLine => Boolean(line))
    .filter((line) => isSameSelectedDay(line.timestampMs, selectedDate))
    .sort((a, b) => a.timestampMs - b.timestampMs)
    .map((line): PdfExtractedSale => {
      const previous = previousById.get(line.id);
      return {
        ...line,
        isFound: previous?.isFound || false,
        matchedSaleId: previous?.matchedSaleId || null,
      };
    });
};

export const mergePdfMatches = (
  pdfSales: PdfExtractedSale[],
  matchedSales: Sale[],
) => {
  const matchedByPdfLineId = new Map(
    matchedSales
      .filter((sale) => sale.pdfMatchedLine?.id)
      .map((sale) => [sale.pdfMatchedLine?.id, sale.id]),
  );

  return pdfSales.map((pdfSale) => {
    const matchedSaleId = matchedByPdfLineId.get(pdfSale.id);
    if (!matchedSaleId) return pdfSale;

    return {
      ...pdfSale,
      isFound: true,
      matchedSaleId,
    };
  });
};

export const applyPdfMatchesToSales = (
  targetSales: Sale[],
  pdfData: ExtractedPdfData | null,
  selectedDate: Date | null,
): Sale[] => {
  if (!pdfData || pdfData.vendas.length === 0) {
    return targetSales.map(
      (sale): Sale =>
        withCashTotals({
          ...sale,
          paymentMethod: "01",
          isPdfMatched: false,
          pdfMatchedLine: null,
        }),
    );
  }

  const parsedLines = pdfData.vendas
    .map(parsePdfLine)
    .filter((line): line is ParsedPdfLine => Boolean(line));

  const availableLines = parsedLines
    .filter((line) => isSameSelectedDay(line.timestampMs, selectedDate))
    .map((line, index) => ({
      ...line,
      index,
      isUsed: false,
    }));

  return targetSales.map((sale): Sale => {
    const saleTimestamp = new Date(sale.date).getTime();
    if (Number.isNaN(saleTimestamp)) {
      return withCashTotals({
        ...sale,
        paymentMethod: "01",
        isPdfMatched: false,
        pdfMatchedLine: null,
      });
    }

    const amountCandidates = availableLines.filter((line) => {
      const sameAmount = Math.abs(line.amount - sale.originalTotal) < 0.01;
      const inWindow =
        Math.abs(line.timestampMs - saleTimestamp) <= PDF_MATCH_WINDOW_MS;
      return !line.isUsed && sameAmount && inWindow;
    });

    if (amountCandidates.length === 0) {
      return withCashTotals({
        ...sale,
        paymentMethod: "01",
        isPdfMatched: false,
        pdfMatchedLine: null,
      });
    }

    const closestLine = amountCandidates.sort((a, b) => {
      const diffA = Math.abs(a.timestampMs - saleTimestamp);
      const diffB = Math.abs(b.timestampMs - saleTimestamp);
      if (diffA !== diffB) return diffA - diffB;
      return a.index - b.index;
    })[0];

    const lineToConsume = availableLines.find(
      (line) => line.index === closestLine.index,
    );
    if (lineToConsume) lineToConsume.isUsed = true;

    return withCashTotals({
      ...sale,
      paymentMethod: closestLine.paymentCode,
      isPdfMatched: true,
      pdfMatchedLine: {
        id: closestLine.id,
        dateTime: closestLine.dateTime,
        amount: closestLine.amount,
        paymentMethod: closestLine.paymentCode,
      },
    });
  });
};

function numberToMoney(value: number | string) {
  value = String(value).replace(",", ".");
  return String(Number(value).toFixed(2)).replace(".", ",");
}

export function formatMoney(value: number | string) {
  if (value == 0) {
    return "R$ 0,0";
  }
  const srtValue = numberToMoney(value);
  return `R$ ${srtValue}`;
}

export const productToNfceItem = (
  item: Product | Alternative,
  quantity: number,
) => ({
  qtd: quantity,
  price: item.price,
  product_id: item.sku || item.id,
  barcode: item.barcode || "SEM GTIN",
  name: item.name,
  ncm: item.fiscal?.ncm,
  cfop: item.fiscal?.cfop,
  csosn: item.fiscal?.csosn || "102",
  origin: item.fiscal?.origin || "0",
  unit: item.fiscal?.unit || "UN",
});

export const refreshSplitParents = (products: Product[]) => {
  const parentKeys = new Set(
    products
      .map((product) => product.splitParentKey)
      .filter((key): key is string => Boolean(key)),
  );

  return products.map((product) => ({
    ...product,
    hasSplitChildren: product.splitGroupKey
      ? parentKeys.has(product.splitGroupKey)
      : false,
  }));
};

export const getStatusColor = (status: string) => {
  if (status === "red") return "red";
  if (status === "yellow") return "orange";
  if (status === "green") return "teal";
  if (status === "resolved") return "blue";
  return "gray";
};
