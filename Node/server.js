import express from "express";
import axios from "axios";
import * as cheerio from 'cheerio';
import cors from "cors";
import { PrismaClient } from "@prisma/client"

const app = express();
const prisma = new PrismaClient() 

app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

app.get("/scrape", async (req, res) => {
    const url = req.query.url;
    console.log(url);
    try {
    
      const response = await axios.get(url, {responseEncoding: "latin1"});
      const html = response.data;
      const $ = cheerio.load(html);
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

      await prisma.product.create({
        data: {
          barcode: String(product.barcode),
          name: String(product.name),
          salesName: String(product.salesName),
          price: String(product.price),
          qtd: String(product.qtd)
        }
      })
     
      res.status(200).json("Produto cadastrado com sucesso");
    } catch (error) {
      res.status(500).json({message: "Erro ao cadastrar o produto" + error});
    }
  });

  app.put("/products", async (req, res) => {
    try {
      const product = req.body;

      await prisma.product.update({
        where: {barcode: String(product.barcode)},
        data: {
          name: String(product.name),
          salesName: String(product.salesName),
          price: String(product.price),
          qtd: String(product.qtd)
        }
      })
     
      res.status(200).json("Produto cadastrado com sucesso");
    } catch (error) {
      res.status(500).json({message: "Erro ao cadastrar o produto" + error});
    }
  });


  app.get("/products", async (req, res) => {
    console.log("busca Produto");
    console.log(req.query);
    try {
      const codBarras = req.query.codBarras;

      const product = await prisma.product.findFirst({
        where: {
          barcode: codBarras,
        },
      })

      res.status(200).json(product);      
    } catch (error) {
      res.status(500).json(error);
    }

  });