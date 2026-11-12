import { describe, expect, test } from 'vitest';
import { bumpFromCommits, nextVersion } from './release-plan';

describe('bumpFromCommits', () => {
  test('should give no release for commits that do not change the package', () => {
    // Act
    const bump = bumpFromCommits([
      'chore(deps): update SDK packages',
      'docs: fix README',
      'ci: pin',
    ]);

    // Assert
    expect(bump).toBe(undefined);
  });

  test('should give a patch for a data sync', () => {
    // Act
    const bump = bumpFromCommits([
      'chore(deps): update ai',
      'fix(data): sync models.dev 2026-11-12',
    ]);

    // Assert
    expect(bump).toBe('patch');
  });

  test('should give the highest bump of all commits', () => {
    // Act
    const minor = bumpFromCommits(['fix(data): sync', 'feat: add xai mapping']);
    const major = bumpFromCommits(['feat!: rename ModelOptions', 'fix: x']);
    const footer = bumpFromCommits(['feat: new API\n\nBREAKING CHANGE: removes the root export']);

    // Assert
    expect(minor).toBe('minor');
    expect(major).toBe('major');
    expect(footer).toBe('major');
  });
});

describe('nextVersion', () => {
  test('should bump the version', () => {
    // Act
    const patch = nextVersion({ current: '1.2.3', bump: 'patch' });
    const minor = nextVersion({ current: '1.2.3', bump: 'minor' });
    const major = nextVersion({ current: '1.2.3', bump: 'major' });

    // Assert
    expect([patch, minor, major]).toEqual(['1.2.4', '1.3.0', '2.0.0']);
  });

  test('should give a minor version for a breaking change before 1.0.0', () => {
    // Act
    const version = nextVersion({ current: '0.4.2', bump: 'major' });

    // Assert
    expect(version).toBe('0.5.0');
  });

  test('should reject a version that is not plain semver', () => {
    // Act
    const act = () => nextVersion({ current: '1.0.0-beta.1', bump: 'patch' });

    // Assert
    expect(act).toThrow();
  });
});
