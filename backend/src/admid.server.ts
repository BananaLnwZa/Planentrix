import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import adminAuthRouter from "./routes/admin/authen.route";
import { errorHandler } from "./middlewares/errorHandler";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/admin/auth", adminAuthRouter);

app.get("/", (req, res) => {
  res.json({ message: "Admin backend is running" });
});

app.use(errorHandler);

const port = Number(process.env.ADMIN_SERVER_PORT || 4100);
app.listen(port, () => {
  console.log(`Admin server listening on http://localhost:${port}`);
});
