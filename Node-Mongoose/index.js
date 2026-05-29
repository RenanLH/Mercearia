import mongoose from "mongoose";
import dotenv from 'dotenv';
import express from 'express';
import cors from "cors";
import routes from "./Routes/server.js";


dotenv.config();

const dbUri = process.env.DATABASE_URL;
let reconnectTimer = null;

async function connectToMongo() {
  if (mongoose.connection.readyState === 1) return;

  try {
    await mongoose.connect(dbUri);
    console.log("conected to database");
  } catch (error) {
    console.log(error);
    scheduleReconnect();
  }
}

function scheduleReconnect() {
  if (reconnectTimer) return;

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectToMongo();
  }, 5 * 60 * 1000);
}

mongoose.connection.on("disconnected", scheduleReconnect);
mongoose.connection.on("connected", () => {
  if (!reconnectTimer) return;

  clearTimeout(reconnectTimer);
  reconnectTimer = null;
});

connectToMongo();

const app = express();

app.use(express.json());
app.use(cors());

app.use(routes);


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));  
