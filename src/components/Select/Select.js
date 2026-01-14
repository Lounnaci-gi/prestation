import React from 'react';
import './Select.css';

const Select = ({ 
  label,
  error,
  options = [],
  placeholder = 'Sélectionner...',
  value,
  onChange,
  disabled = false,
  required = false,
  className = '',
  ...props 
}) => {
  return (
    <div className={`select-wrapper ${className}`}>
      {label && (
        <label className="select-label">
          {label}
          {required && <span className="required">*</span>}
        </label>
      )}
      <select
        className={`select ${error ? 'select-error' : ''}`}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
        {...props}
      >
        <option value="">{placeholder}</option>
        {options.map((option, index) => (
          <option key={index} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <span className="error-message">{error}</span>}
    </div>
  );
};

export default Select;
