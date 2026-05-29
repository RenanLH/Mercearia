export interface FiscalInfo {
  ncm?: string;
  cfop?: string;
  unit?: string;
  cest?: string;
  csosn?: string;
  origin?: string;
}

export interface Alternative {
  id: string;
  sku?: string;
  barcode?: string;
  name: string;
  price: number;
  stock: number;
  isOriginalItem?: boolean;
  isAddedAlternative?: boolean;
  quantity?: number;
  fiscal?: FiscalInfo;
}

export interface Product {
  id: string;
  sku: string;
  product_id?: string;
  barcode?: string;
  name: string;
  ncm?: string;
  cfop?: string;
  price: number;
  quantity: number;
  qtd?: number;
  isRegistered: boolean;
  stockStatus: "green" | "yellow" | "red" | "resolved";
  stock?: number;
  originalName: string;
  originalPrice: number;
  isOriginalItem?: boolean;
  ignored?: boolean;
  isAddedAlternative?: boolean;
  alternativeQuantity?: number;
  alternatives: Alternative[];
  alternativeSearch?: string;
  alternativePrice?: number | string;
  alternativeResults?: Alternative[];
  alternativeSearchOpened?: boolean;
  isSplitProduct?: boolean;
  splitParentKey?: string;
  splitGroupKey?: string;
  hasSplitChildren?: boolean;
  fiscal?: FiscalInfo;
}

export interface Sale {
  id: string;
  date: string;
  products: Product[];
  originalTotal: number;
  paidAmount: number;
  changeAmount: number;
  paidAmountManual?: boolean;
  paymentMethod: PaymentMethodCode;
  isPdfMatched: boolean;
  pdfMatchedLine: {
    id: string;
    dateTime: string;
    amount: number;
    paymentMethod: PaymentMethodCode;
  } | null;
  isRegistered?: boolean;
  registeredSaleId?: string;
  registeredSaleInfo?: {
    saleId: number;
    total: string;
    nfcecode?: string
  };
}

export interface ExtractedPdfData {
  vendas: string[];
}

export interface ParsedPdfLine {
  id: string;
  timestampMs: number;
  dateTime: string;
  amount: number;
  paymentCode: PaymentMethodCode;
}

export interface PdfExtractedSale extends ParsedPdfLine {
  isFound: boolean;
  matchedSaleId: string | null;
}

export type PaymentMethodCode = "01" | "02" | "03" | "17";
