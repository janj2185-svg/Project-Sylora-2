const REQUEST_ERRORS = Object.freeze({
  BODY_TOO_LARGE: { status: 413, message: 'Request body exceeds the allowed size.' },
  INVALID_JSON: { status: 400, message: 'Request body must contain valid JSON.' },
  UNSUPPORTED_MEDIA_TYPE: { status: 415, message: 'Unsupported media type.' },
  MEDIA_TOO_LARGE: { status: 413, message: 'Media exceeds the allowed size.' },
  INVALID_VIDEO_FILE: { status: 400, message: 'The uploaded video is invalid.' }
});

export function httpErrorResponse(error) {
  const code = String(error?.message || '');
  const known = REQUEST_ERRORS[code];
  if (known) {
    return {
      status: known.status,
      body: { error: code, code, message: known.message }
    };
  }
  return {
    status: 500,
    body: {
      error: 'INTERNAL_ERROR',
      code: 'INTERNAL_ERROR',
      message: 'An internal server error occurred.'
    }
  };
}
