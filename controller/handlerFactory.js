const db = require("../config/db");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const { trim } = require("validator");

const isIdaNumberMsg = "Invalid ID! (ID must be a number)";

const convertCategoriesToArray = (data) => {
  let res = [];

  for (let i = 0; i < data.length; i++) {
    for (const [key, value] of Object.entries(data[i])) {
      if (key === "categories") {
        data[i][key] = value.split("-");
      }
    }

    res.push(data[i]);
  }

  return res;
};

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

const sendResponse = (res, table, response, statusCode) => {
  const results = response.length > 1 ? response.length : undefined;

  let tableName = results ? table : table.slice(0, -1);

  res.status(statusCode).json({
    status: "success",
    results,
    [tableName]: response,
  });
};

exports.getAll = (table, filteredColumns) => {
  return catchAsync(async (req, res, next) => {
    const columns = filteredColumns ? filteredColumns : "*";
    const forUsers = `SELECT ${columns} FROM ${table} WHERE active <> 'false'`;
    const sql = table === "users" ? forUsers : `SELECT ${columns} FROM ${table}`;

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
    const [result] = await db.query(`SELECT * FROM ${table} WHERE id = ?`, row.insertId);

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
    const forUsers = `SELECT ${columns} FROM ${table} WHERE active <> 'false' AND id = ?`;
    const sql =
      table === "users" ? forUsers : `SELECT ${columns} FROM ${table} WHERE id = ?`;
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
    const [result, ...others] = await db.query(
      `SELECT ${columns} FROM ${table} WHERE id = ?`,
      id
    );

    // Throw error if result is an empty array
    if (!(Array.isArray(result) && result.length)) {
      return next(new AppError(`No ${table.slice(0, -1)} found with that id`, 404));
    }

    convertCategoriesToArray(result);

    sendResponse(res, table, result, 200);
  });
};
