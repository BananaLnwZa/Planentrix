import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import adminAuthRouter from "./routes/authen.route";
import adminUserRouter from "./routes/user.route";
import adminSubjectRouter from "./routes/subject.route";
import adminSubjectTypeRouter from "./routes/subject-type.route";
import adminExamRouter from "./routes/exam.route";
import { errorHandler } from "../middlewares/errorHandler";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/admin/auth", adminAuthRouter);
app.use("/admin/users", adminUserRouter);
app.use("/admin/subjects", adminSubjectRouter);
app.use("/admin/subject-types", adminSubjectTypeRouter);
app.use("/admin/exams", adminExamRouter);

app.get("/", (req, res) => {
  res.json({ message: "Admin backend is running" });
});

app.use(errorHandler);

const port = Number(process.env.ADMIN_SERVER_PORT || 4100);
console.log("Starting admin server...");
app.listen(port, () => {
  console.log(`Admin server listening on http://localhost:${port}`);
});
