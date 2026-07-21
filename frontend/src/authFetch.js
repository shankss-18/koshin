/**
 * Wrapper around fetch that automatically attaches the JWT token
 * from localStorage as an Authorization header.
 * This solves cross-origin cookie issues between Vercel and Render.
 */
export default function authFetch(url, options = {}) {
  const token = localStorage.getItem("access_token")

  const headers = { ...(options.headers || {}) }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  return fetch(url, {
    ...options,
    credentials: "include",
    headers,
  })
}
