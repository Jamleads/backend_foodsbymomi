const db = require("../config/db");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const { trim } = require("validator");
const { convertCategoriesToArray, sendResponse } = require("../utils/general");

const isIdaNumberMsg = "Invalid ID! (ID must be a number)";

const formatReqBody = (body, table) => {
  let data = {};

  // convert categories to string
  if (table === "products") {
    body.categories = body.categories.join("-");
  }

  // remove created_at field if present
  delete body.created_at;

  // remove id field if present
  delete body.id;

  // trim fields
  for (const [key, value] of Object.entries(body)) {
    data[key] = trim(value);
  }

  return data;
};

exports.getAll = (table, filteredColumns) => {
  return catchAsync(async (req, res, next) => {
    const columns = filteredColumns ? filteredColumns : "*";
    const sql = `SELECT ${columns} FROM ${table}`;

    let result;

    // Get all rows in table
    result = (await db.query(sql))[0];

    if (table === "products") {
      result = convertCategoriesToArray(result);
    }

    sendResponse(res, table, result, 200);
  });
};

exports.createOne = (table) => {
  return catchAsync(async (req, res, next) => {
    const sql = `INSERT INTO ${table} SET ?`;
    const data = formatReqBody(req.body, table);

    // Insert data into table
    const [row] = await db.query(sql, data);

    // Get newly inserted row
    let [result] = await db.query(`SELECT * FROM ${table} WHERE id = ?`, row.insertId);

    if (table === "products") {
      result = convertCategoriesToArray(result);
    }

    sendResponse(res, table, result[0], 201);
  });
};

exports.deleteOne = (table) => {
  return catchAsync(async (req, res, next) => {
    const sql = `DELETE FROM ${table} WHERE id = ?`;
    const id = req.params.id;

    // Check if id is a number
    if (!Number(id)) {
      return next(new AppError(isIdaNumberMsg, 404));
    }

    // Delete row
    const row = (await db.query(sql, id))[0];

    sendResponse(res, table, row, 204);
  });
};

exports.getOne = (table, filteredColumns) => {
  return catchAsync(async (req, res, next) => {
    const columns = filteredColumns ? filteredColumns : "*";
    const sql = `SELECT ${columns} FROM ${table} WHERE id = ?`;
    const id = req.params.id;

    // Check if id is a number
    if (!Number(id)) {
      return next(new AppError(isIdaNumberMsg, 404));
    }

    // select row
    const [row, fields] = await db.query(sql, id);

    // Throw error if row is an empty array
    if (!(Array.isArray(row) && row.length)) {
      return next(new AppError(`No ${table.slice(0, -1)} found with that id`, 404));
    }

    // convert categories to an array
    if (table === "products") {
      convertCategoriesToArray(row);
    }

    sendResponse(res, table, row[0], 200);
  });
};

exports.updateOne = (table, filteredColumns, data) => {
  return catchAsync(async (req, res, next) => {
    const sql = `UPDATE ${table} SET ? WHERE id = ?`;
    let update = data ? formatReqBody(data, table) : formatReqBody(req.body, table);
    const id = req.params.id;
    const columns = filteredColumns ? filteredColumns : "*";

    // Check if id is a number
    if (!Number(id)) {
      return next(new AppError(isIdaNumberMsg, 404));
    }

    // update row
    await db.query(sql, [update, id]);

    // Get updated row
    let [result, ...others] = await db.query(
      `SELECT ${columns} FROM ${table} WHERE id = ?`,
      id
    );

    // Throw error if result is an empty array
    if (!(Array.isArray(result) && result.length)) {
      return next(new AppError(`No ${table.slice(0, -1)} found with that id`, 404));
    }

    if (table === "products") {
      result = convertCategoriesToArray(result);
    }

    sendResponse(res, table, result, 200);
  });
};
