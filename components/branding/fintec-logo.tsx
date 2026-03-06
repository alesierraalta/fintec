'use client';

import { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

type FinTecLogoProps = {
  containerClassName: string;
  className?: string;
  alt?: string;
  priority?: boolean;
  sizes?: string;
  fallbackText?: string;
  fallbackClassName?: string;
};

export function FinTecLogo({
  containerClassName,
  className,
  alt = 'FinTec Logo',
  priority = false,
  sizes = '100vw',
  fallbackText = 'FinTec',
  fallbackClassName,
}: FinTecLogoProps) {
  const [hasError, setHasError] = useState(false);

  return (
    <div className={cn('relative', containerClassName)}>
      {hasError ? (
        <div
          className={cn(
            'flex h-full w-full items-center justify-center px-2 font-bold text-white',
            fallbackClassName
          )}
        >
          {fallbackText}
        </div>
      ) : (
        <Image
          src="/finteclogodark.jpg"
          alt={alt}
          fill
          className={cn('object-contain', className)}
          priority={priority}
          sizes={sizes}
          loading={priority ? 'eager' : 'lazy'}
          onError={() => setHasError(true)}
        />
      )}
    </div>
  );
}
