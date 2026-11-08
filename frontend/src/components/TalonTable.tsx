import React, { useMemo, useState } from 'react';
import type { Talon } from '../api/client';

interface TalonTableProps {
  talons: Talon[];
  bookingId: string | null;
  onBook: (id: string) => void;
}

type SortField = 'date' | 'time' | 'doctor';

function dateValue(value: string): number {
  const match = value.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!match) return Number.MAX_SAFE_INTEGER;
  return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1])).getTime();
}

export const TalonTable: React.FC<TalonTableProps> = ({ talons, bookingId, onBook }) => {
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortAscending, setSortAscending] = useState(true);

  const sortedTalons = useMemo(() => [...talons].sort((a, b) => {
    let comparison: number;
    if (sortField === 'date') {
      comparison = dateValue(a.date) - dateValue(b.date);
    } else if (sortField === 'time') {
      comparison = a.time.localeCompare(b.time);
    } else {
      comparison = a.doctor.localeCompare(b.doctor, 'ru');
    }
    return sortAscending ? comparison : -comparison;
  }), [talons, sortField, sortAscending]);

  const selectSort = (field: SortField) => {
    if (field === sortField) {
      setSortAscending((current) => !current);
    } else {
      setSortField(field);
      setSortAscending(true);
    }
  };

  if (talons.length === 0) {
    return <p className="no-data">Талоны по заданным критериям не найдены.</p>;
  }

  return (
    <section className="results" aria-label="Результаты поиска">
      <div className="sort-controls" aria-label="Сортировка талонов">
        <span>Сортировать:</span>
        {([
          ['date', 'По дате'],
          ['time', 'По времени'],
          ['doctor', 'По врачу']
        ] as const).map(([field, label]) => (
          <button
            type="button"
            key={field}
            aria-pressed={sortField === field}
            onClick={() => selectSort(field)}
          >
            {label} {sortField === field ? (sortAscending ? '↑' : '↓') : ''}
          </button>
        ))}
      </div>

      <ul className="talon-list">
        {sortedTalons.map((talon) => (
          <li className="talon-card" key={talon.id}>
            <div className="talon-card__main">
              <strong className="talon-time">{talon.date}, {talon.time}</strong>
              <span>{talon.doctor}</span>
              <span className="talon-meta">
                {[talon.specialty, talon.district && `Участок: ${talon.district}`, `Кабинет: ${talon.cabinet}`]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </div>
            <button
              type="button"
              className="book-btn"
              disabled={bookingId !== null}
              onClick={() => onBook(talon.id)}
            >
              {bookingId === talon.id ? 'Отправка…' : 'Записаться'}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
};
