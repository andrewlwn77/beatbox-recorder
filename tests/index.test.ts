import { Beatbox, Mode } from '../src';
import fs from 'fs/promises';

describe('Beatbox', () => {
  const testStorageFile = 'test-storage.json';
  let beatbox: Beatbox;

  // Test functions
  const syncAdd = (a: number, b: number): number => a + b;
  const asyncAdd = async (a: number, b: number): Promise<number> => {
    await new Promise((resolve) => setTimeout(resolve, 10));
    return a + b;
  };

  const syncError = (): never => {
    throw new Error('Sync error');
  };

  const asyncError = async (): Promise<never> => {
    await new Promise((resolve) => setTimeout(resolve, 10));
    throw new Error('Async error');
  };

  beforeEach(async () => {
    beatbox = new Beatbox(testStorageFile);
    // Clear storage file
    try {
      await fs.unlink(testStorageFile);
    } catch (error) {
      // Ignore if file doesn't exist
    }
  });

  afterAll(async () => {
    try {
      await fs.unlink(testStorageFile);
    } catch (error) {
      // Ignore if file doesn't exist
    }
  });

  describe('Synchronous Function Tests', () => {
    describe('BYPASS Mode', () => {
      beforeEach(() => {
        beatbox.setMode(Mode.BYPASS);
      });

      test('should execute function normally', () => {
        const wrapped = beatbox.wrap(syncAdd);
        expect(wrapped(2, 3)).toBe(5);
      });

      test('should propagate errors', () => {
        const wrapped = beatbox.wrap(syncError);
        expect(() => wrapped()).toThrow('Sync error');
      });
    });

    describe('RECORD Mode', () => {
      beforeEach(() => {
        beatbox.setMode(Mode.RECORD);
      });

      test('should record function result', async () => {
        const wrapped = beatbox.wrap(syncAdd);
        const result = wrapped(2, 3);
        expect(result).toBe(5);

        // Wait for async storage
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Verify storage
        const storage = JSON.parse(await fs.readFile(testStorageFile, 'utf-8'));
        expect(Object.values(storage)[0]).toBe(5);
      });

      test('should record error result', async () => {
        const wrapped = beatbox.wrap(syncError);
        expect(() => wrapped()).toThrow('Sync error');

        // Wait for async storage
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Verify storage file doesn't exist or is empty
        try {
          const storage = JSON.parse(await fs.readFile(testStorageFile, 'utf-8'));
          expect(Object.keys(storage)).toHaveLength(0);
        } catch (error) {
          // File might not exist, which is fine for error cases
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
            throw error;
          }
        }
      });
    });

    describe('PLAYBACK Mode', () => {
      beforeEach(async () => {
        // Pre-record some data
        beatbox.setMode(Mode.RECORD);
        const wrapped = beatbox.wrap(syncAdd);
        wrapped(2, 3);
        await new Promise((resolve) => setTimeout(resolve, 100));
        beatbox.setMode(Mode.PLAYBACK);
      });

      test('should return recorded result', () => {
        const wrapped = beatbox.wrap(syncAdd);
        expect(wrapped(2, 3)).toBe(5);
      });

      test('should throw error for missing recording', () => {
        const wrapped = beatbox.wrap(syncAdd);
        expect(() => wrapped(4, 5)).toThrow('No recorded result found');
      });
    });
  });

  describe('Asynchronous Function Tests', () => {
    describe('BYPASS Mode', () => {
      beforeEach(() => {
        beatbox.setMode(Mode.BYPASS);
      });

      test('should execute function normally', async () => {
        const wrapped = beatbox.wrap(asyncAdd);
        const result = await wrapped(2, 3);
        expect(result).toBe(5);
      });

      test('should propagate errors', async () => {
        const wrapped = beatbox.wrap(asyncError);
        await expect(wrapped()).rejects.toThrow('Async error');
      });
    });

    describe('RECORD Mode', () => {
      beforeEach(() => {
        beatbox.setMode(Mode.RECORD);
      });

      test('should record function result', async () => {
        const wrapped = beatbox.wrap(asyncAdd);
        const result = await wrapped(2, 3);
        expect(result).toBe(5);

        // Verify storage
        const storage = JSON.parse(await fs.readFile(testStorageFile, 'utf-8'));
        expect(Object.values(storage)[0]).toBe(5);
      });

      test('should record error result', async () => {
        const wrapped = beatbox.wrap(asyncError);
        await expect(wrapped()).rejects.toThrow('Async error');

        // Verify storage file doesn't exist or is empty
        try {
          const storage = JSON.parse(await fs.readFile(testStorageFile, 'utf-8'));
          expect(Object.keys(storage)).toHaveLength(0);
        } catch (error) {
          // File might not exist, which is fine for error cases
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
            throw error;
          }
        }
      });
    });

    describe('PLAYBACK Mode', () => {
      beforeEach(async () => {
        // Pre-record some data
        beatbox.setMode(Mode.RECORD);
        const wrapped = beatbox.wrap(asyncAdd);
        await wrapped(2, 3);
        beatbox.setMode(Mode.PLAYBACK);
      });

      test('should return recorded result', async () => {
        const wrapped = beatbox.wrap(asyncAdd);
        const result = await wrapped(2, 3);
        expect(result).toBe(5);
      });

      test('should throw error for missing recording', async () => {
        const wrapped = beatbox.wrap(asyncAdd);
        await expect(wrapped(4, 5)).rejects.toThrow('No recorded result found');
      });
    });
  });

  describe('Edge Cases', () => {
    test('should handle undefined arguments', async () => {
      const fn = (a?: number) => a ?? 0;
      const wrapped = beatbox.wrap(fn);

      beatbox.setMode(Mode.RECORD);
      expect(wrapped()).toBe(0);
      await new Promise((resolve) => setTimeout(resolve, 100));

      beatbox.setMode(Mode.PLAYBACK);
      expect(wrapped()).toBe(0);
    });

    test('should handle object arguments', async () => {
      const fn = (obj: { x: number; y: number }) => obj.x + obj.y;
      const wrapped = beatbox.wrap(fn);

      beatbox.setMode(Mode.RECORD);
      expect(wrapped({ x: 1, y: 2 })).toBe(3);
      await new Promise((resolve) => setTimeout(resolve, 100));

      beatbox.setMode(Mode.PLAYBACK);
      expect(wrapped({ x: 1, y: 2 })).toBe(3);
    });

    test('should handle array arguments', async () => {
      const fn = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
      const wrapped = beatbox.wrap(fn);

      beatbox.setMode(Mode.RECORD);
      expect(wrapped([1, 2, 3])).toBe(6);
      await new Promise((resolve) => setTimeout(resolve, 100));

      beatbox.setMode(Mode.PLAYBACK);
      expect(wrapped([1, 2, 3])).toBe(6);
    });

    test('should handle non-serializable results', async () => {
      const fn = () => {
        const set = new Set([1, 2, 3]);
        // Add circular reference to make it definitely non-serializable
        const obj: any = { set };
        obj.self = obj;
        return obj;
      };
      const wrapped = beatbox.wrap(fn);

      // In RECORD mode, it should still return the result but warn about serialization
      beatbox.setMode(Mode.RECORD);
      const result = wrapped();
      expect(result.set instanceof Set).toBe(true);
      await new Promise((resolve) => setTimeout(resolve, 100));

      // In PLAYBACK mode, it should throw since the data wasn't recorded
      beatbox.setMode(Mode.PLAYBACK);
      expect(() => wrapped()).toThrow('No recorded result found');
    });
  });

  describe('Storage Management', () => {
    test('should handle missing storage file', async () => {
      // Ensure storage file doesn't exist
      try {
        await fs.unlink(testStorageFile);
      } catch (error) {
        // Ignore if file doesn't exist
      }

      const wrapped = beatbox.wrap(syncAdd);
      beatbox.setMode(Mode.PLAYBACK);
      expect(() => wrapped(1, 2)).toThrow('No recorded result found for arguments');
    });

    test('should handle corrupted storage file', async () => {
      // Write corrupted JSON
      await fs.writeFile(testStorageFile, 'corrupted json');

      const wrapped = beatbox.wrap(syncAdd);
      beatbox.setMode(Mode.PLAYBACK);
      expect(() => wrapped(1, 2)).toThrow();
    });

    test('should handle multiple storage instances', async () => {
      const beatbox1 = new Beatbox('storage1.json');
      const beatbox2 = new Beatbox('storage2.json');

      const wrapped1 = beatbox1.wrap(syncAdd);
      const wrapped2 = beatbox2.wrap(syncAdd);

      beatbox1.setMode(Mode.RECORD);
      beatbox2.setMode(Mode.RECORD);

      wrapped1(1, 2);
      wrapped2(3, 4);

      await new Promise((resolve) => setTimeout(resolve, 100));

      beatbox1.setMode(Mode.PLAYBACK);
      beatbox2.setMode(Mode.PLAYBACK);

      expect(wrapped1(1, 2)).toBe(3);
      expect(wrapped2(3, 4)).toBe(7);

      // Cleanup
      await fs.unlink('storage1.json');
      await fs.unlink('storage2.json');
    });
  });
});
