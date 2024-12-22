# Contributing to Beatbox

## Development

1. Clone the repository
2. Install dependencies: `npm install`
3. Run tests: `npm test`
4. Build: `npm run build`

## Release Process

We use semantic versioning (semver):
- MAJOR version (1.0.0) for incompatible API changes
- MINOR version (0.1.0) for backwards-compatible functionality additions
- PATCH version (0.0.1) for backwards-compatible bug fixes

### Creating a Release

1. Ensure all tests pass: `npm test`
2. Update version in package.json:
   ```bash
   # For patch release (bug fixes)
   npm version patch

   # For minor release (new features)
   npm version minor

   # For major release (breaking changes)
   npm version major
   ```
   This will:
   - Update package.json version
   - Create a git tag
   - Create a version commit

3. Push changes and tags:
   ```bash
   git push && git push --tags
   ```

4. Publish to NPM:
   ```bash
   npm publish
   ```

### Release Checklist

- [ ] All tests pass
- [ ] Documentation is updated
- [ ] CHANGELOG.md is updated
- [ ] Version is updated
- [ ] Git tag is created
- [ ] Changes are pushed
- [ ] Package is published

## Version Guidelines

### Patch Releases (0.0.x)
- Bug fixes
- Performance improvements
- Documentation updates

### Minor Releases (0.x.0)
- New features
- Non-breaking API additions
- Deprecation notices

### Major Releases (x.0.0)
- Breaking API changes
- Major architectural changes
- Dropping support for older Node.js versions