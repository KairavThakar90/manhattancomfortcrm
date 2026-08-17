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
      <ToastContainer
        position="top-right"
        autoClose={2000}
        hideProgressBar
        closeButton={false}
        newestOnTop={true}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        toastClassName="!rounded-xl !border !border-slate-100 !bg-white !shadow-lg !min-h-[44px] !p-3 !text-sm !font-semibold !text-slate-700 !mb-2 !w-max !max-w-[320px] !mx-auto sm:!mr-4 sm:!mt-4"
        bodyClassName="!m-0 !p-0 !flex !items-center !gap-2 !font-sans"
      />
    </Provider>
  );
}
