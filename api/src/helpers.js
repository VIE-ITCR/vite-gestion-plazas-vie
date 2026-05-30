const ALLOWED_ORIGIN = 'https://stpplazasvie.z8.web.core.windows.net';
const CORS = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const intOrNull = v => (v !== undefined && v !== null && v !== '') ? parseInt(v) : null;
const floatOrZero = v => parseFloat(v) || 0;

// Mirrors frontend validarPwd: min 6 chars, at least one uppercase
const validatePassword = pwd => {
  if (!pwd || pwd.length < 6) return 'La contraseña debe tener al menos 6 caracteres.';
  if (!/[A-Z]/.test(pwd)) return 'La contraseña debe contener al menos una letra mayúscula.';
  return null;
};

module.exports = { CORS, intOrNull, floatOrZero, validatePassword };
