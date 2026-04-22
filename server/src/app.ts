import express from "express";
import healthRouter from "./routes/health";
import quizzesRouter from "./routes/quizzes";

const app = express();

app.use(express.json());

app.use("/", healthRouter);
app.use("/quizzes", quizzesRouter);

export default app;
