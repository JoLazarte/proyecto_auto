// main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './store/store';
import App from './App';
import './index.css';

// Loading screen while redux-persist rehydrates
function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--cream)',
      flexDirection: 'column',
      gap: '16px',
    }}>
      <svg width="40" height="40" viewBox="0 0 32 32" fill="none">
        <path d="M4 22c0-8 4-14 12-14s12 6 12 14" stroke="#C8893A" strokeWidth="2" strokeLinecap="round"/>
        <path d="M8 22c0-5 2-9 8-9s8 4 8 9" stroke="#1C1108" strokeWidth="2" strokeLinecap="round"/>
        <path d="M12 22c0-2 1-4 4-4s4 2 4 4" fill="#C8893A"/>
        <line x1="16" y1="4" x2="16" y2="10" stroke="#C8893A" strokeWidth="2" strokeLinecap="round"/>
        <circle cx="16" cy="3" r="1.5" fill="#C8893A"/>
      </svg>
      <div style={{
        width: 32, height: 32,
        border: '3px solid #EDE6DB',
        borderTopColor: '#C8893A',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <PersistGate loading={<LoadingScreen />} persistor={persistor}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </PersistGate>
    </Provider>
  </React.StrictMode>
);
