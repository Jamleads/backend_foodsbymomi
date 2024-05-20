const AppError = require("./../utils/appError");

const handleBadFieldErrorDB = (err) => {
  return new AppError(err.message, 400);
};

const handleRequiredFieldErrorDB = (err) => {
  const column = err.message.match(/'[^']*'/)[0].slice(1, -1);
  const table = err.sql.split(" ")[2].slice(0, -1);
  return new AppError(`A ${table} must have a ${column}`, 400);
};

const handleDuplicateEntryDB = (err) => {
  let [value, column] = [...err.message.matchAll(/'[^']*'/g)];
  column = column[0].slice(1, -1).split(".")[1];
  const table = err.sql.split(" ")[2].slice(0, -1);

  if (column === "email") {
    return new AppError(`Please use another email, ${value} is taken!`, 400);
  } else {
    return new AppError(`A ${table}'s ${column} must be unique`, 400);
  }
};

const handleNoDefaultValue = (err) => {
  let field = err.sqlMessage.split(" ")[1];

  console.log(field);

  return new AppError(`The ${field} field can not be empty!`, 400);
};

const sendErrorDev = (err, req, res) => {
  return res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrorProd = (err, req, res) => {
  // isOperatonal error: Trusted error
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  }

  //Unknown error
  // 1) log error
  console.error("ERROR!!!", err);

  // 2)send generic message
  return res.status(500).json({
    status: "error",
    message: "Something went wrong!",
  });
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  console.log(err);

  if (process.env.NODE_ENV === "development") {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === "production") {
    let error = { ...err };
    error.message = err.message;

    if (error.code === "ER_BAD_FIELD_ERROR") error = handleBadFieldErrorDB(error);

    if (error.code === "ER_BAD_NULL_ERROR") error = handleRequiredFieldErrorDB(error);

    if (error.code === "ER_DUP_ENTRY") error = handleDuplicateEntryDB(error);

    if (error.code === "ER_NO_DEFAULT_FOR_FIELD") error = handleNoDefaultValue(error);

    sendErrorProd(error, req, res);
  }
};
