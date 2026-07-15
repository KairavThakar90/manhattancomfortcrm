import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { CRMProvider } from './context/CRMContext';
import AppRoutes from './routes/AppRoutes';

export default function App() {
    return (
        <Router>
            <CRMProvider>
                <AppRoutes />
            </CRMProvider>
        </Router>
    );
}
