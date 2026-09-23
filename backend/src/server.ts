import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import authRouter from "./auth/auth.route";
import userExamRouter from "./user/routes/exam.routes";
import userProfileRouter from "./user/routes/profile.route";
import userTermsRouter from "./user/routes/terms.route";
import userTableRouter from "./user/routes/table.router";
import userGradeRouter from "./user/routes/grade.routes";
import userWorkloadRouter from "./user/routes/workload.routes";
import userTimeRouter from "./user/routes/time.routes";
import userRecommendationRouter from "./user/routes/recommendation.routes";
import adminUserRouter from "./admin/routes/user.route";
import adminSubjectRouter from "./admin/routes/subject.route";
import adminSubjectTypeRouter from "./admin/routes/subject-type.route";
import adminExamRouter from "./admin/routes/exam.route";
import adminDashboardRouter from "./admin/routes/dashboard.route";
import adminFacultyRouter from "./admin/routes/faculty.route";
import adminDepartmentRouter from "./admin/routes/department.route";
import adminExamImportRouter from "./admin/routes/examimport.routes";
import instructorRouter from "./instructor/routes/instructor.route";
import { errorHandler } from "./middlewares/errorHandler";
import { requireRole } from "./middlewares/requireRole";
import { verifyToken } from "./middlewares/verifyToken";
import { startRecommendationScheduler } from "./user/services/recommendation.job";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/auth", authRouter);

const userRouter = express.Router();
userRouter.use(verifyToken, requireRole("user"));
userRouter.use("/profile", userProfileRouter);
userRouter.use("/terms", userTermsRouter);
userRouter.use("/schedule", userTableRouter);
userRouter.use("/grade", userGradeRouter);
userRouter.use("/workload", userWorkloadRouter);
userRouter.use("/time", userTimeRouter);
userRouter.use("/exam", userExamRouter);
userRouter.use("/recommendations", userRecommendationRouter);
app.use("/user", userRouter);

const instructorAccessRouter = express.Router();
instructorAccessRouter.use(verifyToken, requireRole("instructor"));
instructorAccessRouter.use(instructorRouter);
app.use("/instructor", instructorAccessRouter);

const adminRouter = express.Router();
adminRouter.use(verifyToken, requireRole("university_staff"));
adminRouter.use("/users", adminUserRouter);
adminRouter.use("/subjects", adminSubjectRouter);
adminRouter.use("/subject-types", adminSubjectTypeRouter);
adminRouter.use("/exams", adminExamRouter);
adminRouter.use("/dashboard", adminDashboardRouter);
adminRouter.use("/faculties", adminFacultyRouter);
adminRouter.use("/departments", adminDepartmentRouter);
adminRouter.use("/examimport", adminExamImportRouter);
app.use("/admin", adminRouter);

app.get("/", (_req, res) => {
  res.json({
    message: "Planentrix backend is running",
    services: ["auth", "user", "instructor", "admin"],
  });
});

app.use(errorHandler);

const port = Number(
  process.env.PORT || process.env.SERVER_PORT || process.env.USER_SERVER_PORT || 4000,
);

console.log("Starting Planentrix server...");
const server = app.listen(port, () => {
  console.log(`Planentrix server listening on http://localhost:${port}`);
  startRecommendationScheduler();
});
server.ref();
