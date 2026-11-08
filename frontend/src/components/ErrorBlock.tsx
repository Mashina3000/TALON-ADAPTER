import React from 'react';

interface ErrorBlockProps {
  message: string;
  onRetry: () => void;
}

export const ErrorBlock: React.FC<ErrorBlockProps> = ({ message, onRetry }) => (
  <div className="error-block" role="alert" aria-live="assertive">
    <p>{message}</p>
    <button type="button" className="retry-btn" onClick={onRetry}>
      Повторить
    </button>
  </div>
);
