import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import authRoutes from "./Routes/auth.js";
import boatRoutes from "./Routes/boat.js";
import bookingRoutes from "./Routes/bookings.js";
import reviewRoutes from "./Routes/reviews.js";
import contactRoutes from './Routes/contact.js';
import userRoutes from './Routes/user.js';

dotenv.config();
 
const app = express();
app.use(cors());
app.use(express.json());

// Connexion à MongoDB
connectDB();

// Configuration des routes
app.use("/api/auth", authRoutes);
app.use("/api/boats", boatRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/reviews", reviewRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/user', userRoutes);

app.get("/", (req, res) => {
  res.send("API is running");
});

export default app;

if (process.env.NODE_ENV !== 'test') {
  app.listen(process.env.PORT, () =>
    console.log(`Server running on port ${process.env.PORT}`)
  );
}