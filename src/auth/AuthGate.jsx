import { useAuth } from './AuthContext';
import AuthPage from '../components/auth/AuthPage';
import App from '../App';

export function AuthGate() {
    const { initializing, isAuthenticated } = useAuth();

    if (initializing) {
        return (
            <div className="auth-page">
                <div className="auth-card">
                    <div className="auth-title">Загрузка...</div>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <AuthPage />;
    }

    return <App />;
}