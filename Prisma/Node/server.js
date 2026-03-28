import express from "express";
import axios from "axios";
import * as cheerio from 'cheerio';
import cors from "cors";
import * as db from "./db.js"
import * as controllerP from "./controllerProduct.js"
import { PrismaClient } from "@prisma/client"
import {ThermalPrinter, CharacterSet, PrinterTypes} from "node-thermal-printer";

const app = express();
const prisma = new PrismaClient() 

app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));  


app.get("/productExists", async (req,res)=> {
  try {
    const codBarras = req.query.codBarras;

    const localProduct = await db.getProduct(codBarras);

    const onlineProduct = await prisma.product.findFirst({
        where: {
          barcode: codBarras,
        },
      })
    
    const result = controllerP.compareProducts(localProduct, onlineProduct);

    res.status(200).json(result);
    
  } catch (error) {
     console.log(error);
     res.status(405).json({message: "Error " + error}); 
  }
});


app.get("/sync", async(req, res) => {
  try{
      
    const products = await prisma.product.findMany({
      skip: 950,
      take: 500,
      where:{
        NOT:{
          name: ''
        }
      }
    })

    db.syncDatabase(products);

    res.status(200).json("SUCESSO")
  }catch(error){
    console.log(error);
  }
});

app.get("/updateDB", async(req, res) =>{
  try {

    db.updateDB();
    
    res.status(200).json({message: "SUCCESS"});
    
  } catch (error) {
    console.log(error);
    req.status(503).json({message:"FAILED"});
  }
});

app.get("/changeTotal", async(req,res) =>{
  try{
    
  const vendas = await prisma.sale.findMany();
  const filteredVendas = vendas.filter(venda => venda.total.length > 1);   

  let sum = 0;
  for(let i = 0; i < filteredVendas.length; i++){
    
    let vendaAtual = filteredVendas[i];
    if (Number(vendaAtual.total) > 100) 
      console.log(vendaAtual.total);
    
    vendaAtual.total = String(Number(vendaAtual.total).toFixed(2));  
   sum += Number(vendaAtual.total);

   }
  // console.log(sum);
   res.status(200).json({message:"OKOK"});
  }catch(error){
    console.log(error);
    res.status(503).json({message:"Erororor"});
  }
});

app.get("/scrape", async (req, res) => {
    const url = req.query.url;
   // console.log(url);
    try {
    
      const response = await axios.get(url, {responseEncoding: "latin1"});
      const html = response.data;
      const $ = cheerio.load(html);
   //   console.log($);

      const data = [];
      $("h3").each((index, element) => {
        data.push({
          text: $(element).text(),
          href: $(element).attr("href"),
        });
      });
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Error accessing the URL"  + error});
    }
  });


  app.post("/products", async (req, res) => {
    try {
      const product = req.body;

      await db.addProduct(product);

      await prisma.product.create({
        data: {
          barcode: String(product.barcode),
          name: String(product.name),
          salesName: String(product.salesName),
          price: String(product.price),
          qtd: String(product.qtd),
          lastUpdated: new Date()
        }
      })
     
      res.status(200).json("Produto cadastrado com sucesso");
    } catch (error) {
      console.log(error);

      res.status(500).json({message: "Erro ao cadastrar o produto" + error});
    }
  });

  app.put("/products", async (req, res) => {
    try {
      const product = req.body;

      await db.updateProduct(product);

      await prisma.product.update({
        where: {barcode: String(product.barcode)},
        data: {
          name: String(product.name),
          salesName: String(product.salesName),
          price: String(product.price),
          qtd: String(product.qtd),
          lastUpdated: new Date()
        }
      })
      
      res.status(200).json("Produto cadastrado com sucesso");
    } catch (error) {
      console.log(error);
      res.status(500).json({message: "Erro ao cadastrar o produto" + error});
    }
  });


  app.get("/products", async (req, res) => {
   // console.log("busca Produto");
   // console.log(req.query);
    try {
      const codBarras = req.query.codBarras;

      let product = await prisma.product.findFirst({
        where: {
          barcode: codBarras,
        },
      }) 
     // console.log(product);
      if (product == undefined || product == null){
        product = await db.getProduct(codBarras);
      } 
      res.status(200).json(product);      
    } catch (error) {
      console.log(error);
      res.status(500).json(error);
    }
  });

  app.post("/sales", async(req, res) => {
    try {
      const sale = req.body;

      const productSale = [];

     // console.log(sale.productList.length);
      //console.log(sale.productList[0]);

      sale.productList.forEach(element => {
        const product = JSON.stringify(element);
        productSale.push(product);  
      });

      await prisma.sale.create({
        data: {
          products: productSale,
          total: String(sale.total),
          date: new Date()
        }
      })    

      
//      console.log(productSale.length);

  //    productSale.forEach((element) => console.log(element));

      res.status(200).json("")
      
    } catch (error) {
      console.log(error);
      res.status(500).json("") 
    }
  })


  app.get("/sales", async(req, res) => {
    try {
      const dateRequested = new Date(req.query.date);
      const dayBefore = new Date(); 

      dayBefore.setMonth(dateRequested.getMonth());
      dayBefore.setHours(0,0,0);
      dayBefore.setDate(dateRequested.getDate());


      const response = await prisma.sale.findMany({
        orderBy:{
          date: 'desc',
        }, 
        where :{
          date : {
            lt: dateRequested,
            gte: dayBefore
            
          }
        }
      })

      res.status(200).json(response)
      
    } catch (error) {
      res.status(500).json("") 
    }
  })
