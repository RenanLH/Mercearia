import express from "express";
import axios from "axios";
import * as cheerio from 'cheerio';
import cors from "cors";


const app = express();
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