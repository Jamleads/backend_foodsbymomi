const express = require("express");
const {
  createAdvertMessage,
  getAllAdvertMessages,
  getOneAdvertMessage,
  deleteAdvertMessage,
  updateAdvertMessage,
} = require("../controller/advertMessageController");

const router = express.Router();

router.route("/create").post(createAdvertMessage);
router.route("/").get(getAllAdvertMessages);
router
  .route("/:id")
  .get(getOneAdvertMessage)
  .delete(deleteAdvertMessage)
  .put(updateAdvertMessage);

module.exports = router;
