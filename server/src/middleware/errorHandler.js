/**
 * Global error handler middleware
 * Must be registered last (after all routes)
 */
const errorHandler = (err, req, res, _next) => {
  console.error(`[Error] ${req.method} ${req.path}:`, err.message);

  // Prisma known request errors
  if (err.code === "P2002") {
    return res.status(409).json({ message: "A record with this value already exists." });
  }
  if (err.code === "P2025") {
    return res.status(404).json({ message: "Record not found." });
  }

  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    message: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

module.exports = { errorHandler };
