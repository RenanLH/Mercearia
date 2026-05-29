import { Router } from "express";
import ProductController from "../Controller/ProductController.js";
import SaleController from "../Controller/SaleController.js";
import PurchaseController from "../Controller/PurchaseController.js";
import RegisteredSaleController from "../Controller/RegisteredSaleController.js";
import {
  getRegisteredProducts,
  getRegisteredProductMovementTotals,
} from "../Controller/RegisteredProductController.js";

const routes = Router();

routes.get("/productExists", ProductController.productExists);
routes.get("/products", ProductController.getProduct);
routes.post("/products", ProductController.createProduct);
routes.put("/products", ProductController.editProduct);
routes.post("/products/sync-local", ProductController.syncProductsToLocalDb);

routes.post("/sales", SaleController.createSale);
routes.get("/sales", SaleController.getSales);
routes.post("/sales/sync-local", SaleController.syncSalesToLocalDb);
routes.get("/sales/registered", RegisteredSaleController.getRegisteredSales);
routes.post("/sales/registered", RegisteredSaleController.createRegisteredSale);
routes.put("/sales/registered/:saleId", RegisteredSaleController.updateRegisteredSaleNfceCode);
routes.delete("/sales/registered", RegisteredSaleController.removeRegisteredSale);

routes.post("/purchases", PurchaseController.createPurchase);
routes.get("/purchases", PurchaseController.getPurchase);
routes.get("/registered-products", getRegisteredProducts);
routes.post("/registered-products/movement-totals", getRegisteredProductMovementTotals);


/*
old routes to add
routes.get("/sync");
routes.get("/updateDB");
routes.get("/changeTotal");
routes.get("/scrape");
*/


export default routes;
