import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';

import MainLayout from '../components/layouts/MainLayout';
import Loader from '../components/ui/Loader';

const HomePage = lazy(() => import('../pages/HomePage'));
const ProfilePage = lazy(() => import('../pages/ProfilePage'));
const SessionPage = lazy(() => import('../pages/SessionPage'));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'));

const AppRouter = () => {
    return (
        <BrowserRouter>
            <Suspense fallback={<Loader />}>
                <Routes>
                    <Route element={<MainLayout />}>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/sessions/:sessionId" element={<SessionPage />} />
                        <Route path="/profile" element={<ProfilePage />} />
                        <Route path="/profile/:userId" element={<ProfilePage />} />
                        <Route path="*" element={<NotFoundPage />} />
                    </Route>
                </Routes>
            </Suspense>
        </BrowserRouter>
    );
};

export default AppRouter;
