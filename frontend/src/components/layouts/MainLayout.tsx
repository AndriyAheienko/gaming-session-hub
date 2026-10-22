import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import MobileNavigation from './MobileNavigation';

const MainLayout = () => {
    return (
        <div className="app-container">
            <Sidebar />
            <div className="main-container">
                <header className="header">
                    <div className="header__placeholder">Header / Search</div>
                </header>
                <main className="content-area">
                    <Outlet />
                </main>
            </div>
            <MobileNavigation />
        </div>
    );
};

export default MainLayout;
