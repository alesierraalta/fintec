import React from 'react';
import { render, screen } from '@testing-library/react';
import { FormattedMarkdown } from '@/components/ai/formatted-markdown';

describe('FormattedMarkdown', () => {
  it('renders inline bold, italic, and code', () => {
    render(
      <FormattedMarkdown content="Gasté **$50.00** en *comida* usando `Cartera`." />
    );

    const bold = screen.getByText('$50.00');
    expect(bold.tagName).toBe('STRONG');

    const italic = screen.getByText('comida');
    expect(italic.tagName).toBe('EM');

    const code = screen.getByText('Cartera');
    expect(code.tagName).toBe('CODE');
  });

  it('renders headings correctly', () => {
    render(
      <FormattedMarkdown
        content={`# Título Principal
## Subtítulo
### Sección`}
      />
    );

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Título Principal'
    );
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
      'Subtítulo'
    );
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent(
      'Sección'
    );
  });

  it('renders unordered and ordered lists', () => {
    render(
      <FormattedMarkdown
        content={`- Manzanas
- Peras
- Naranjas

1. Primer paso
2. Segundo paso`}
      />
    );

    expect(screen.getByText('Manzanas')).toBeInTheDocument();
    expect(screen.getByText('Peras')).toBeInTheDocument();
    expect(screen.getByText('Primer paso')).toBeInTheDocument();
  });

  it('renders code blocks', () => {
    render(
      <FormattedMarkdown
        content={`\`\`\`ts
const total = 100;
console.log(total);
\`\`\``}
      />
    );

    expect(screen.getByText(/const total = 100;/)).toBeInTheDocument();
  });

  it('renders links and prevents javascript: protocol injection', () => {
    render(
      <FormattedMarkdown content="Visita [Google](https://google.com) o prueba [XSS](javascript:alert(1))." />
    );

    const safeLink = screen.getByRole('link', { name: 'Google' });
    expect(safeLink).toHaveAttribute('href', 'https://google.com');

    const unsafeLink = screen.getByRole('link', { name: 'XSS' });
    expect(unsafeLink).toHaveAttribute('href', '#');
  });

  it('handles empty or null content gracefully', () => {
    const { container } = render(<FormattedMarkdown content="" />);
    expect(container).toBeEmptyDOMElement();
  });
});
