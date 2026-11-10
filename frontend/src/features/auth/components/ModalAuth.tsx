import { useState } from 'react';
import axios from 'axios';

import { register, login, getUserInfo } from '../services/authApi';
import type { ToastState } from '../../../types/common.types';
import Toast from '../../../components/ui/Toast';
import { useAuth } from '../context/AuthContext';

import './ModalAuth.scss';

const ModalAuth = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLogin, setIsLogin] = useState(true);
    const [loader, setLoader] = useState(false);
    const [toast, setToast] = useState<ToastState>({
        show: false,
        message: '',
        type: 'success',
    });

    const { setUser, isAuthModalOpen, closeAuthModal } = useAuth();

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
                        message: 'Please enter a valid email (for example: user@mail.com)',
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

                let userInfo;

                try {
                    userInfo = await getUserInfo();
                } catch (err) {
                    localStorage.removeItem('token');
                    throw err;
                }

                setUser(userInfo);
                closeAuthModal();
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
                        message: 'Please enter a valid email (for example: user@mail.com)',
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
        <div
            className={`auth-modal-overlay ${isAuthModalOpen ? 'show' : ''}`}
            aria-hidden={!isAuthModalOpen}
            inert={!isAuthModalOpen}
        >
            <section
                className="auth-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="auth-modal-title"
            >
                <button
                    className="auth-modal__close"
                    type="button"
                    onClick={closeAuthModal}
                    aria-label="Close authentication window"
                >
                    <span aria-hidden="true">×</span>
                </button>
                <div className="auth-modal__header">
                    <span className="auth-modal__eyebrow">GAMING SESSION HUB</span>
                    <h2 className="auth-modal__title" id="auth-modal-title">
                        {isLogin ? 'Welcome back' : 'Create your account'}
                    </h2>
                    <p className="auth-modal__description">
                        {isLogin
                            ? 'Sign in to continue your gaming journey.'
                            : 'Join the community and find your next gaming session.'}
                    </p>
                </div>
                <form className="auth-modal__form" onSubmit={handleSubmit}>
                    {!isLogin && (
                        <div className="auth-modal__field">
                            <label className="auth-modal__label" htmlFor="auth-name">
                                Name
                            </label>

                            <input
                                className="auth-modal__input"
                                id="auth-name"
                                type="text"
                                autoComplete="name"
                                placeholder="Your name"
                                value={name}
                                onChange={e => setName(e.target.value)}
                            />
                        </div>
                    )}
                    <div className="auth-modal__field">
                        <label className="auth-modal__label" htmlFor="auth-email">
                            Email
                        </label>

                        <input
                            className="auth-modal__input"
                            id="auth-email"
                            type="email"
                            autoComplete="email"
                            placeholder="user@mail.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                        />
                    </div>
                    <div className="auth-modal__field">
                        <label className="auth-modal__label" htmlFor="auth-password">
                            Password
                        </label>
                        <input
                            className="auth-modal__input"
                            id="auth-password"
                            type="password"
                            autoComplete={isLogin ? 'current-password' : 'new-password'}
                            placeholder="At least 6 characters"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                        />
                    </div>
                    <button className="auth-modal__submit" disabled={loader} type="submit">
                        {loader ? 'Loading...' : isLogin ? 'Sign in' : 'Sign up'}
                    </button>
                </form>
                <div className="auth-modal__footer">
                    <span className="auth-modal__footer-text">
                        {isLogin ? "Don't have an account?" : 'Already have an account?'}
                    </span>
                    <button
                        className="auth-modal__switch"
                        type="button"
                        disabled={loader}
                        onClick={() => {
                            setToast(prev => ({ ...prev, show: false }));
                            setName('');
                            setEmail('');
                            setPassword('');
                            setIsLogin(prev => !prev);
                        }}
                    >
                        {isLogin ? 'Register' : 'Log in'}
                    </button>
                </div>
            </section>
            <Toast
                show={toast.show}
                message={toast.message}
                type={toast.type}
                onClose={() => setToast(prev => ({ ...prev, show: false }))}
            />
        </div>
    );
};

export default ModalAuth;
