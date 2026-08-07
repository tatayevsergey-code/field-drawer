import {
    createContext,
    useContext,
    useEffect,
    useState,
    useCallback,
} from 'react';

import {
    login as apiLogin,
    register as apiRegister,
    logout as apiLogout,
} from '../api/auth';

import {
    getAccessToken,
    getRefreshToken,
    getStoredUser,
    clearSession,
    onAuthChange,
    refreshAccessToken,
} from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => getStoredUser());
    const [initializing, setInitializing] = useState(true);

    useEffect(() => {
        let mounted = true;

        async function init() {
            const storedUser = getStoredUser();
            const accessToken = getAccessToken();
            const storedRefreshToken = getRefreshToken();

            // Если есть access token и пользователь, считаем сессию активной
            if (accessToken && storedUser) {
                setUser(storedUser);
                setInitializing(false);
                return;
            }

            // Если есть только refresh token, пробуем обновить сессию
            if (storedRefreshToken) {
                try {
                    const ok = await refreshAccessToken();

                    if (!mounted) {
                        return;
                    }

                    if (ok) {
                        setUser(getStoredUser());
                    } else {
                        setUser(null);
                    }
                } catch {
                    if (mounted) {
                        clearSession();
                        setUser(null);
                    }
                } finally {
                    if (mounted) {
                        setInitializing(false);
                    }
                }

                return;
            }

            clearSession();
            setUser(null);
            setInitializing(false);
        }

        init();

        return () => {
            mounted = false;
        };
    }, []);

    // Если токены очистились из любой части приложения, обновляем состояние
    useEffect(() => {
        return onAuthChange(() => {
            setUser(getStoredUser());
        });
    }, []);

    const login = useCallback(async ({ email, password }) => {
        const result = await apiLogin({ email, password });

        setUser(getStoredUser());

        return result;
    }, []);

    const register = useCallback(async ({ email, password, fullName, organization }) => {
        return apiRegister({
            email,
            password,
            fullName,
            organization,
        });
    }, []);

    const logout = useCallback(async () => {
        await apiLogout();

        setUser(null);
    }, []);

    const value = {
        user,
        initializing,
        isAuthenticated: Boolean(user),
        login,
        register,
        logout,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error('useAuth должен использоваться внутри AuthProvider');
    }

    return context;
}