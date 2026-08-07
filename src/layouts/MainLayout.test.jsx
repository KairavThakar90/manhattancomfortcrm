import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MainLayout from './MainLayout';
import { BrowserRouter } from 'react-router-dom';

// Mock the hook and modules used
vi.mock('../hooks/useCRM', () => ({
  useCRM: () => ({
    userRole: 'Admin',
    user: { full_name: 'Test Setup User', email: 'test@example.com' },
    notifications: [],
    handleTriggerSync: vi.fn(),
    handleNotificationClick: vi.fn(),
    handleMarkAllNotificationsRead: vi.fn(),
    setSelectedPOId: vi.fn(),
    setIsAuthenticated: vi.fn(),
  }),
}));

vi.mock('../features/auth/services/auth.service', () => ({
  logout: vi.fn(),
}));

// Provide a mock for Outlet
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    Outlet: () => <div data-testid="outlet" />,
  };
});

describe('MainLayout Component', () => {
  it('renders without crashing', () => {
    render(
      <BrowserRouter>
        <MainLayout />
      </BrowserRouter>,
    );
    expect(screen.getByTestId('outlet')).toBeInTheDocument();
  });

  it('displays the user name in the header profile section', () => {
    render(
      <BrowserRouter>
        <MainLayout />
      </BrowserRouter>,
    );
    // Looking for the user's name that we mocked
    expect(screen.getByText('Test Setup User')).toBeInTheDocument();
  });
});
