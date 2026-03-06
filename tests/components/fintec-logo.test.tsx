import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { FinTecLogo } from '@/components/branding/fintec-logo';

const mockImage = jest.fn((props: any) => {
  const { fill, priority, ...imgProps } = props;
  return <img {...imgProps} />;
});

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => mockImage(props),
}));

describe('FinTecLogo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses a fill-based image contract', () => {
    render(
      <FinTecLogo
        containerClassName="h-10 w-24"
        priority
        sizes="(max-width: 768px) 100px, 100px"
      />
    );

    const image = screen.getByAltText('FinTec Logo');
    expect(image).toBeInTheDocument();

    expect(mockImage).toHaveBeenCalledWith(
      expect.objectContaining({
        src: '/finteclogodark.jpg',
        fill: true,
        className: 'object-contain',
        priority: true,
      })
    );

    const calledProps = mockImage.mock.calls[0][0] as {
      width?: number;
      height?: number;
    };

    expect(calledProps.width).toBeUndefined();
    expect(calledProps.height).toBeUndefined();
  });

  it('shows fallback text when the image errors', () => {
    render(
      <FinTecLogo
        containerClassName="h-10 w-24"
        fallbackText="FinTec"
        fallbackClassName="text-xl"
      />
    );

    fireEvent.error(screen.getByAltText('FinTec Logo'));

    expect(screen.getByText('FinTec')).toBeInTheDocument();
    expect(screen.queryByAltText('FinTec Logo')).not.toBeInTheDocument();
  });
});
