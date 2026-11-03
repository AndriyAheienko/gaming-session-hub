import { useState, useEffect } from 'react';
import type { User } from '../../features/auth/types/auth';
import { AuthContext } from '../../features/auth/context/AuthContext';
import { getUserInfo } from '../../features/auth/services/authApi';

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

    const openAuthModal = () => setIsAuthModalOpen(true);
    const closeAuthModal = () => setIsAuthModalOpen(false);

    useEffect(() => {
        const initAuth = async () => {
            const token = localStorage.getItem('token');

            if (!token) return;

            try {
                const userInfo = await getUserInfo();
                setUser(userInfo);
            } catch (err) {
                console.error('Failed to fetch user:', err);
                localStorage.removeItem('token');
            }
        };

        initAuth();
    }, []);

    return (
        <AuthContext.Provider
            value={{
                user,
                setUser,
                isAuthModalOpen,
                setIsAuthModalOpen,
                openAuthModal,
                closeAuthModal,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};
