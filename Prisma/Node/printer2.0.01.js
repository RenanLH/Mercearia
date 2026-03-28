import express from "express";
import cors from "cors";
import {ThermalPrinter, CharacterSet, PrinterTypes} from "node-thermal-printer";
import * as printer from "@grandchef/node-printer"
import {exec} from "node:child_process"
import { stderr, stdout } from "node:process";

const app = express();
app.use(express.json());
app.use(cors());

const PORT = 5569;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));  

app.use((req, res, next) => {
  res.setTimeout(1500,() => {
    console.log("TIME OUT");
    return res.status(500).json("Time outeds");
  });
  next();
});

app.post('/print', async (req, res) =>{
  console.log("PRINT START")
  const sale = req.body;
  console.log(sale);
try{/*
      let epsonThermalPrinter = new ThermalPrinter({
          type: PrinterTypes.EPSON,
          characterSet: CharacterSet.PC852_LATIN2,
          removeSpecialCharacters: false,
          interface:"printer:EPSON TM-T20X Receipt",
          driver: printer
      });

      if (epsonThermalPrinter == undefined || sale.productList == undefined || sale.productList.length == 0){
        console.log("error empty array || printer not found");
        return res.status(500).json("error e");

      }

      const qtdTotal = sale.productList.reduce((sum, product) => sum + parseInt(product.qtd),0);
    
      let isConnected = await epsonThermalPrinter.isPrinterConnected();  
      console.log(isConnected);
      if (isConnected){
          epsonThermalPrinter.alignCenter();                                      // Align text to center
          epsonThermalPrinter.println("MERCEARIA SAO LOURENCO");                             // Append text with new line
          epsonThermalPrinter.println("AV. SILVINO DAL BO 4065 SANTA TEREZINHA-PR");                             // Append text with new line
          epsonThermalPrinter.println ("TELEFONE: (45) 99851 2381");                             // Append text with new line
          epsonThermalPrinter.bold(true);                                         // Set text bold
          epsonThermalPrinter.drawLine();
          epsonThermalPrinter.println("\tNAO E DOCUMENTO FISCAL");
          epsonThermalPrinter.println();
          epsonThermalPrinter.print("Qtde\t");
          epsonThermalPrinter.print("Descricao\t");
          epsonThermalPrinter.print("Preco (R$)  ");
          epsonThermalPrinter.println("Total (R$)");
          epsonThermalPrinter.bold(false);                                         // Set text bold
          sale.productList.forEach(element => {
              let name = element.name.toUpperCase();
	      let price = element.price.replace(",", "."); 
              if (name.length < 20) {
                const space = " ".repeat(20 - name.length);
                console.log(space.length);
                name += space + ".";
               
              }
 		console.log("aaaaaa" + parseFloat(price)  + "BBBBBB");

               epsonThermalPrinter.println(element.qtd + "\t" + name + "\t" + parseFloat(price).toFixed(2) + "\t" + parseFloat((parseInt(element.qtd) * parseFloat(price))).toFixed(2));
          });  
          epsonThermalPrinter.alignLeft();
          epsonThermalPrinter.drawLine();                                         // Draws a line
          epsonThermalPrinter.bold(true);  
          epsonThermalPrinter.print("Qtde. total de itens:\t\t")
          epsonThermalPrinter.println(qtdTotal);
          epsonThermalPrinter.setTextSize(1, 1);
          epsonThermalPrinter.print("Valor TOTAL   ")
          epsonThermalPrinter.println("R$ " + parseFloat(sale.total).toFixed(2));
          epsonThermalPrinter.setTextSize(0, 0);
          epsonThermalPrinter.println();
          epsonThermalPrinter.drawLine();                                         // Draws a line
          epsonThermalPrinter.println();
          epsonThermalPrinter.cut();
          epsonThermalPrinter.execute();
	        epsonThermalPrinter.clear();
          epsonThermalPrinter.setBuffer(null);
	        epsonThermalPrinter = null;

     
	   return res.status(200).json("printed");
	  
	  
      }*/return res.status(200).json("printed");
  }catch(error){
      console.log(error);
    return  res.status(500).json("tried failed");
  }
});