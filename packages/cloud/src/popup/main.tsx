import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/browser';
import App from './App';
import './index.css';

Sentry.init({
    dsn: 'https://d10e139a7143fc8517a8a97751f5d048@o4511585627406336.ingest.us.sentry.io/4511585637826560',
    tracesSampleRate: 1.0,
});

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
);
