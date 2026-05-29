import Purchase from "../Model/Purchase.js";
import mongoose from "mongoose";
import RegisteredProduct from "../Model/RegisteredProduct.js";
import {
  hasValidBarcode,
  getEffectiveStock,
  toDecimal128,
} from "../Util/Utilities.js";
import { createRegisteredProduct } from "./RegisteredProductController.js";

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
            product.costPrice,
            product.costPriceTrib,
            product.name,
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
    res.status(500).json("Error: " + (error.errorResponse?.errmsg || error.message || "An error occurred while creating the purchase"));
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
    res.status(500).json("Error: " + (error.errorResponse?.errmsg || error.message || "An error occurred while fetching purchases"));
  }
}

export default { createPurchase, getPurchase };
