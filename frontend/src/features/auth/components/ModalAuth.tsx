import { useState } from 'react';
import { register, login, getUserInfo } from '../services/authApi';
import type { User } from '../types/auth';
import type { ToastState } from '../../../types/common';
import axios from 'axios';

const ModalAuth = () => {
    const [user, setUser] = useState<User | null>(null);
    const [isModal, setIsModal] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLogin, setIsLogin] = useState(true);
    const [loader, setLoader] = useState(false);
    const [toast, setToast] = useState<ToastState>({ show: false, message: '', type: 'success' });

    const handleSubmit = async (e: React.SubmitEvent) => {
        e.preventDefault();
        setToast(prev => ({ ...prev, show: false }));

        try {
            if (isLogin) {
                if (!email.trim() || !password.trim()) {
                    setToast({
                        show: true,
                        message: 'Please fill in all fields',
                        type: 'error',
                    });
                    return;
                }

                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) {
                    setToast({
                        show: true,
                        message: 'Please enter a valid email (for example: user@mail.com))',
                        type: 'error',
                    });
                    return;
                }

                if (password.length < 6) {
                    setToast({
                        show: true,
                        message: 'The password must contain at least 6 characters.',
                        type: 'error',
                    });
                    return;
                }

                setLoader(true);
                const result = await login(email, password);
                localStorage.setItem('token', result.token);
                const userInfo = await getUserInfo();
                setUser(userInfo);
                setIsModal(false);
            } else {
                if (!email.trim() || !password.trim() || !name.trim()) {
                    setToast({
                        show: true,
                        message: 'Please fill in all fields',
                        type: 'error',
                    });
                    return;
                }

                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) {
                    setToast({
                        show: true,
                        message: 'Please enter a valid email (for example: user@mail.com))',
                        type: 'error',
                    });
                    return;
                }

                if (password.length < 6) {
                    setToast({
                        show: true,
                        message: 'The password must contain at least 6 characters.',
                        type: 'error',
                    });
                    return;
                }

                setLoader(true);
                const result = await register(name, email, password);
                setToast({
                    show: true,
                    message: `${result.message}, Now sign in to your account.`,
                    type: 'success',
                });
                setIsLogin(true);
                setPassword('');
                setName('');
            }
        } catch (err) {
            let errorMessage = 'An unexpected error occurred';
            if (axios.isAxiosError(err)) {
                errorMessage =
                    err.response?.data.message || 'Error during login or account registration';
            } else {
                console.error('Unknown error:', err);
            }
            setToast({
                show: true,
                message: errorMessage,
                type: 'error',
            });
        } finally {
            setLoader(false);
        }
    };

    return (
        <div className="backdrop">
            <div className="auth-modal">
                <h2>{isLogin ? 'Login' : 'Register'}</h2>
                <form onSubmit={handleSubmit}>
                    {!isLogin && (
                        <div>
                            <label>Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                            />
                        </div>
                    )}
                    <div>
                        <label>Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                        />
                    </div>
                    <div>
                        <label>Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                        />
                    </div>
                    <button disabled={loader} type="submit">
                        {loader ? 'Loading...' : isLogin ? 'Sign in' : 'Sign up'}
                    </button>
                    <button
                        disabled={loader}
                        onClick={() => {
                            setToast(prev => ({ ...prev, show: false }));
                            setName('');
                            setEmail('');
                            setPassword('');
                            setIsLogin(prev => !prev);
                        }}
                    >
                        {isLogin
                            ? `Don't have an account? Register`
                            : 'Already have an account? Log in'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ModalAuth;
