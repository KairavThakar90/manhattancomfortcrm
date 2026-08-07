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
});
