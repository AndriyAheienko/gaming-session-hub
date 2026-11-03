import { createContext, useContext } from 'react';
import type { User } from '../types/auth';

interface AuthContextType {
    user: User | null;
    setUser: React.Dispatch<React.SetStateAction<User | null>>;
    isAuthModalOpen: boolean;
    setIsAuthModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
    openAuthModal: () => void;
    closeAuthModal: () => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error('useAuth must be used inside AuthProvider');
    }

    return context;
};
