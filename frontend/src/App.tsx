import React, { useEffect, useMemo, useState } from 'react';
import {
  bookTalon,
  fetchDistricts,
  fetchSpecialties,
  fetchTalons
} from './api/client';
import type { ApiResult, District, MockMode, Specialty, Talon } from './api/client';
import { ErrorBlock } from './components/ErrorBlock';
import { Filters } from './components/Filters';
import { TalonTable } from './components/TalonTable';

type RetryAction = 'initial' | 'search' | 'booking';

function getError<T>(result: ApiResult<T>): string | null {
  return result.ok ? null : result.error.message;
}

function normalizeDate(value: string): string {
  const match = value.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  return match ? `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}` : '';
}

export default function App() {
  const [districts, setDistricts] = useState<District[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [talons, setTalons] = useState<Talon[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [onlyFree, setOnlyFree] = useState(false);
  const [mockMode, setMockMode] = useState<MockMode>('success');
  const [initialLoading, setInitialLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [initialError, setInitialError] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<{
    message: string;
    retry: RetryAction;
    talonId?: string;
  } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadInitialData = async () => {
    setInitialLoading(true);
    setInitialError(null);
    setRequestError(null);

    const [districtResult, specialtyResult] = await Promise.all([
      fetchDistricts(mockMode),
      fetchSpecialties(mockMode)
    ]);

    const errorMessage = getError(districtResult) || getError(specialtyResult);
    if (errorMessage) {
      setInitialError(errorMessage);
      setDistricts([]);
      setSpecialties([]);
    } else if (districtResult.ok && specialtyResult.ok) {
      setDistricts(districtResult.data);
      setSpecialties(specialtyResult.data);
    }
    setInitialLoading(false);
  };

  useEffect(() => {
    void loadInitialData();
  }, [mockMode]);

  const search = async () => {
    if (!selectedDistrict || !selectedSpecialty) {
      setRequestError({ message: 'Выберите участок и специальность.', retry: 'search' });
      return;
    }

    setSearchLoading(true);
    setRequestError(null);
    setNotice(null);

    const result = await fetchTalons({
      districtId: selectedDistrict,
      districtName: districts.find((item) => item.id === selectedDistrict)?.name || '',
      specialtyId: selectedSpecialty,
      specialtyName: specialties.find((item) => item.id === selectedSpecialty)?.name || '',
      date: selectedDate,
      time: selectedTime
    }, mockMode);

    if (result.ok) {
      setTalons(result.data);
    } else {
      setRequestError({ message: result.error.message, retry: 'search' });
    }
    setSearchLoading(false);
  };

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void search();
  };

  const handleBooking = async (talonId: string) => {
    setBookingId(talonId);
    setRequestError(null);
    setNotice(null);
    const result = await bookTalon(talonId, mockMode);
    if (result.ok) {
      setNotice(result.data.message);
    } else {
      setRequestError({ message: result.error.message, retry: 'booking', talonId });
    }
    setBookingId(null);
  };

  const retry = () => {
    if (initialError) {
      void loadInitialData();
    } else if (requestError?.retry === 'search') {
      void search();
    } else if (requestError?.retry === 'booking' && requestError.talonId) {
      void handleBooking(requestError.talonId);
    }
  };

  const visibleTalons = useMemo(() => talons.filter((talon) => {
    if (onlyFree && !talon.isAvailable) return false;
    if (selectedDate && normalizeDate(talon.date) !== selectedDate) return false;
    if (selectedTime && talon.time !== selectedTime) return false;
    return true;
  }), [talons, onlyFree, selectedDate, selectedTime]);

  const errorMessage = initialError || requestError?.message;

  return (
    <main className="app-container">
      <header className="app-header">
        <div>
          <p className="eyebrow">Пинская детская больница</p>
          <h1>Электронная регистратура</h1>
        </div>
        <div className="mock-selector">
          <label htmlFor="mock-mode">Режим данных</label>
          <select
            id="mock-mode"
            value={mockMode}
            onChange={(event) => setMockMode(event.target.value as MockMode)}
          >
            <option value="success">Мок: успешный ответ</option>
            <option value="timeout">Мок: таймаут</option>
            <option value="500">Мок: ошибка 500</option>
            <option value="empty">Мок: пустой ответ</option>
            <option value="malformed">Мок: изменённый HTML</option>
            <option value="no-talons">Мок: свободных талонов нет</option>
            <option value="">Реальный сайт</option>
          </select>
        </div>
      </header>

      {errorMessage && <ErrorBlock message={errorMessage} onRetry={retry} />}
      {notice && <div className="success-banner" role="status">{notice}</div>}

      {initialLoading && (
        <p className="loading-indicator" role="status">Загружаем участки и специальности…</p>
      )}

      {!initialLoading && !initialError && (
        <>
          <Filters
            districts={districts}
            specialties={specialties}
            selectedDistrict={selectedDistrict}
            selectedSpecialty={selectedSpecialty}
            selectedDate={selectedDate}
            selectedTime={selectedTime}
            onlyFree={onlyFree}
            onDistrictChange={setSelectedDistrict}
            onSpecialtyChange={setSelectedSpecialty}
            onDateChange={setSelectedDate}
            onTimeChange={setSelectedTime}
            onOnlyFreeChange={setOnlyFree}
            onSubmit={handleSearch}
            loading={searchLoading}
          />
          {searchLoading && <p className="loading-indicator" role="status">Ищем талоны…</p>}
          {talons.length > 0 && (
            <TalonTable talons={visibleTalons} bookingId={bookingId} onBook={(id) => void handleBooking(id)} />
          )}
          {talons.length > 0 && visibleTalons.length === 0 && (
            <p className="no-data">Нет талонов, подходящих под текущие фильтры.</p>
          )}
        </>
      )}
    </main>
  );
}
