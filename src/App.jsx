import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import { CRMProvider } from './context/CRMContext';
import AppRoutes from './routes/AppRoutes';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function App() {
  return (
    <Provider store={store}>
      <Router>
        <CRMProvider>
          <AppRoutes />
        </CRMProvider>
      </Router>
      <ToastContainer position="top-right" autoClose={3000} />
    </Provider>
  );
}
