export function getProtectedRedirectTarget(pathname: string, search = ''): string {
  return `${pathname}${search}`;
}

export function getLoginRedirectPath(pathname: string, search = ''): string {
  const params = new URLSearchParams({
    next: getProtectedRedirectTarget(pathname, search),
  });

  return `/auth/login?${params.toString()}`;
}

export function getSafePostLoginRedirect(next: string | null | undefined): string {
  if (!next) return '/';
  if (!next.startsWith('/')) return '/';
  if (next.startsWith('//')) return '/';
  return next;
}
