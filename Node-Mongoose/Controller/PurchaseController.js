import Purchase from "../Model/Purchase.js";
import mongoose from "mongoose";
import Product from "../Model/Product.js";
import RegisteredProduct from "../Model/RegisteredProduct.js";

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

const getEffectiveStock = (stock, stockTrib, unit, unitTrib) => {
  if (unit === "CX" && unitTrib !== "CX") {
    return Number(stockTrib) || 0;
  }
  return Number(stock) || 0;
};

async function createRegisteredProduct(productsInput, session) {
  const products = Array.isArray(productsInput)
    ? productsInput
    : [productsInput];
  const productMap = new Map();

  const barcodes = [];
  const barcodesTrib = [];

  for (const product of products) {
    const barcode = product.barcode || "SEM GTIN";
    const barcodeTrib = product.barcodeTrib || barcode;

    if (hasValidBarcode(barcode)) {
      barcodes.push(barcode);
    }
    if (hasValidBarcode(barcodeTrib) && barcodeTrib !== barcode) {
      barcodesTrib.push(barcodeTrib);
    }
  }

  const existingByBarcode = new Map();
  const newProducts = [];

  if (barcodes.length > 0 || barcodesTrib.length > 0) {
    const existingProducts = await RegisteredProduct.find({
      $or: [
        ...(barcodes.length > 0
          ? [{ barcode: { $in: barcodes } }, { barcodeTrib: { $in: barcodes } }]
          : []),
        ...(barcodesTrib.length > 0
          ? [
              { barcode: { $in: barcodesTrib } },
              { barcodeTrib: { $in: barcodesTrib } },
            ]
          : []),
      ],
    })
      .session(session)
      .lean();

    existingProducts.forEach((p) => {
      existingByBarcode.set(p.barcode, p);
      existingByBarcode.set(p.barcodeTrib, p);
    });
  }

  for (const product of products) {
    const barcode = product.barcode || "SEM GTIN";
    const barcodeTrib = product.barcodeTrib || barcode;
    const mapKey = hasValidBarcode(barcode)
      ? barcode
      : product.code + product.name;

    let existing = null;
    if (hasValidBarcode(barcode)) {
      existing = existingByBarcode.get(barcode);
    } else if (hasValidBarcode(barcodeTrib)) {
      existing = existingByBarcode.get(barcodeTrib);
    }

    if (!existing) {
      existing = await RegisteredProduct.findOne({
        code: product.code,
        name: product.name,
        unit: product.unit,
        "fiscal.ncm": product.fiscal?.ncm,
      })
        .session(session)
        .lean();
    }

    if (existing) {
      existing.code = product.code;
      existing.barcode = barcode;
      existing.barcodeTrib = barcodeTrib;
      existing.name = product.name;
      existing.unit = product.unit;
      existing.unitTrib = product.unitTrib || product.unit;

      const incomingStock = getEffectiveStock(
        product.stock,
        product.stockTrib,
        product.unit,
        product.unitTrib || product.unit,
      );
      existing.stock = Number(existing.stock || 0) + incomingStock;

      existing.costPrice = toDecimal128(product.costPrice);
      existing.costPriceTrib = toDecimal128(product.costPriceTrib);
      existing.fiscal = buildFiscalDefaults(product.fiscal);
      existing.taxFuture = buildTaxFutureDefaults(product.taxFuture);

      await RegisteredProduct.updateOne(
        { _id: existing._id },
        { $set: existing },
        { session },
      );

      productMap.set(mapKey, existing);
    } else {
      newProducts.push({
        inputProduct: product,
        barcode,
        barcodeTrib,
      });
    }
  }

  if (newProducts.length > 0) {
    const oldBarcodes = newProducts
      .map((p) => [p.barcode, p.barcodeTrib])
      .flat()
      .filter(hasValidBarcode);

    const oldProductsMap = new Map();
    if (oldBarcodes.length > 0) {
      const oldProds = await Product.find({
        $or: [{ barcode: { $in: oldBarcodes } }],
      }).lean();
      oldProds.forEach((p) => oldProductsMap.set(p.barcode, p));
    }

    const createPayload = newProducts.map(
      ({ inputProduct, barcode, barcodeTrib }) => {
        const oldProduct =
          oldProductsMap.get(barcode) || oldProductsMap.get(barcodeTrib);
        const unitTrib = inputProduct.unitTrib || inputProduct.unit;
        const effectiveStock = getEffectiveStock(
          inputProduct.stock,
          inputProduct.stockTrib,
          inputProduct.unit,
          unitTrib,
        );
        return {
          code: inputProduct.code,
          barcode,
          barcodeTrib,
          name: inputProduct.name,
          unit: inputProduct.unit,
          unitTrib,
          stock: effectiveStock,
          costPrice: toDecimal128(inputProduct.costPrice),
          costPriceTrib: toDecimal128(inputProduct.costPriceTrib),
          salePrice: toDecimal128(
            oldProduct?.price ?? inputProduct.salePrice ?? 0,
          ),
          fiscal: buildFiscalDefaults(inputProduct.fiscal),
          taxFuture: buildTaxFutureDefaults(inputProduct.taxFuture),
        };
      },
    );

    const createdProducts = await RegisteredProduct.create(createPayload, {
      session,
      ordered: true,
    });

    createdProducts.forEach((created, idx) => {
      const { barcode, inputProduct } = newProducts[idx];
      const mapKey = hasValidBarcode(barcode)
        ? barcode
        : inputProduct.code + inputProduct.name;
      productMap.set(mapKey, created);
    });
  }

  return productMap;
}

async function createPurchase(req, res) {
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const purchase = req.body;

      if (!purchase.CNPJ || purchase.CNPJ != process.env.EMPRESA_CNPJ) {
        throw new Error("invalid CNPJ");
      }

      if (
        !purchase.xNomeDest ||
        !purchase.xNomeDest.includes(process.env.EMPRESA_RAZAO_SOCIAL)
      ) {
        throw new Error("invalid business name");
      }

      const productMap = await createRegisteredProduct(
        req.body.products,
        session,
      );

      const productsToFormat = (req.body.products || []).map((product) => {
        const barcode = product.barcode || "SEM GTIN";
        const barcodeTrib = product.barcodeTrib || barcode;
        const mapKey = hasValidBarcode(barcode)
          ? barcode
          : product.code + product.name;

        return { product, barcode, barcodeTrib, mapKey };
      });

      const missingProducts = productsToFormat.filter(
        (p) => !productMap.has(p.mapKey),
      );

      const missingByBarcode = new Map();
      if (missingProducts.length > 0) {
        const barcodes = missingProducts
          .map((p) => [p.barcode, p.barcodeTrib])
          .flat()
          .filter(hasValidBarcode);

        if (barcodes.length > 0) {
          const found = await RegisteredProduct.find({
            $or: [
              { barcode: { $in: barcodes } },
              { barcodeTrib: { $in: barcodes } },
            ],
          })
            .session(session)
            .lean();

          found.forEach((p) => {
            missingByBarcode.set(p.barcode, p);
            missingByBarcode.set(p.barcodeTrib, p);
          });
        }

        const stillMissing = missingProducts.filter(
          (p) =>
            !missingByBarcode.has(p.barcode) &&
            !missingByBarcode.has(p.barcodeTrib),
        );
        if (stillMissing.length > 0) {
          const byCodeName = await RegisteredProduct.find({
            $or: stillMissing.map((p) => ({
              code: p.product.code,
              name: p.product.name,
              unit: p.product.unit,
              "fiscal.ncm": p.product.fiscal?.ncm,
            })),
          })
            .session(session)
            .lean();

          byCodeName.forEach((p) => {
            missingByBarcode.set(p.code + p.name, p);
          });
        }
      }

      const formattedProducts = productsToFormat.map(
        ({ product, barcode, barcodeTrib, mapKey }) => {
          const productDb =
            productMap.get(mapKey) ||
            missingByBarcode.get(barcode) ||
            missingByBarcode.get(barcodeTrib);
          const unitTrib = product.unitTrib || product.unit;

          const qCom = getEffectiveStock(
            product.stock,
            product.stockTrib,
            product.unit,
            unitTrib,
          );
          const qTrib = Number(product.stockTrib) || 0;
          const costPrice = toDecimal128(product.costPrice);

          return {
            id: productDb?._id || null,
            cProd: product.code || null,
            xProd: product.name,
            cEAN: barcode,
            cEANTrib: barcodeTrib,
            NCM: product.fiscal?.ncm || "",
            CEST: product.fiscal?.cest || null,
            CFOP: product.fiscal?.cfopSale || null,
            uCom: product.unit || null,
            qCom,
            vUnCom: costPrice,
            vProd: toDecimal128(
              (qCom * Number(product.costPrice || 0)).toString(),
            ),
            uTrib: unitTrib,
            qTrib,
            vUnTrib: toDecimal128(product.costPriceTrib),
            stockCom: qCom,
            stockTrib: qTrib,
            costPriceCom: costPrice,
            costPriceTrib: toDecimal128(product.costPriceTrib),
          };
        },
      );

      await Purchase.create(
        [
          {
            idNfe: purchase.idNfe,
            xNome: purchase.xNome,
            dhEmi: purchase.dhEmi,
            products: formattedProducts,
          },
        ],
        { session, ordered: true },
      );
    });

    res.status(201).json("Success");
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json("Error: " + (error.errorResponse?.errmsg || error.message));
  } finally {
    await session.endSession();
  }
}

async function getPurchase(req, res) {
  try {
    const purchase = await Purchase.find().lean();
    res.status(200).json(purchase);
  } catch (error) {
    console.log(error);
    res.status(500).json("Error");
  }
}

export default { createPurchase, getPurchase };
