const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const router = express.Router();

const { safeRequest } = require('../services/httpClient');
const { parseDistricts, parseSpecialties, parseTalons } = require('../services/parser');

const BASE_URL = process.env.REGISTRY_BASE_URL || 'https://portal.pinhospital.by';
const MOCK_DIR = path.join(__dirname, '..', 'mock');
const CSRF_COOKIE = 'registry_csrf';

function csrfToken(req, res, next) {
  const token = crypto.randomBytes(32).toString('hex');
  const secure = req.secure || req.get('x-forwarded-proto') === 'https' ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${CSRF_COOKIE}=${token}; Path=/api; SameSite=Strict; HttpOnly${secure}`
  );
  res.setHeader('Cache-Control', 'no-store');
  res.json({ ok: true, data: { token } });
}

function verifyCsrf(req, res, next) {
  const cookie = (req.headers.cookie || '')
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${CSRF_COOKIE}=`))
    ?.slice(CSRF_COOKIE.length + 1);
  const header = req.get('X-CSRF-Token');

  const cookieBuffer = Buffer.from(cookie || '');
  const headerBuffer = Buffer.from(header || '');
  if (!cookie || !header || cookieBuffer.length !== headerBuffer.length ||
      !crypto.timingSafeEqual(cookieBuffer, headerBuffer)) {
    return res.status(403).json({
      ok: false,
      error: {
        code: 'CSRF_INVALID',
        message: 'Не удалось проверить безопасность запроса. Обновите страницу и попробуйте снова.'
      }
    });
  }
  return next();
}

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function getMockMode(req) {
  const mock = req.query.mock;
  return typeof mock === 'string' ? mock : '';
}

function getMockHtml(fileName) {
  return fs.readFileSync(path.join(MOCK_DIR, fileName), 'utf8');
}

function sendMockFailure(res, mode) {
  if (mode === 'timeout') {
    res.status(504).json({
      ok: false,
      error: {
        code: 'TIMEOUT',
        message: 'Сайт электронной регистратуры не отвечает. Попробуйте позже.'
      }
    });
    return true;
  }

  if (mode === '500') {
    res.status(500).json({
      ok: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Сервер регистратуры временно недоступен. Попробуйте позже.'
      }
    });
    return true;
  }

  if (mode === 'empty') {
    res.status(502).json({
      ok: false,
      error: {
        code: 'EMPTY_RESPONSE',
        message: 'Сервер регистратуры вернул пустой ответ. Попробуйте позже.'
      }
    });
    return true;
  }

  return false;
}

function responseStatus(result) {
  if (result.error.code === 'BAD_REQUEST') return 400;
  if (result.error.code === 'NOT_FOUND') return 404;
  if (result.error.code === 'TIMEOUT') return 504;
  return 502;
}

function sendResult(res, result) {
  return res.status(result.ok ? 200 : responseStatus(result)).json(result);
}

function parseError(message) {
  return {
    ok: false,
    error: {
      code: 'PARSE_ERROR',
      message
    }
  };
}

async function fetchPage(url, method, data) {
  const result = await safeRequest(url, method, data);
  if (!result.ok) return result;
  if (!String(result.data).trim()) {
    return {
      ok: false,
      error: {
        code: 'EMPTY_RESPONSE',
        message: 'Сервер регистратуры вернул пустой ответ. Попробуйте позже.'
      }
    };
  }
  return result;
}

router.get('/districts', asyncRoute(async (req, res) => {
  const mock = getMockMode(req);
  if (mock && sendMockFailure(res, mock)) return;

  if (mock === 'success' || mock === 'malformed' || mock === 'no-talons') {
    return sendResult(res, parseDistricts(getMockHtml('districts.html')));
  }

  const result = await fetchPage(`${BASE_URL}/4DACTION/TalonyWeb_Uchastki`);
  if (!result.ok) return sendResult(res, result);
  return sendResult(res, parseDistricts(result.data));
}));

router.get('/specialties', asyncRoute(async (req, res) => {
  const mock = getMockMode(req);
  if (mock && sendMockFailure(res, mock)) return;

  if (mock === 'success' || mock === 'malformed' || mock === 'no-talons') {
    return sendResult(res, parseSpecialties(getMockHtml('specialties.html')));
  }

  const result = await fetchPage(`${BASE_URL}/4DACTION/TalonyWeb_SelectSpec`);
  if (!result.ok) return sendResult(res, result);
  return sendResult(res, parseSpecialties(result.data));
}));

router.get('/csrf', csrfToken);

router.post('/talons', verifyCsrf, asyncRoute(async (req, res) => {
  const { districtId, specialtyId, date, time } = req.body;
  if (typeof districtId !== 'string' || typeof specialtyId !== 'string' ||
      !districtId || !/^Check[A-Za-z0-9_-]+$/.test(specialtyId)) {
    return res.status(400).json({
      ok: false,
      error: {
        code: 'BAD_REQUEST',
        message: 'Не выбраны корректные участок и специальность.'
      }
    });
  }

  const mock = getMockMode(req);
  if (mock && sendMockFailure(res, mock)) return;

  let html;
  if (mock === 'success') {
    html = getMockHtml('success.html');
  } else if (mock === 'malformed') {
    html = getMockHtml('malformed.html');
  } else if (mock === 'no-talons') {
    html = getMockHtml('empty.html');
  } else {
    const formData = {
      vtxtform: 'SelectSpec',
      vtxtTypePart: 'SelectSpec',
      vlStrahSectorID: districtId,
      [specialtyId]: 'on'
    };
    if (typeof date === 'string' && date) formData.date = date;
    if (typeof time === 'string' && time) formData.time = time;

    const result = await fetchPage(
      `${BASE_URL}/4DACTION/TalonyWeb_TalonyList`,
      'POST',
      formData
    );
    if (!result.ok) return sendResult(res, result);
    html = result.data;
  }

  if (mock === 'malformed') {
    return sendResult(res, parseError(
      'Не удалось обработать данные с сайта. Возможно, изменилась структура страницы.'
    ));
  }

  const data = {
    districtName: String(req.body.districtName || ''),
    specialtyName: String(req.body.specialtyName || '')
  };
  return sendResult(res, parseTalons(html, data));
}));

router.post('/book', verifyCsrf, asyncRoute(async (req, res) => {
  const { talonId } = req.body;
  if (typeof talonId !== 'string' || !/^Check[A-Za-z0-9_-]+$/.test(talonId)) {
    return res.status(400).json({
      ok: false,
      error: {
        code: 'BAD_REQUEST',
        message: 'Не указан корректный ID талона.'
      }
    });
  }

  const mock = getMockMode(req);
  if (mock && sendMockFailure(res, mock)) return;
  if (mock === 'success' || mock === 'no-talons') {
    return res.json({ ok: true, data: { message: 'Мок-запись успешно выполнена.' } });
  }
  if (mock === 'malformed') {
    return sendResult(res, parseError(
      'Не удалось обработать данные с сайта. Возможно, изменилась структура страницы.'
    ));
  }

  const result = await fetchPage(
    `${BASE_URL}/4DACTION/TalonyWeb_WriteTalony`,
    'POST',
    { [talonId]: 'on' }
  );
  if (!result.ok) return sendResult(res, result);

  return res.json({
    ok: true,
    data: { message: 'Запрос на запись отправлен. Проверьте подтверждение на сайте регистратуры.' }
  });
}));

module.exports = router;
