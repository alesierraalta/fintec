import { render } from '@testing-library/react';
import React from 'react';

describe('RTL Diagnostic Test', () => {
    it('should render a div', () => {
        const { getByText } = render(<div>Hello World </div>);
        expect(getByText('Hello World')).toBeDefined();
    });
});
