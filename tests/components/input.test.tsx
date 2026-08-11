/**
 * T-fix — Input hint prop accessibility contract.
 * The password requirements hint must be announced to assistive technology by
 * being listed in the input's aria-describedby alongside the error message.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { Input } from '@/components/ui/input';

describe('Input — hint accessibility (T-fix)', () => {
  it('associates hint and error texts with the input via aria-describedby', () => {
    render(
      <Input
        id="password"
        label="Contraseña"
        hint="Mínimo 6 caracteres"
        error="Requerida"
      />
    );

    const input = screen.getByLabelText('Contraseña');
    const describedBy = input.getAttribute('aria-describedby');

    expect(describedBy).toBeTruthy();
    expect(describedBy).toContain(screen.getByText('Mínimo 6 caracteres').id);
    expect(describedBy).toContain(screen.getByText('Requerida').id);
  });

  it('does not announce a hint when none is provided', () => {
    render(<Input id="email" label="Email" />);

    expect(
      screen.getByLabelText('Email').getAttribute('aria-describedby')
    ).toBeNull();
  });
});
