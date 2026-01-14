import React, { useState, useRef, useEffect } from 'react';
import './SearchableSelect.css';

const SearchableSelect = ({ 
  label,
  error,
  options = [],
  placeholder = 'Sélectionner...',
  value,
  onChange,
  disabled = false,
  required = false,
  className = '',
  name,
  ...props 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredOptions, setFilteredOptions] = useState(options);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Get selected option label
  const selectedOption = options.find(opt => opt.value === value);
  const displayValue = selectedOption ? selectedOption.label : '';

  // Filter options based on search term
  useEffect(() => {
    if (searchTerm) {
      const filtered = options.filter(option =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (option.code && option.code.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredOptions(filtered);
    } else {
      setFilteredOptions(options);
    }
  }, [searchTerm, options]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        if (!value) {
          setSearchTerm('');
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [value]);

  const handleSelect = (option) => {
    // Create synthetic event
    const syntheticEvent = {
      target: {
        name: name,
        value: option.value,
        // Pass the searched name for new clients
        searchedName: option.value === 'new' ? option.label : undefined
      }
    };
    onChange(syntheticEvent);
    setIsOpen(false);
    setSearchTerm(option.value === 'new' ? '' : option.label);
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    setIsOpen(true);
    
    // Clear selection if user is typing
    if (value && newValue !== displayValue) {
      const syntheticEvent = {
        target: {
          name: name,
          value: ''
        }
      };
      onChange(syntheticEvent);
    }
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    if (value && displayValue) {
      setSearchTerm('');
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    const syntheticEvent = {
      target: {
        name: name,
        value: ''
      }
    };
    onChange(syntheticEvent);
    setSearchTerm('');
    setIsOpen(false);
  };

  // Display value in input
  const inputValue = searchTerm || (value && displayValue) || '';

  // Show create new option when no results and search term exists
  const showCreateNew = searchTerm && filteredOptions.length === 0;

  return (
    <div className={`searchable-select-wrapper ${className}`} ref={dropdownRef}>
      {label && (
        <label className="searchable-select-label">
          {label}
          {required && <span className="required">*</span>}
        </label>
      )}
      
      <div className="searchable-select-input-container">
        <input
          ref={inputRef}
          type="text"
          className={`searchable-select-input ${error ? 'searchable-select-error' : ''} ${disabled ? 'disabled' : ''}`}
          placeholder={placeholder}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          disabled={disabled}
          autoComplete="off"
        />
        
        <div className="searchable-select-icons">
          {value && !disabled && (
            <button
              type="button"
              className="clear-button"
              onClick={handleClear}
              aria-label="Effacer"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {isOpen && filteredOptions.length > 0 && (
        <div className="searchable-select-dropdown">
          <div className="options-list">
            {filteredOptions.map((option, index) => (
              <div
                key={index}
                className={`option-item ${option.value === value ? 'selected' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelect(option);
                }}
              >
                <div>
                  <div className="option-label">{option.label}</div>
                  {option.code && (
                    <div className="option-code">{option.code}</div>
                  )}
                </div>
                {option.value === value && (
                  <span className="check-mark">✓</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {showCreateNew && (
        <div className="searchable-select-dropdown">
          <div className="create-new-option"
            onClick={(e) => {
              e.stopPropagation();
              handleSelect({ value: 'new', label: searchTerm });
            }}
          >
            <div className="create-new-content">
              <div>
                <div className="create-new-label">Créer un nouveau client</div>
                <div className="create-new-name">"{searchTerm}"</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isOpen && filteredOptions.length === 0 && !searchTerm && (
        <div className="searchable-select-dropdown">
          <div className="no-options">Aucun résultat trouvé</div>
        </div>
      )}

      {error && <span className="error-message">{error}</span>}
    </div>
  );
};

export default SearchableSelect;
