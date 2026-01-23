/**
 * Shell version compatibility utilities
 */

/**
 * Assert that the shell version is compatible with the app's requirements
 * @param requiredVersion - Semver range (e.g., "1.x", "^1.0.0", ">=1.0.0")
 * @throws Error if shell version is incompatible or not available
 */
export function assertShellVersion(requiredVersion: string): void {
  const shell = (window as any).shell;
  
  if (!shell) {
    throw new Error('Shell API not available');
  }

  const shellVersion = shell.version;
  if (!shellVersion) {
    throw new Error('Shell version not available');
  }

  // Simple version check - supports "1.x" or "1" for major version matching
  const majorMatch = requiredVersion.match(/^(\d+)(\.x)?$/);
  if (majorMatch) {
    const requiredMajor = majorMatch[1];
    const shellMajor = shellVersion.split('.')[0];
    
    if (shellMajor !== requiredMajor) {
      throw new Error(
        `Shell version mismatch: app requires v${requiredVersion}, but shell is v${shellVersion}`
      );
    }
    return;
  }

  // Exact version match
  if (shellVersion !== requiredVersion) {
    throw new Error(
      `Shell version mismatch: app requires v${requiredVersion}, but shell is v${shellVersion}`
    );
  }
}

/**
 * Check if shell version is compatible (non-throwing)
 * @param requiredVersion - Semver range (e.g., "1.x", "^1.0.0", ">=1.0.0")
 * @returns true if compatible, false otherwise
 */
export function isShellVersionCompatible(requiredVersion: string): boolean {
  try {
    assertShellVersion(requiredVersion);
    return true;
  } catch {
    return false;
  }
}
