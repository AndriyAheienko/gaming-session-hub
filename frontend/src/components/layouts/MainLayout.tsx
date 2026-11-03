import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import MobileNavigation from './MobileNavigation';
import Header from './Header';
import ModalAuth from '../../features/auth/components/ModalAuth';

const MainLayout = () => {
    return (
        <div className="app-container">
            <Sidebar />
            <div className="main-container">
                <Header />
                <main className="content-area">
                    <Outlet />
                </main>
            </div>
            <MobileNavigation />
            <ModalAuth />
        </div>
    );
};

export default MainLayout;
