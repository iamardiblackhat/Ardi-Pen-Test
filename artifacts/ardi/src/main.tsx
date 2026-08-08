import { createRoot } from 'react-dom/client';
import { setAuthTokenGetter } from '@workspace/api-client-react';
import App from './App';
import './index.css';

// Wire the auth token getter so every API call carries the Bearer token
setAuthTokenGetter(() => localStorage.getItem('ardi_auth_token'));

createRoot(document.getElementById('root')!).render(<App />);
