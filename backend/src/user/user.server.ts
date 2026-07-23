import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import userAuthRouter from "./routes/authen.route";
import userProfileRouter from "./routes/profile.route";
import userTermsRouter from "./routes/terms.route";
import userTableRouter from "./routes/table.router";
import userDeleteRouter from "./routes/delete.routes";
import userGradeRouter from "./routes/grade.routes";
import { errorHandler } from "../middlewares/errorHandler";
import userWorkloadRouter from "./routes/workload.routes";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ตั้งค่าให้ให้บริการไฟล์ static จากโฟลเดอร์ uploads
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.use("/user/auth", userAuthRouter);
app.use("/user/profile", userProfileRouter);
app.use("/user/terms", userTermsRouter);
app.use("/user/schedule", userTableRouter);
app.use("/user/delete-time", userDeleteRouter);
app.use("/user/grade", userGradeRouter);
app.use("/user/workload", userWorkloadRouter);

app.get("/", (req, res) => {
  res.json({ message: "User backend is running" });
});

app.use(errorHandler);

const port = Number(process.env.USER_SERVER_PORT || 4000);
console.log("Starting user server...");
app.listen(port, () => {
  console.log(`User server listening on http://localhost:${port}`);
});