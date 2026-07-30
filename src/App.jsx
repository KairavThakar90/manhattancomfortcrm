import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import { CRMProvider } from './context/CRMContext';
import AppRoutes from './routes/AppRoutes';
import { ToastContainer } from 'react-toastify';
import ErrorBoundary from './components/ErrorBoundary';
import 'react-toastify/dist/ReactToastify.css';

export default function App() {
  return (
    <Provider store={store}>
      <ErrorBoundary>
        <Router>
          <CRMProvider>
            <AppRoutes />
          </CRMProvider>
        </Router>
      </ErrorBoundary>
      <ToastContainer position="top-right" autoClose={3000} />
      <ToastContainer position="top-right" autoClose={3000} />
    </Provider>
  );
}
