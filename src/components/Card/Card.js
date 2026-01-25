import React from 'react';
import './Card.css';

const Card = ({ 
  children, 
  title, 
  subtitle, 
  className = '', 
  onClick,
  ...props 
}) => {
  return (
    <div 
      className={`card ${className}`}
      onClick={onClick}
      {...props}
    >
      {(title || subtitle) && (
        <div className="card-header">
          {title && <h3 className="card-title">{title}</h3>}
          {subtitle && <p className="card-subtitle">{subtitle}</p>}
        </div>
      )}
      <div className="card-content">
        {children}
      </div>
    </div>
  );
};

export default Card;
