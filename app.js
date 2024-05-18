const express = require("express");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");

const globalErrorHandler = require("./controller/error");
const AppError = require("./utils/appError");
const productRoute = require("./routes/productRoute");

const app = express();

// Development logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Body parser, reading data from body into req.body
app.use(express.json());
// Cookie parser
app.use(cookieParser());

//Routes
// app.use("/", (req, res, next) => res.send("Welcome to foods my momi api"));
app.use("/api/v1/product", productRoute);
// app.use("/api/v1/users", userRouter);
// app.use("/api/v1/interviews", interviewRouter);

app.all("*", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
