import express from "express";
import healthRouter from "./routes/health";
import quizzesRouter from "./routes/quizzes";
import cors from "cors";
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/", healthRouter);
app.use("/quizzes", quizzesRouter);

export default app;
