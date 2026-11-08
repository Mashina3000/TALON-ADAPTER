import React from 'react';
import type { District, Specialty } from '../api/client';

interface FiltersProps {
  districts: District[];
  specialties: Specialty[];
  selectedDistrict: string;
  selectedSpecialty: string;
  selectedDate: string;
  selectedTime: string;
  onlyFree: boolean;
  onDistrictChange: (value: string) => void;
  onSpecialtyChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
  onOnlyFreeChange: (value: boolean) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  loading: boolean;
}

export const Filters: React.FC<FiltersProps> = ({
  districts,
  specialties,
  selectedDistrict,
  selectedSpecialty,
  selectedDate,
  selectedTime,
  onlyFree,
  onDistrictChange,
  onSpecialtyChange,
  onDateChange,
  onTimeChange,
  onOnlyFreeChange,
  onSubmit,
  loading
}) => (
  <form className="filters-form" onSubmit={onSubmit}>
    <div className="filter-field">
      <label htmlFor="district-select">Участок</label>
      <select
        id="district-select"
        value={selectedDistrict}
        onChange={(event) => onDistrictChange(event.target.value)}
        required
      >
        <option value="">Выберите участок</option>
        {districts.map((district) => (
          <option key={district.id} value={district.id}>{district.name}</option>
        ))}
      </select>
    </div>

    <div className="filter-field">
      <label htmlFor="specialty-select">Специальность</label>
      <select
        id="specialty-select"
        value={selectedSpecialty}
        onChange={(event) => onSpecialtyChange(event.target.value)}
        required
      >
        <option value="">Выберите специальность</option>
        {specialties.map((specialty) => (
          <option key={specialty.id} value={specialty.id}>{specialty.name}</option>
        ))}
      </select>
    </div>

    <div className="filter-field">
      <label htmlFor="date-input">Дата</label>
      <input
        id="date-input"
        type="date"
        value={selectedDate}
        onChange={(event) => onDateChange(event.target.value)}
      />
    </div>

    <div className="filter-field">
      <label htmlFor="time-input">Время</label>
      <input
        id="time-input"
        type="time"
        value={selectedTime}
        onChange={(event) => onTimeChange(event.target.value)}
      />
    </div>

    <label className="checkbox-field" htmlFor="only-free">
      <input
        id="only-free"
        type="checkbox"
        checked={onlyFree}
        onChange={(event) => onOnlyFreeChange(event.target.checked)}
      />
      Только свободные талоны
    </label>

    <button type="submit" className="submit-btn" disabled={loading}>
      {loading ? 'Поиск…' : 'Найти талоны'}
    </button>
  </form>
);
