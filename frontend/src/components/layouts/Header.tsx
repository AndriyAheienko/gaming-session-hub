import { useAuth } from '../../features/auth/context/AuthContext';
import '../../styles/components/_header.scss';

const Header = () => {
    const { openAuthModal } = useAuth();

    return (
        <header className="app-header">
            <div className="app-header__content">
                <span className="app-header__placeholder">Header</span>

                <button className="app-header__auth-button" type="button" onClick={openAuthModal}>
                    Sign in
                </button>
            </div>
        </header>
    );
};

export default Header;
