const express = require("express");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const cors = require("cors");

const globalErrorHandler = require("./controller/error");
const AppError = require("./utils/appError");
const productRoute = require("./routes/productRoute");
const waitlistRoute = require("./routes/waitlistRoute");
const advertMessageRoute = require("./routes/advertMessageRoute");
const authRoute = require("./routes/authRoute");
const userRoute = require("./routes/userRoute");
const cartRoute = require("./routes/cartRoute");
const orderRoute = require("./routes/orderRoutes");
const productCategoryRoute = require("./routes/productCategoryRoute");
const discountCodesRoute = require("./routes/discountCodesRoute");
const orderController = require("./controller/orderController");

const app = express();

// const allowedOrigins = ["http://localhost:3000", "https://foodsbymomi.com"];

// const corsOptions = {
//   origin: (origin, callback) => {
//     if (allowedOrigins.includes(origin) || !origin) {
//       callback(null, true);
//     } else {
//       callback(new Error("Origin not allowed by CORS"));
//     }
//   },
//   credentials: true,
//   optionsSuccessStatus: 200,
// };

// Body parser, reading data from body into req.body
app.use(express.json());

app.post(
  "/webhook-checkout",
  // bodyParser.raw({ type: "application/json" }),
  orderController.webhookCheckout
);

app.enable("trust proxy");

app.use(cors());

app.options("*", cors());

// Development logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Cookie parser
app.use(cookieParser());

//Routes
app.get("/", (req, res, next) => res.send("Welcome to foodsmymomi api"));
app.use("/api/v1/wait-list", waitlistRoute);
app.use("/api/v1/product", productRoute);
app.use("/api/v1/advert-message", advertMessageRoute);
app.use("/api/v1/auth", authRoute);
app.use("/api/v1/user", userRoute);
app.use("/api/v1/user", userRoute);
app.use("/api/v1/cart", cartRoute);
app.use("/api/v1/order", orderRoute);
app.use("/api/v1/product-category", productCategoryRoute);
app.use("/api/v1/discount", discountCodesRoute);

app.all("*", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
