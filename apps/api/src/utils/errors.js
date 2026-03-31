export function appError(code, message, statusCode = 422) {
  const err = new Error(message)
  err.appCode = code
  err.statusCode = statusCode
  return err
}

export function errorResponse(code, message) {
  return { error: { code, message } }
}
