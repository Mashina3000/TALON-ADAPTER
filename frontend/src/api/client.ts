import axios, { AxiosError } from 'axios';

export interface District {
  id: string;
  name: string;
}

export interface Specialty {
  id: string;
  name: string;
}

export interface Talon {
  id: string;
  date: string;
  time: string;
  doctor: string;
  specialty: string;
  district: string;
  cabinet: string;
  isAvailable: boolean;
}

export type MockMode = '' | 'success' | 'timeout' | '500' | 'empty' | 'malformed' | 'no-talons';

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

const api = axios.create({
  baseURL: '/api',
  timeout: 12000,
  withCredentials: true
});

let csrfToken: string | null = null;

function failure(code: string, message: string): ApiResult<never> {
  return { ok: false, error: { code, message } };
}

function normalizeError(error: unknown): ApiResult<never> {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiResult<never>>;
    const response = axiosError.response;
    if (response?.data && !response.data.ok) return response.data;

    if (axiosError.code === 'ECONNABORTED' || axiosError.code === 'ETIMEDOUT') {
      return failure('TIMEOUT', 'Сайт электронной регистратуры не отвечает. Попробуйте позже.');
    }

    if (!response) {
      return failure('NETWORK_ERROR', 'Нет подключения к серверу. Проверьте сеть и попробуйте снова.');
    }
  }

  console.error('Registry API error:', error);
  return failure('UNKNOWN_ERROR', 'Не удалось выполнить запрос. Попробуйте позже.');
}

async function request<T>(operation: () => Promise<{ data: ApiResult<T> }>): Promise<ApiResult<T>> {
  try {
    return (await operation()).data;
  } catch (error) {
    return normalizeError(error);
  }
}

const mockParams = (mock?: MockMode) => mock ? { params: { mock } } : {};

async function postWithCsrf<T>(path: string, data: unknown, mock?: MockMode): Promise<ApiResult<T>> {
  try {
    if (!csrfToken) {
      const response = await api.get<ApiResult<{ token: string }>>('/csrf');
      if (!response.data.ok) return response.data;
      csrfToken = response.data.data.token;
    }

    return await request(() => api.post(path, data, {
      ...mockParams(mock),
      headers: { 'X-CSRF-Token': csrfToken }
    }));
  } catch (error) {
    return normalizeError(error);
  }
}

export function fetchDistricts(mock?: MockMode): Promise<ApiResult<District[]>> {
  return request(() => api.get('/districts', mockParams(mock)));
}

export function fetchSpecialties(mock?: MockMode): Promise<ApiResult<Specialty[]>> {
  return request(() => api.get('/specialties', mockParams(mock)));
}

export function fetchTalons(
  filters: {
    districtId: string;
    districtName: string;
    specialtyId: string;
    specialtyName: string;
    date: string;
    time: string;
  },
  mock?: MockMode
): Promise<ApiResult<Talon[]>> {
  return postWithCsrf('/talons', filters, mock);
}

export function bookTalon(talonId: string, mock?: MockMode): Promise<ApiResult<{ message: string }>> {
  return postWithCsrf('/book', { talonId }, mock);
}
