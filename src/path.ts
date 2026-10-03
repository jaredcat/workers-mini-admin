function stripTrailingSlashes(value: string): string {
  let end = value.length;
  while (end > 0 && value.startsWith('/', end - 1)) {
    end -= 1;
  }
  return value.slice(0, end);
}

function stripEdgeSlashes(value: string): string {
  let start = 0;
  const endLimit = value.length;
  while (start < endLimit && value.startsWith('/', start)) {
    start += 1;
  }
  let end = endLimit;
  while (end > start && value.startsWith('/', end - 1)) {
    end -= 1;
  }
  return value.slice(start, end);
}

/**
Normalize admin mount: `""` and `"/"` → root; strip trailing slashes otherwise.
*/
export function normalizeBasePath(basePath: string): string {
  return basePath === '' || basePath === '/'
    ? ''
    : stripTrailingSlashes(basePath);
}

/**
 * Resolve mount for low-level helpers: omitted → legacy `/admin`;
 * `""` / `"/"` → site root.
 */
export function resolveBasePath(basePath?: string): string {
  return basePath === undefined ? '/admin' : normalizeBasePath(basePath);
}

/**
Join mount + segments into an absolute path (always starts with `/` except empty join → `/`).
*/
export function joinBasePath(basePath: string, ...segments: string[]): string {
  const base = normalizeBasePath(basePath);
  const rest = segments
    .map((segment) => stripEdgeSlashes(segment))
    .filter(Boolean)
    .join('/');
  if (!base && !rest) {
    return '/';
  }
  if (!base) {
    return `/${rest}`;
  }
  return rest ? `${base}/${rest}` : base;
}

/**
Cookie `Path` attribute for a mount (`/` when root).
*/
export function cookiePathForBase(basePath: string): string {
  return normalizeBasePath(basePath) || '/';
}

/**
Strip trailing slashes; empty → `/`.
*/
export function normalizePathname(pathname: string): string {
  return stripTrailingSlashes(pathname) || '/';
}

/**
 * Path relative to the admin mount, or `undefined` if outside the mount.
 * Root mount (`""`): relative is the full pathname (always "under" for known-route checks).
 * Non-root: `undefined` when pathname is not `{base}` or `{base}/…`.
 */
export function relativeToBase(
  pathname: string,
  basePath: string,
): string | undefined {
  const path = normalizePathname(pathname);
  const base = normalizeBasePath(basePath);
  if (!base) {
    return path;
  }
  if (path === base) {
    return '/';
  }
  return path.startsWith(`${base}/`)
    ? path.slice(base.length) || '/'
    : undefined;
}
