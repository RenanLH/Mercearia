import { Mongoose } from "mongoose";

const Schema = new Mongoose.Schema({
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

export default Mongoose.model("StaticProduct", Schema, "StaticProduct");
