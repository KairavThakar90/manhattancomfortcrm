import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from '../../../store';
import UserManagementPage from './UserManagementPage';

vi.mock('../../../hooks/useCRM', () => ({
  useCRM: () => ({
    userRole: 'Admin',
    users: [],
  }),
}));

describe('UserManagementPage Feature', () => {
  it('renders the UserManagementPage component without crashing', () => {
    const { container } = render(
      <Provider store={store}>
        <BrowserRouter>
          <UserManagementPage />
        </BrowserRouter>
      </Provider>,
    );
    expect(container).toBeTruthy();
  });

  it('renders the page title and Add User button', () => {
    const { getByText } = render(
      <Provider store={store}>
        <BrowserRouter>
          <UserManagementPage />
        </BrowserRouter>
      </Provider>,
    );
    // User Management title
    expect(getByText('User Management')).toBeTruthy();
    // Add User button text
    expect(getByText('Add User')).toBeTruthy();
  });

  it('renders search input field', () => {
    const { getByPlaceholderText } = render(
      <Provider store={store}>
        <BrowserRouter>
          <UserManagementPage />
        </BrowserRouter>
      </Provider>,
    );
    const searchInput = getByPlaceholderText(/Search by name or email/i);
    expect(searchInput).toBeTruthy();
  });
});
