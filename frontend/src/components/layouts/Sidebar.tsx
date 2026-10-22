import { NavLink } from 'react-router-dom';
import { navItems } from '../../app/navigation';

const Sidebar = () => {
    return (
        <aside className="sidebar">
            <div className="sidebar__logo">
                <span className="logo-accent">HUB</span>
            </div>

            <nav className="sidebar__nav">
                {navItems.map(item => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `nav-item ${isActive ? 'nav-item--active' : ''}`
                        }
                    >
                        {item.icon}
                        <span>{item.label}</span>
                    </NavLink>
                ))}
            </nav>
        </aside>
    );
};

export default Sidebar;
