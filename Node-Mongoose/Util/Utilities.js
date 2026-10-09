import mongoose from "mongoose";

async function isMongoOnline() {
  if (!mongoose.connection.db) return false;

  try {
    const status = await Promise.race([
      mongoose.connection.db.admin().ping(),
      new Promise((resolve) => setTimeout(() => resolve(null), 200)),
    ]);
    return status?.ok === 1;
  } catch (error) {
    return false;
  }
}

const toDecimal128 = (value) =>
  mongoose.Types.Decimal128.fromString(
    String(value ?? 0)
      .replace(",", ".")
      .trim(),
  );

function getDecimalPlaces(num) {
  const numString = num.toString();

  // If there is no decimal point, return 0
  if (!numString.includes('.')) return 0;

  // Split at the dot and look at the right side length
  return numString.split('.')[1].length;
}

function getProductKey(product) {
  const barcode = product.cEAN ?? product.barcode;
  
  if (hasValidBarcode(barcode)) {
    return `barcode:${barcode}`;
  }

  const ncm = product.ncm ?? product.fiscal?.ncm;
  const name = product.xProd ?? product.name;

  return `name-ncm:${name}:${ncm}`;
}


function safeRound(value, decimals) {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor);
}

const safeSum = (a, b) => (Math.round(a * 1000) + Math.round(b * 1000)) / 1000;

const hasValidBarcode = (value) => value && value !== "SEM GTIN";

const buildFiscalDefaults = (fiscal) => ({
  ncm: fiscal?.ncm,
  cest: fiscal?.cest || null,
  cfopSale: fiscal?.cfopSale || "5102",
  origin: fiscal?.origin || "0",
  csosn: fiscal?.csosn || "102",
  cBenef: fiscal?.cBenef || null,
  cstPis: fiscal?.cstPis || null,
  cstCofins: fiscal?.cstCofins || null,
  indTot: fiscal?.indTot || "1",
});

const buildTaxFutureDefaults = (taxFuture) => ({
  ibsCbsCst: taxFuture?.ibsCbsCst || null,
  cClassTrib: taxFuture?.cClassTrib || null,
});

const toNumber = (value) => Number(String(value ?? 0).replace(",", "."));

const extractFactorFromName = (name) => {
  const text = String(name || "");
  const withSlash = text.match(/\bc\s*\/\s*(\d+)\b/i);
  if (withSlash) {
    return Number(withSlash[1]);
  }
  const witGrams = text.match(/\b(\d+)\s*g\b/i);
  if (witGrams) {
    return Number(witGrams[1]);
  }

  const withUnit = text.match(/\b(\d+)\s*UNI?\b/i);
  return withUnit ? Number(withUnit[1]) : 0;
};

const getEffectiveStock = (stock, stockTrib, unit, unitTrib, costPrice, costPriceTrib, name) => {
  const toLowerCaseName = String(name).toLowerCase();
  const stockNumber = toNumber(stock);
  const stockTribNumber = toNumber(stockTrib);
  const unitText = String(unit).toUpperCase();
  const unitTribText = String(unitTrib).toUpperCase();
  const sameUnit = unitText === unitTribText && unitText !== "" && unitTribText !== "NULL" && unitText !== "UNDEFINED";
  const stockTribDiffers = stockTribNumber !== stockNumber;
  const fallbackStock = stockTribDiffers && stockTribNumber ? stockTribNumber : stockNumber || 0;

  const getValidStock = (value) => {
    if (!Number.isFinite(value) || value <= 0) {
      return null;
    }

    if (stockTribDiffers && stockTribNumber && value < stockTribNumber) {
      return null;
    }

    return value;
  };  

  if (unitText.includes("CX")) {
    return getValidStock(stockNumber) ?? fallbackStock;
  }

  if (!sameUnit && unitText.includes("KG")) {
    console.log("Unit is KG and units differ, extracting stock from name:", name);
    const amountPerBox = extractFactorFromName(toLowerCaseName) || 1000; // Default to 1000 if no factor is found
    const stockFromName = (stockTribNumber * 1000) / amountPerBox;

    console.log("Extracted stock from name:", stockFromName, "Amount per box:", amountPerBox, "Stock number:", stockNumber);
    return getValidStock(stockFromName) ?? fallbackStock;
  }
  
  if (!sameUnit) {
    const factor = toNumber(costPrice) / toNumber(costPriceTrib);
    const effectiveStock = factor * stockNumber;

    if (unitTribText.includes("UN")) {
      return getValidStock(Math.floor(effectiveStock)) ?? fallbackStock;
    }

    if (unitTribText.includes("KG")) {
      return getValidStock(effectiveStock) ?? fallbackStock;
    }
  }

  return fallbackStock;
};

export {
  buildFiscalDefaults,
  buildTaxFutureDefaults,
  getEffectiveStock,
  getDecimalPlaces,
  getProductKey,
  hasValidBarcode,
  isMongoOnline,
  safeRound,
  safeSum,
  toDecimal128
};
