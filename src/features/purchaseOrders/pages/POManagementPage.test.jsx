import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from '../../../store';
import POManagementPage from './POManagementPage';

// Mock API and custom Hooks
vi.mock('../../../hooks/useCRM', () => ({
  useCRM: () => ({
    userRole: 'Admin',
    user: { full_name: 'Test Setup User' },
    purchaseOrders: [],
    vendors: [],
    comments: [],
    emailLogs: [],
    selectedPOId: null,
    setSelectedPOId: vi.fn(),
    handleUpdatePOs: vi.fn(),
  }),
}));

describe('POManagementPage Feature', () => {
  it('renders the POManagementPage component without crashing', () => {
    const { container } = render(
      <Provider store={store}>
        <BrowserRouter>
          <POManagementPage />
        </BrowserRouter>
      </Provider>,
    );
    expect(container).toBeTruthy();
  });

  it('renders smart search input field', () => {
    const { getByPlaceholderText } = render(
      <Provider store={store}>
        <BrowserRouter>
          <POManagementPage />
        </BrowserRouter>
      </Provider>,
    );
    const searchInput = getByPlaceholderText(/Smart Search/i);
    expect(searchInput).toBeTruthy();
  });

  it('renders buttons correctly', () => {
    const { getAllByRole } = render(
      <Provider store={store}>
        <BrowserRouter>
          <POManagementPage />
        </BrowserRouter>
      </Provider>,
    );
    // Sanity check to ensure buttons render
    const buttons = getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });
});
