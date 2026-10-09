import Purchase from "../Model/Purchase.js";
import mongoose from "mongoose";
import {
  getProductKey,
  toDecimal128,
} from "../Util/Utilities.js";
import { createRegisteredProduct } from "./RegisteredProductController.js";

async function createPurchase(req, res) {
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const purchase = req.body;

      if (!purchase) {
        throw new Error("purchase data is required");
      }

      if (!purchase.CNPJ || purchase.CNPJ != process.env.EMPRESA_CNPJ) {
        throw new Error("invalid CNPJ");
      }

      if (
        !purchase.xNomeDest ||
        !purchase.xNomeDest.includes(process.env.EMPRESA_RAZAO_SOCIAL) &&
        !purchase.xNomeDest.includes(process.env.EMPRESA_RAZAO_SOCIAL_MISS)
      ) {
        throw new Error("invalid business name");
      }

      const exists = await Purchase.findOne({ idNfe: purchase.idNfe }).session(session);
      if (exists) {
        throw new Error("purchase already exists");
      }

      const productMap = await createRegisteredProduct(
        purchase.products,
        session,
      );


      const productsToFormat = (purchase.products || []).map((product) => {
        const barcode = product.barcode || "SEM GTIN";
        const barcodeTrib = product.barcodeTrib || barcode;
        const mapKey = getProductKey(product);

        return { product, barcode, barcodeTrib, mapKey };
      });
      const missingProducts = productsToFormat.filter(
        (p) => !productMap.has(p.mapKey),
      );
      const formattedProducts = productsToFormat.map(
        ({ product, barcode, barcodeTrib, mapKey }) => {
          const productDb = productMap.get(mapKey);
          const unitTrib = product.unitTrib || product.unit;
          const qCom = Number(product.stock) || 0;
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
