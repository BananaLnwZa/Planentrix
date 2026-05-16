import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import userAuthRouter from "./routes/authen.route";
import { errorHandler } from "../middlewares/errorHandler";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/user/auth", userAuthRouter);

app.get("/", (req, res) => {
  res.json({ message: "User backend is running" });
});

app.use(errorHandler);

const port = Number(process.env.USER_SERVER_PORT || 4000);
console.log("Starting user server...");
app.listen(port, () => {
  console.log(`User server listening on http://localhost:${port}`);
});
