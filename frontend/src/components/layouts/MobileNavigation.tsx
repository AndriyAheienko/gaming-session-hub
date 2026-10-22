import { NavLink } from 'react-router-dom';
import { navItems } from '../../app/navigation';

const MobileNavigation = () => {
    return (
        <nav className="mobile-nav">
            {navItems.map(item => (
                <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                        `mobile-nav__item ${isActive ? 'mobile-nav__item--active' : ''}`
                    }
                >
                    {item.icon}
                </NavLink>
            ))}
        </nav>
    );
};

export default MobileNavigation;
