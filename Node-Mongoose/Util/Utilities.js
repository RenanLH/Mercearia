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

const extractStockFromName = (name) => {
  const text = String(name || "");
  const withSlash = text.match(/\bc\s*\/\s*(\d+)\b/i);
  if (withSlash) {
    return Number(withSlash[1]);
  }

  const withUnit = text.match(/\b(\d+)\s*UNI?\b/i);
  return withUnit ? Number(withUnit[1]) : 0;
};

const getEffectiveStock = (stock, stockTrib, unit, unitTrib, costPrice, costPriceTrib, name) => {
  const toLowerCaseName = String(name || "").toLowerCase();
  const stockNumber = toNumber(stock);
  const stockTribNumber = toNumber(stockTrib);
  const unitText = String(unit || "").toUpperCase();
  const unitTribText = String(unitTrib || "").toUpperCase();
  const sameUnit = unitText === unitTribText;
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

  if (sameUnit && unitText.includes("CX") && toNumber(costPrice) === toNumber(costPriceTrib)) {
    const amountPerBox = extractStockFromName(toLowerCaseName);
    const stockFromName = amountPerBox * stockNumber;
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

export { isMongoOnline, toDecimal128, hasValidBarcode, buildFiscalDefaults, buildTaxFutureDefaults, getEffectiveStock};
