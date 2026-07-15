import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import ProtectedRoute from '../components/ProtectedRoute';
import LoginPage from '../pages/LoginPage';
import NotFoundPage from '../pages/NotFoundPage';
import { appRoutes } from './routes';
import { RefreshCw } from 'lucide-react';

const LoadingFallback = () => (
    <div className="flex items-center justify-center h-full w-full">
        <RefreshCw className="h-8 w-8 text-indigo-500 animate-spin" />
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
                        {/* Redirect root to dashboard */}
                        <Route path="/" element={<Navigate to="/dashboard" replace />} />

                        {/* Map dynamic routes */}
                        {appRoutes.map((route) => (
                            <Route key={route.path} path={route.path} element={route.element} />
                        ))}

                        {/* 404 Route */}
                        <Route path="*" element={<NotFoundPage />} />
                    </Route>
                </Route>
            </Routes>
        </Suspense>
    );
}
