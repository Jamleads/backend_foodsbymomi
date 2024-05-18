const dotenv = require("dotenv");

dotenv.config({ path: "config/config.env" });
console.log(process.env.NODE_ENV);

const app = require("./app");

const port = process.env.PORT || 5000;

const server = app.listen(port, (req, res) => {
  console.log(`Server is running on port: ${port}`);
});

process.on("unhandledRejection", (err) => {
  console.log("UNHANDLED REJECTION!!! SHUTTING DOWN...");
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

process.on("SIGTERM", () => {
  console.log("👋 SIGTERM RECIVED. Shutting down gracefully!!!");
  server.close(() => {
    console.log("🔥 Process terminated!");
  });
});
