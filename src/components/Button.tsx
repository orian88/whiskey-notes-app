import React, { memo } from 'react';

interface IButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

const Button: React.FC<IButtonProps> = memo(({ 
  children, 
  onClick, 
  type = 'button', 
  className = '',
  style,
  disabled = false,
  variant = 'primary',
  size = 'md'
}) => {
  const getVariantClass = () => {
    switch (variant) {
      case 'secondary': return 'btn-secondary';
      case 'danger': return 'btn-danger';
      default: return 'btn-primary';
    }
  };

  const getSizeClass = () => {
    switch (size) {
      case 'sm': return 'btn-sm';
      case 'lg': return 'btn-lg';
      default: return 'btn-md';
    }
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={style}
      className={`btn ${getVariantClass()} ${getSizeClass()} ${className}`}
    >
      {children}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;