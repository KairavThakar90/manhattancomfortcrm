import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import App from './App';

// We mock some elements that require actual window/browser APIs or heavy context
vi.mock('./routes/AppRoutes', () => ({
  default: () => <div data-testid="app-routes" />,
}));

describe('App Component', () => {
  it('renders the App successfully', () => {
    const { getByTestId } = render(<App />);
    expect(getByTestId('app-routes')).toBeInTheDocument();
  });
});
