export const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    errors: [],
  });
};

export const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((e) => e.message);
    return res
      .status(400)
      .json({ success: false, message: "Validation failed.", errors });
  }

  if (err.code === 11000) {
    return res
      .status(409)
      .json({ success: false, message: "Duplicate value not allowed.", errors: [] });
  }

  if (err.name === "CastError") {
    return res
      .status(400)
      .json({ success: false, message: "Invalid ID format.", errors: [] });
  }

  console.error(err);
  res.status(500).json({
    success: false,
    message: "Something went wrong on the server.",
    errors: [],
  });
};