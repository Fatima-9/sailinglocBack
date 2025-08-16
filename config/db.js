// config/db.js
import mongoose from "mongoose";

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connexion MongoDB réussie");
  } catch (error) {
    console.error("Échec connexion MongoDB :", error.message);
    process.exit(1);
  }
};

export default connectDB;
