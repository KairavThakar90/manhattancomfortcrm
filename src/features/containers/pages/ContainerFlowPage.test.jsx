import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from '../../../store';
import ContainerFlowPage from './ContainerFlowPage';

vi.mock('../../../hooks/useCRM', () => ({
  useCRM: () => ({
    userRole: 'Admin',
    containers: [],
  }),
}));

describe('ContainerFlowPage Feature', () => {
  it('renders the ContainerFlowPage component without crashing', () => {
    const { container } = render(
      <Provider store={store}>
        <BrowserRouter>
          <ContainerFlowPage />
        </BrowserRouter>
      </Provider>,
    );
    expect(container).toBeTruthy();
  });
});
