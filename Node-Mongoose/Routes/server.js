import { Router } from "express";
import ProductController from "../Controller/ProductController.js";
import SaleController from "../Controller/SaleController.js";
import PurchaseController from "../Controller/PurchaseController.js";

const routes = Router();

routes.get("/productExists", ProductController.productExists);
routes.get("/products", ProductController.getProduct);
routes.post("/products", ProductController.createProduct);
routes.put("/products", ProductController.editProduct);

routes.post("/sales", SaleController.createSale);
routes.get("/sales", SaleController.getSales);
routes.get("/sales/registered", SaleController.getRegisteredSales);
routes.post("/sales/registered", SaleController.createRegisteredSale);
routes.delete("/sales/registered", SaleController.removeRegisteredSale);


routes.post("/purchases", PurchaseController.createPurchase);
routes.get("/purchases", PurchaseController.getPurchase);


/*
old routes to add
routes.get("/sync");
routes.get("/updateDB");
routes.get("/changeTotal");
routes.get("/scrape");
*/


export default routes;