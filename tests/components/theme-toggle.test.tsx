import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeToggle } from '@/components/theme-toggle';
import { useTheme } from 'next-themes';

// Mock next-themes
jest.mock('next-themes', () => ({
  useTheme: jest.fn(),
}));

describe('ThemeToggle', () => {
  const mockSetTheme = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useTheme as jest.Mock).mockReturnValue({
      resolvedTheme: 'light',
      setTheme: mockSetTheme,
    });
  });

  it('renders Dark Mode toggle when in light mode', () => {
    render(<ThemeToggle />);
    expect(screen.getByText('Dark Mode')).toBeInTheDocument();
  });

  it('renders Light Mode toggle when in dark mode', () => {
    (useTheme as jest.Mock).mockReturnValue({
      resolvedTheme: 'dark',
      setTheme: mockSetTheme,
    });
    render(<ThemeToggle />);
    expect(screen.getByText('Light Mode')).toBeInTheDocument();
  });

  it('calls setTheme with dark when currently light and clicked', () => {
    render(<ThemeToggle />);
    const button = screen.getByRole('button', { name: /toggle theme/i });
    fireEvent.click(button);
    expect(mockSetTheme).toHaveBeenCalledWith('dark');
  });

  it('calls setTheme with light when currently dark and clicked', () => {
    (useTheme as jest.Mock).mockReturnValue({
      resolvedTheme: 'dark',
      setTheme: mockSetTheme,
    });
    render(<ThemeToggle />);
    const button = screen.getByRole('button', { name: /toggle theme/i });
    fireEvent.click(button);
    expect(mockSetTheme).toHaveBeenCalledWith('light');
  });

  it('hides text when isMinimized is true', () => {
    render(<ThemeToggle isMinimized />);
    // The text should not be rendered
    expect(screen.queryByText('Dark Mode')).not.toBeInTheDocument();
  });
});
