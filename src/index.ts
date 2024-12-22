import fs from 'fs/promises';
import crypto from 'crypto';
import { readFileSync, renameSync } from 'fs';

export enum Mode {
  BYPASS = 'BYPASS',
  RECORD = 'RECORD',
  PLAYBACK = 'PLAYBACK',
}

interface StorageData {
  [key: string]: any;
}

interface SerializationResult {
  success: boolean;
  data?: string;
  error?: string;
}

export class Beatbox {
  private storage: StorageData = {};
  private storageFile: string;
  private mode: Mode = Mode.BYPASS;
  private initialized = false;

  constructor(storageFile = 'beatbox-storage.json') {
    this.storageFile = storageFile;
  }

  setMode(mode: Mode) {
    this.mode = mode;
  }

  private generateHash(args: any[]): string {
    const argsStr = JSON.stringify(args, this.safeJsonReplacer);
    return crypto.createHash('md5').update(argsStr).digest('hex');
  }

  private safeJsonReplacer(key: string, value: any): any {
    if (value instanceof Set) {
      return {
        __type: 'Set',
        value: Array.from(value),
      };
    }
    if (value instanceof Map) {
      return {
        __type: 'Map',
        value: Array.from(value.entries()),
      };
    }
    if (value instanceof Date) {
      return {
        __type: 'Date',
        value: value.toISOString(),
      };
    }
    if (typeof value === 'function') {
      return {
        __type: 'Function',
        name: value.name || 'anonymous',
      };
    }
    if (value instanceof RegExp) {
      return {
        __type: 'RegExp',
        source: value.source,
        flags: value.flags,
      };
    }
    if (value instanceof Error) {
      return {
        __type: 'Error',
        name: value.name,
        message: value.message,
        stack: value.stack,
      };
    }
    if (value instanceof Promise) {
      return {
        __type: 'Promise',
        status: 'pending',
      };
    }
    // Handle circular references
    const seen = new WeakSet();
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular Reference]';
      }
      seen.add(value);
    }
    return value;
  }

  private safeJsonReviver(key: string, value: any): any {
    if (value && typeof value === 'object' && '__type' in value) {
      switch (value.__type) {
        case 'Set':
          return new Set(value.value);
        case 'Map':
          return new Map(value.value);
        case 'Date':
          return new Date(value.value);
        case 'RegExp':
          return new RegExp(value.source, value.flags);
        case 'Error': {
          const error = new Error(value.message);
          error.name = value.name;
          error.stack = value.stack;
          return error;
        }
        case 'Function':
          return function () {
            throw new Error(`Cannot execute restored function '${value.name}'`);
          };
        case 'Promise':
          return Promise.reject(new Error('Cannot restore Promise object'));
        default:
          return value;
      }
    }
    return value;
  }

  private async trySerialize(data: any): Promise<SerializationResult> {
    try {
      const serialized = JSON.stringify(data, this.safeJsonReplacer);
      // Verify that it can be parsed back
      JSON.parse(serialized, this.safeJsonReviver);
      return { success: true, data: serialized };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown serialization error',
      };
    }
  }

  private async loadStorage(): Promise<void> {
    if (this.initialized) return;

    try {
      const data = await fs.readFile(this.storageFile, 'utf-8');
      this.storage = JSON.parse(data, this.safeJsonReviver);
      this.initialized = true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        this.storage = {};
        this.initialized = true;
      } else if (error instanceof SyntaxError) {
        // Handle corrupted storage file
        const backup = `${this.storageFile}.backup.${Date.now()}`;
        await fs.rename(this.storageFile, backup);
        this.storage = {};
        this.initialized = true;
        console.warn(`Storage file was corrupted. Backed up to ${backup} and created new storage.`);
      } else {
        throw error;
      }
    }
  }

  private async saveStorage(): Promise<void> {
    const { success, data, error } = await this.trySerialize(this.storage);
    if (!success) {
      console.warn(`Failed to save storage: ${error}`);
      return;
    }

    try {
      const tempFile = `${this.storageFile}.tmp`;
      await fs.writeFile(tempFile, data!);
      await fs.rename(tempFile, this.storageFile);
    } catch (error) {
      console.error('Failed to save storage file:', error);
    }
  }

  wrap<T extends (...args: any[]) => any>(fn: T): T {
    const wrapper = async (...args: Parameters<T>): Promise<ReturnType<T>> => {
      await this.loadStorage();
      const hash = this.generateHash(args);

      switch (this.mode) {
        case Mode.BYPASS: {
          return fn(...args);
        }
        case Mode.RECORD: {
          const result = await fn(...args);
          const { success } = await this.trySerialize(result);
          if (success) {
            this.storage[hash] = result;
            await this.saveStorage();
          } else {
            console.warn('Failed to record non-serializable result');
          }
          return result;
        }

        case Mode.PLAYBACK: {
          if (hash in this.storage) {
            return this.storage[hash];
          }
          throw new Error(
            `No recorded result found for arguments: ${JSON.stringify(args, null, 2)}`,
          );
        }
        default: {
          throw new Error(`Invalid mode: ${this.mode}`);
        }
      }
    };

    // Handle synchronous functions
    const syncWrapper = (...args: Parameters<T>): ReturnType<T> => {
      const hash = this.generateHash(args);

      switch (this.mode) {
        case Mode.BYPASS: {
          return fn(...args);
        }
        case Mode.RECORD: {
          const result = fn(...args);
          // Save asynchronously without blocking
          this.loadStorage()
            .then(async () => {
              const { success } = await this.trySerialize(result);
              if (success) {
                this.storage[hash] = result;
                await this.saveStorage();
              } else {
                console.warn('Failed to record non-serializable result');
              }
            })
            .catch(console.error);
          return result;
        }

        case Mode.PLAYBACK: {
          // Initialize storage synchronously for playback
          try {
            const data = readFileSync(this.storageFile, 'utf-8');
            this.storage = JSON.parse(data, this.safeJsonReviver);
            this.initialized = true;
          } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
              this.storage = {};
              this.initialized = true;
            } else if (error instanceof SyntaxError) {
              // Handle corrupted storage file
              const backup = `${this.storageFile}.backup.${Date.now()}`;
              renameSync(this.storageFile, backup);
              this.storage = {};
              this.initialized = true;
              console.warn(
                `Storage file was corrupted. Backed up to ${backup} and created new storage.`,
              );
            }
          }

          if (!(hash in this.storage)) {
            throw new Error(
              `No recorded result found for arguments: ${JSON.stringify(args, null, 2)}`,
            );
          }
          return this.storage[hash];
        }
        default: {
          throw new Error(`Invalid mode: ${this.mode}`);
        }
      }
    };

    // Determine if the original function is async
    const isAsync = fn.constructor.name === 'AsyncFunction';
    return (isAsync ? wrapper : syncWrapper) as T;
  }
}
