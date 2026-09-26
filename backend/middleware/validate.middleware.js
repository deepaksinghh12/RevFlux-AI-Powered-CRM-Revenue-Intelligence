/**
 * Express middleware validator runner.
 * @param {Function} validatorFn - Schema validation function returning { success, errors }
 */
export const validateBody = (validatorFn) => (req, res, next) => {
  const result = validatorFn(req.body || {});
  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: "Validation Error",
      details: result.errors,
    });
  }
  next();
};
