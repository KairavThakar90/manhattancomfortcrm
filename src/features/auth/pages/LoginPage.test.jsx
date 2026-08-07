import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from '../../../store';
import LoginPage from './LoginPage';

vi.mock('../../../hooks/useCRM', () => ({
  useCRM: () => ({
    setIsAuthenticated: vi.fn(),
  }),
}));

describe('LoginPage Feature', () => {
  it('renders the LoginPage component without crashing', () => {
    const { container } = render(
      <Provider store={store}>
        <BrowserRouter>
          <LoginPage />
        </BrowserRouter>
      </Provider>,
    );
    expect(container).toBeTruthy();
  });
});
