import mongoose from "mongoose";

const Schema = new mongoose.Schema({
  sku: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
    unique: true,
  },
  price: {
    type: String,
    required: true,
  },
  lastUpdated: {
    type: Date,
    required: true,
  },
});

export default mongoose.model("StaticProduct", Schema, "StaticProduct");
