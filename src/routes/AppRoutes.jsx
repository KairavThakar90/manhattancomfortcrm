import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import ProtectedRoute from '../features/auth/components/ProtectedRoute';
import LoginPage from '../features/auth/pages/LoginPage';

import NotFoundPage from '../pages/NotFoundPage';
import { appRoutes } from './routes';
import { RefreshCw } from 'lucide-react';

const LoadingFallback = () => (
  <div className="bg-mc-white/95 fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-4 backdrop-blur-sm">
    <RefreshCw className="text-mc-gold h-8 w-8 animate-spin" />
    <span className="text-mc-black text-sm font-semibold">Loading...</span>
  </div>
);

export default function AppRoutes() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            {/* Redirect root to purchase orders */}
            <Route
              path="/"
              element={<Navigate to="/purchase-orders" replace />}
            />

            {/* Map dynamic routes */}
            {appRoutes.map((route) => (
              <Route
                key={route.path}
                path={route.path}
                element={route.element}
              />
            ))}

            {/* 404 Route */}
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
