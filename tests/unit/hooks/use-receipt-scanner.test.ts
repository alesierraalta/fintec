import { act, renderHook } from '@testing-library/react';
import { compressImage, useReceiptScanner } from '@/hooks/use-receipt-scanner';

describe('use-receipt-scanner / compressImage', () => {
  it('passes PDFs through without canvas conversion', async () => {
    const canvas = jest.spyOn(document, 'createElement');
    const result = await compressImage(
      new File(['pdf'], 'receipt.pdf', { type: 'application/pdf' })
    );
    expect(result).toBe('data:application/pdf;base64,cGRm');
    expect(canvas).not.toHaveBeenCalledWith('canvas');
    canvas.mockRestore();
  });

  it('does not call the endpoint for an undecodable HEIC', async () => {
    const original = global.Image;
    const fetchSpy = jest.spyOn(global, 'fetch');
    class BadImage {
      onerror: (() => void) | null = null;
      set src(_value: string) {
        this.onerror?.();
      }
    }
    (global as any).Image = BadImage;
    try {
      const { result } = renderHook(() => useReceiptScanner());
      await act(async () =>
        result.current.scanFile(
          new File(['heic'], 'receipt.heic', { type: 'image/heic' })
        )
      );
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(result.current.error).toContain('Conviértelo a JPG o PNG');
    } finally {
      global.Image = original;
      fetchSpy.mockRestore();
    }
  });

  it('rejects an undecodable HEIC with conversion advice', async () => {
    const original = global.Image;
    class BadImage {
      onerror: (() => void) | null = null;
      set src(_value: string) {
        this.onerror?.();
      }
    }
    (global as any).Image = BadImage;
    try {
      await expect(
        compressImage(
          new File(['heic'], 'receipt.heic', { type: 'image/heic' })
        )
      ).rejects.toThrow('Conviértelo a JPG o PNG');
    } finally {
      global.Image = original;
    }
  });
  it('returns rawBase64 when canvas throws an exception inside onload', async () => {
    const mockFile = new File(['test-image-binary'], 'receipt.jpg', {
      type: 'image/jpeg',
    });

    const originalImage = global.Image;
    const originalCreateElement = document.createElement.bind(document);

    try {
      // Simulate canvas throwing an error during context creation or drawing
      jest
        .spyOn(document, 'createElement')
        .mockImplementation((tagName: string) => {
          if (tagName.toLowerCase() === 'canvas') {
            const fakeCanvas = originalCreateElement('canvas');
            jest.spyOn(fakeCanvas, 'getContext').mockImplementation(() => {
              throw new Error('Canvas context error');
            });
            return fakeCanvas;
          }
          return originalCreateElement(tagName);
        });

      // Mock Image constructor
      class MockImage {
        width = 2000;
        height = 1000;
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        private _src = '';

        set src(value: string) {
          this._src = value;
          setTimeout(() => {
            if (this.onload) {
              this.onload();
            }
          }, 0);
        }

        get src() {
          return this._src;
        }
      }

      (global as any).Image = MockImage;

      const result = await compressImage(mockFile);
      // It should resolve without hanging or rejecting, falling back to raw base64 data URL
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
      expect(result).toContain('data:');
    } finally {
      (global as any).Image = originalImage;
      jest.restoreAllMocks();
    }
  });
});
