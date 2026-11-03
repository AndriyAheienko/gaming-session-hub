import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import './styles/fonts.ts';
import './styles/main.scss';
import App from './app/App.tsx';

import { AuthProvider } from './app/providers/AuthProvider.tsx';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <AuthProvider>
            <App />
        </AuthProvider>
    </StrictMode>,
);
