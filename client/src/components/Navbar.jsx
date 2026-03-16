import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HiOutlineLogout, HiOutlineMenu, HiOutlineX } from 'react-icons/hi';
import { MdSportsCricket } from 'react-icons/md';
import { useState } from 'react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-primary shadow-lg sticky top-0 z-50">
      <div className="max-w-full mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center space-x-2 group">
            <MdSportsCricket className="text-3xl text-accent group-hover:rotate-12 transition-transform duration-300" />
            <span className="text-xl font-bold text-white tracking-wide">
              SPORT<span className="text-accent">IFY</span>
            </span>
          </Link>

          {/* Desktop user info */}
          <div className="hidden md:flex items-center space-x-4">
            {user && (
              <>
                <div className="text-right">
                  <p className="text-white text-sm font-medium">{user.name}</p>
                  <p className="text-secondary-light text-xs capitalize">{user.role}</p>
                </div>
                <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-white font-bold text-sm">
                  {user.name?.charAt(0).toUpperCase()}
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all duration-200"
                  title="Logout"
                >
                  <HiOutlineLogout className="text-xl" />
                </button>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-white"
          >
            {mobileOpen ? <HiOutlineX className="text-2xl" /> : <HiOutlineMenu className="text-2xl" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-primary-dark border-t border-white/10 animate-slide-up">
          {user && (
            <div className="px-4 py-3 space-y-2">
              <p className="text-white font-medium">{user.name}</p>
              <p className="text-secondary-light text-sm capitalize">{user.role}</p>
              <button
                onClick={handleLogout}
                className="w-full text-left text-white/70 hover:text-white py-2 flex items-center space-x-2"
              >
                <HiOutlineLogout /> <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
