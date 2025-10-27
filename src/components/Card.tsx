import React, { memo } from 'react';

interface ICardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  onMouseEnter?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseLeave?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

const Card: React.FC<ICardProps> = memo(({ children, className = '', style, onClick, onMouseEnter, onMouseLeave }) => {
  return (
    <div 
      className={`card ${className}`}
      style={style}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </div>
  );
});

Card.displayName = 'Card';

export default Card;