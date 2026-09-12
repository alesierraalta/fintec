import { compressImage } from '@/hooks/use-receipt-scanner';

describe('use-receipt-scanner / compressImage', () => {
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
