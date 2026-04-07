import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  HiOutlineHome,
  HiOutlineCollection,
  HiOutlineUserGroup,
  HiOutlineCalendar,
  HiOutlineChartBar,
  HiOutlineUser,
} from 'react-icons/hi';
import { MdSportsCricket } from 'react-icons/md';

const Sidebar = () => {
  const { user } = useAuth();

  const linkClass = ({ isActive }) =>
    `flex items-center space-x-4 px-5 py-3 rounded-xl transition-all duration-300 text-base font-bold ${
      isActive
        ? 'bg-primary text-white shadow-lg shadow-primary/25 translate-x-1'
        : 'text-txt-secondary hover:bg-primary/5 hover:text-primary hover:translate-x-1'
    }`;

  return (
    <aside className="w-64 bg-surface-card border-r border-surface-border min-h-[calc(100vh-4rem)] p-4 hidden lg:block">
      <nav className="space-y-1">
        <NavLink to="/dashboard" className={linkClass}>
          <HiOutlineHome className="text-lg" />
          <span>Dashboard</span>
        </NavLink>

        <NavLink to="/tournaments" className={linkClass}>
          <HiOutlineCollection className="text-lg" />
          <span>Tournaments</span>
        </NavLink>

        <NavLink to="/teams" className={linkClass}>
          <HiOutlineUserGroup className="text-lg" />
          <span>Teams</span>
        </NavLink>

        <NavLink to="/matches/create" className={linkClass}>
          <MdSportsCricket className="text-lg" />
          <span>Create Match</span>
        </NavLink>

        <NavLink to="/fixtures" className={linkClass}>
          <HiOutlineCalendar className="text-lg" />
          <span>Fixtures</span>
        </NavLink>



        <NavLink to="/points" className={linkClass}>
          <HiOutlineChartBar className="text-lg" />
          <span>Points Table</span>
        </NavLink>

        <div className="pt-4 mt-4 border-t border-surface-border">
          <NavLink to="/profile" className={linkClass}>
            <HiOutlineUser className="text-lg" />
            <span>Profile</span>
          </NavLink>
        </div>
      </nav>
    </aside>
  );
};

export default Sidebar;
