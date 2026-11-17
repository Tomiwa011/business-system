export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

// One place for every request to the backend
export async function api(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      credentials: 'include',
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Cannot reach the server. Check your connection and try again.', 0);
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    // response had no JSON body
  }

  if (!res.ok) {
    // Session ended (expired, or the account was deactivated). Tell the app to log out.
    if (res.status === 401 && path !== '/auth/login') {
      window.dispatchEvent(new Event('auth:expired'));
    }

    const fallback =
      res.status >= 500
        ? 'The server is not responding. Please try again shortly.'
        : 'Something went wrong';
    throw new ApiError(data?.message || fallback, res.status);
  }

  return data;
}