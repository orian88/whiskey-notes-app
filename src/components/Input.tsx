import React, { useRef, useEffect } from 'react';

interface IInputProps {
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  className?: string;
  style?: React.CSSProperties;
  required?: boolean;
  disabled?: boolean;
  step?: string;
  showClearButton?: boolean;
  showSearchIcon?: boolean;
}

const Input: React.FC<IInputProps> = ({ 
  type = 'text',
  placeholder,
  value,
  onChange,
  onKeyDown,
  className = '',
  style,
  required = false,
  disabled = false,
  step,
  showClearButton = false,
  showSearchIcon = false
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  // 비제어 컴포넌트 방식: 외부에서 value가 변경될 때만 input 값을 업데이트
  useEffect(() => {
    if (inputRef.current && value !== undefined) {
      inputRef.current.value = value;
    }
  }, [value]);

  const handleInput = () => {
    if (onChange && inputRef.current) {
      onChange(inputRef.current.value);
    }
  };

  const handleClear = () => {
    if (inputRef.current) {
      inputRef.current.value = '';
      if (onChange) {
        onChange('');
      }
    }
  };

  if ((showClearButton || showSearchIcon) && type === 'text') {
    return (
      <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
        {showSearchIcon && (
          <span style={{ 
            position: 'absolute', 
            left: '12px', 
            top: '50%', 
            transform: 'translateY(-50%)', 
            color: '#9CA3AF',
            fontSize: '16px',
            zIndex: 1
          }}>
            🔍
          </span>
        )}
        <input
          ref={inputRef}
          type={type}
          placeholder={placeholder}
          defaultValue={value}
          onInput={handleInput}
          onKeyDown={onKeyDown}
          required={required}
          disabled={disabled}
          style={{
            ...style,
            paddingLeft: showSearchIcon ? '40px' : style?.paddingLeft || '12px',
            paddingRight: showClearButton ? '40px' : style?.paddingRight || '12px'
          }}
          step={step}
          className={`input ${className}`}
        />
        {showClearButton && value && value.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            style={{
              position: 'absolute',
              right: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '16px',
              color: '#9CA3AF',
              padding: '4px',
              borderRadius: '50%',
              width: '20px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f3f4f6';
              e.currentTarget.style.color = '#374151';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#9CA3AF';
            }}
          >
            ×
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
      {showSearchIcon && (
        <span style={{ 
          position: 'absolute', 
          left: '12px', 
          top: '50%', 
          transform: 'translateY(-50%)', 
          color: '#9CA3AF',
          fontSize: '16px',
          zIndex: 1
        }}>
          🔍
        </span>
      )}
      <input
        ref={inputRef}
        type={type}
        placeholder={placeholder}
        defaultValue={value}
        onInput={handleInput}
        onKeyDown={onKeyDown}
        required={required}
        disabled={disabled}
        style={{
          ...style,
          paddingLeft: showSearchIcon ? '40px' : style?.paddingLeft || '12px'
        }}
        step={step}
        className={`input ${className}`}
      />
    </div>
  );
};

export default Input;