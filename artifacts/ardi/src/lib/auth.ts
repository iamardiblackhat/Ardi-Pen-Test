const SESSION_KEY = 'ardi_logged_in';

// Session state is managed via HttpOnly cookies on the server.
// The client tracks session status in sessionStorage without holding sensitive tokens.

export const auth = {
  async logout(): Promise<void> {
    try {
      await fetch('/api/auth/logout', {
        method: 'DELETE',
        credentials: 'include',
      });
    } catch {
      // Ignore network errors on logout
    } finally {
      sessionStorage.removeItem(SESSION_KEY);
      localStorage.removeItem('ardi_auth_token');
    }
  },

  setSession(active = true): void {
    if (active) {
      sessionStorage.setItem(SESSION_KEY, 'true');
    } else {
      sessionStorage.removeItem(SESSION_KEY);
    }
  },

  getToken(): string | null {
    return null;
  },

  setToken(_token: string): void {
    this.setSession(true);
  },

  clearToken(): void {
    this.logout();
  },

  isAuthenticated(): boolean {
    return sessionStorage.getItem(SESSION_KEY) === 'true';
  },
};
