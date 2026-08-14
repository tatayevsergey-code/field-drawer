import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './auth/AuthContext';
import { AuthGate } from './auth/AuthGate';
import { ReferenceProvider } from './context/ReferenceContext';

const root = ReactDOM.createRoot(document.getElementById('root'));

// root.render(
//     <React.StrictMode>
//         <App />
//     </React.StrictMode>
// );

root.render(
    <React.StrictMode>
        <AuthProvider>
            <AuthGate />
        </AuthProvider>
    </React.StrictMode>
);