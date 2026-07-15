import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import userEvent from '@testing-library/user-event';
import Button from './index';

describe('Button component', () => {
  it('renders correctly with given children', () => {
    render(<Button>Click Me</Button>);
    expect(screen.getByText('Click Me')).toBeInTheDocument();
  });

  it('applies custom className safely', () => {
    render(<Button className="custom-class">Test</Button>);
    const button = screen.getByText('Test');
    expect(button).toHaveClass('custom-class');
    expect(button).toHaveClass('bg-indigo-600'); // Validates default class remains
  });

  it('receives and executes onClick handler', async () => {
    const user = userEvent.setup();
    let clicked = false;
    const handleClick = () => {
      clicked = true;
    };

    render(<Button onClick={handleClick}>Click</Button>);

    await user.click(screen.getByText('Click'));
    expect(clicked).toBe(true);
  });
});
