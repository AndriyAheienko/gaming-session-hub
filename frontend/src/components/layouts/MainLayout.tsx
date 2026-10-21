import { Outlet } from 'react-router-dom';

const MainLayout = () => {
    return (
        <div className="app-container">
            <div>Header</div>
            <div className="main-container">
                <Outlet />
            </div>
            <div>Footer</div>
        </div>
    );
};

export default MainLayout;
