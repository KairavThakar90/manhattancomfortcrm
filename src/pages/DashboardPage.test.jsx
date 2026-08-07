import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from '../store';
import DashboardPage from './DashboardPage';

vi.stubGlobal(
  'ResizeObserver',
  class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

vi.mock('../hooks/useCRM', () => ({
  useCRM: () => ({
    userRole: 'Admin',
    purchaseOrders: [],
    vendors: [],
    containers: [],
    syncLogs: [],
    handleTriggerSync: vi.fn(),
    setSelectedPOId: vi.fn(),
  }),
}));

describe('DashboardPage Feature', () => {
  it('renders the DashboardPage component without crashing', () => {
    const { container } = render(
      <Provider store={store}>
        <BrowserRouter>
          <DashboardPage />
        </BrowserRouter>
      </Provider>,
    );
    expect(container).toBeTruthy();
  });
});
