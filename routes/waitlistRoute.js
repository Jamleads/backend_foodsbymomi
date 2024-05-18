const express = require("express");
const {
  createWaitlist,
  getOneWaitlist,
  getAllWaitlist,
  updateWaitlist,
  deleteWaitlist,
} = require("../controller/waitlistController");

const router = express.Router({ mergeParams: true });

router.route("/").get(getAllWaitlist);

router.route("/create").post(createWaitlist);

router.route("/:id").get(getOneWaitlist).delete(deleteWaitlist).put(updateWaitlist);

module.exports = router;
