import React from 'react';
import { useLoadingStore } from '../stores';

const Waitform: React.FC = () => {
  const { isLoading, message } = useLoadingStore();

  if (!isLoading) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      backdropFilter: 'blur(2px)'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        padding: '32px',
        maxWidth: '400px',
        width: '90%',
        textAlign: 'center',
        border: '1px solid rgba(229, 231, 235, 0.8)'
      }}>
        {/* Loading Spinner */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '24px'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid #f3f4f6',
            borderTop: '4px solid #d97706',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
        </div>
        
        {/* Loading Message */}
        <p style={{
          color: '#374151',
          fontSize: '18px',
          fontWeight: '600',
          margin: 0,
          lineHeight: '1.5'
        }}>
          {message}
        </p>
      </div>
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Waitform;
