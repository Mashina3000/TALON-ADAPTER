const axios = require('axios');
const { wrapper } = require('axios-cookiejar-support');
const { CookieJar } = require('tough-cookie');

const jar = new CookieJar();

const client = wrapper(axios.create({
  jar,
  timeout: 10000,
  validateStatus: () => true
}));

async function safeRequest(url, method = 'GET', data = null) {
  try {
    const body = data && method.toUpperCase() !== 'GET'
      ? new URLSearchParams(data).toString()
      : data;
    const response = await client({
      url,
      method,
      data: body,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });

    if (response.status === 404) {
      return {
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Страница регистратуры не найдена. Возможно, адрес изменился.'
        }
      };
    }

    if (response.status >= 400 && response.status < 500) {
      return {
        ok: false,
        error: {
          code: 'CLIENT_ERROR',
          message: 'Сервер регистратуры отклонил запрос. Проверьте параметры.'
        }
      };
    }

    if (response.status >= 500) {
      return {
        ok: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Сервер регистратуры временно недоступен. Попробуйте позже.'
        }
      };
    }

    if (!response.data || String(response.data).trim() === '') {
      return {
        ok: false,
        error: {
          code: 'EMPTY_RESPONSE',
          message: 'Сервер регистратуры вернул пустой ответ. Попробуйте позже.'
        }
      };
    }

    return { ok: true, data: response.data };
  } catch (error) {
    console.error(`HTTP request error for ${url}:`, error.message);

    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
      return {
        ok: false,
        error: {
          code: 'TIMEOUT',
          message: 'Сайт электронной регистратуры не отвечает. Попробуйте позже.'
        }
      };
    }

    if (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN') {
      return {
        ok: false,
        error: {
          code: 'DNS_ERROR',
          message: 'Не удалось найти сайт электронной регистратуры. Проверьте адрес.'
        }
      };
    }

    if (error.code === 'ECONNREFUSED' || error.code === 'ENETDOWN' || error.code === 'ENETUNREACH' || error.code === 'EHOSTUNREACH') {
      return {
        ok: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'Нет подключения к интернету. Проверьте сеть и попробуйте снова.'
        }
      };
    }

    return {
      ok: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'Произошла непредвиденная ошибка сети.'
      }
    };
  }
}

module.exports = { safeRequest };
