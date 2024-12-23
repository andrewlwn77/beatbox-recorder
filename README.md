# Beatbox

<p align="center">
  <img src="https://raw.githubusercontent.com/andrewlwn77/beatbox-recorder/main/docs/assets/beatbox.png" alt="Beatbox Logo" width="400"/>
</p>

Beatbox is a lightweight TypeScript library that records and replays function calls, making it perfect for testing, mocking, and debugging. It can capture the results of expensive operations, API calls, or complex computations and play them back instantly, significantly speeding up tests and development cycles.

## Features

- 🎯 Record function calls and their results
- ⚡ Instant playback of previously recorded results
- 🔄 Bypass mode for normal function execution
- 🔍 Supports both synchronous and asynchronous functions
- 💾 Persistent storage in JSON format with atomic writes
- 📝 Full TypeScript support
- 🛡️ Comprehensive error handling and recovery
- 🔐 Secure argument hashing for storage
- 🔁 Smart handling of circular references
- 🎭 Special type preservation (Set, Map, Date, RegExp)
- 📦 Automatic backup of corrupted storage files
- ⚠️ Graceful handling of non-serializable data

## Installation

```bash
npm install beatbox-recorder
```

## Quick Start

```typescript
import { Beatbox, Mode } from 'beatbox-recorder';

// Create a new instance
const beatbox = new Beatbox('my-storage.json');

// Example function to wrap
const fetchUserData = async (userId: string) => {
  // Expensive API call
  const response = await fetch(`/api/users/${userId}`);
  return response.json();
};

// Wrap the function
const wrappedFetchUserData = beatbox.wrap(fetchUserData);

// Record mode: Actually makes API calls and saves results
beatbox.setMode(Mode.RECORD);
const userData = await wrappedFetchUserData('user123');

// Playback mode: Returns saved results instantly
beatbox.setMode(Mode.PLAYBACK);
const cachedData = await wrappedFetchUserData('user123');

// Bypass mode: Makes actual API calls again
beatbox.setMode(Mode.BYPASS);
const freshData = await wrappedFetchUserData('user123');
```

## Use Cases

### Testing
- Record real API responses once and replay them in tests
- Make tests faster and more reliable
- Work offline with recorded data

### Development
- Cache expensive computations
- Speed up development cycles
- Debug complex function calls

### Mocking
- Create predictable test scenarios
- Simulate different API responses
- Test error handling

## API Reference

### Class: Beatbox

#### Constructor
```typescript
new Beatbox(storageFile?: string)
```
- `storageFile`: Optional path to storage JSON file (default: 'beatbox-storage.json')

#### Methods

##### setMode(mode: Mode)
Sets the operating mode of the wrapper:
- `Mode.BYPASS`: Direct function execution
- `Mode.RECORD`: Record function results
- `Mode.PLAYBACK`: Return recorded results

##### wrap<T>(fn: T): T
Wraps a function for recording/playback:
- Works with both sync and async functions
- Preserves original function signature
- Returns wrapped function with same type

## Storage Format

Results are stored in a JSON file with MD5 hashes of function arguments as keys. Special types are preserved with type information:

```json
{
  "d41d8cd98f00b204e9800998ecf8427e": {
    "result": "cached value"
  },
  "a7b5f3e21d9c4f8g": {
    "value": [1, 2, 3],
    "__type": "Set"
  },
  "h8j2k4l6m8n0p2q4": {
    "value": "2024-01-01T00:00:00.000Z",
    "__type": "Date"
  }
```

## Best Practices

1. **Version Control**
   - Consider adding storage files to .gitignore
   - Version control them separately if needed
   - Keep backup files (*.backup.*) in .gitignore

2. **Storage Management**
   - Regularly clean up old recordings and backup files
   - Use separate storage files for different test suites
   - Monitor storage file size for non-serializable data warnings

3. **Error Handling**
   - Always handle missing recording errors in playback mode
   - Consider fallback strategies for missing data
   - Check console warnings for serialization issues

4. **Security**
   - Don't record sensitive data
   - Clean sensitive information before recording
   - Monitor storage files for accidentally recorded sensitive data

5. **Type Handling**
   - Be aware of special type preservation for Set, Map, Date, etc.
   - Handle circular references appropriately
   - Consider implementing custom serialization for complex types

## Common Patterns

### Conditional Recording

```typescript
if (process.env.NODE_ENV === 'test') {
  beatbox.setMode(Mode.PLAYBACK);
} else {
  beatbox.setMode(Mode.BYPASS);
}
```

### Recording Sets

```typescript
// Record a set of related calls
beatbox.setMode(Mode.RECORD);
await Promise.all([
  wrappedFn('test1'),
  wrappedFn('test2'),
  wrappedFn('test3')
]);
```

### Handling Complex Types

```typescript
// Sets and Maps are automatically preserved
const wrappedSet = beatbox.wrap(() => new Set([1, 2, 3]));
const result = wrappedSet(); // Will be restored as Set in playback

// Dates are preserved
const wrappedDate = beatbox.wrap(() => new Date());
const date = wrappedDate(); // Will be restored as Date in playback

// Handle circular references
const wrappedCircular = beatbox.wrap(() => {
  const obj: any = { a: 1 };
  obj.self = obj;
  return obj;
}); // Will be handled gracefully
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details