import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  HiHome, 
  HiUserGroup, 
  HiBookOpen, 
  HiLibrary, 
  HiOfficeBuilding, 
  HiCalendar, 
  HiCog,
  HiUpload,
  HiDownload,
  HiViewGrid
} from 'react-icons/hi';
import { FiLogOut } from 'react-icons/fi';
import logoImg from '/src/assets/image/logo.png';

const SideBar = ({ onLogout, adminName, onNavRequest }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    { path: '/home',            name: 'Accueil',          icon: HiHome },
    { path: '/profs',           name: 'Professeurs',      icon: HiUserGroup },
    { path: '/classes',         name: 'Classes',          icon: HiBookOpen },
    { path: '/pedagogie',       name: 'Pédagogie',        icon: HiLibrary },
    { path: '/salles',          name: 'Salles',           icon: HiOfficeBuilding },
    { path: '/Emploitemps',     name: 'Emploi du temps',  icon: HiCalendar },
    { path: '/personalisation', name: 'Personnalisation', icon: HiCog },
        { path: '/SalleVueGenerale',name: 'Vue générale salles', icon: HiViewGrid },
    { path: '/Import',          name: 'Import CSV',       icon: HiUpload },
    { path: '/Export',          name: 'Export CSV',       icon: HiDownload },
              

            ];


  const isActive = (path) => location.pathname === path;

  const handleClick = (e, path) => {
    e.preventDefault();
    navigate(path);
    if (onNavRequest) onNavRequest(path);
  };

  return (
    <div className="fixed top-0 left-0 w-60 h-full bg-white shadow-lg z-50 flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b flex flex-col items-center" style={{ borderColor: '#237AFF20' }}>
        <img src={logoImg} alt="ISI Emploi Logo" className="w-40 h-15 mb-2 object-contain" />
      </div>

      {/* Admin info */}
      <div className="mx-4 mt-4 p-3 rounded-lg" style={{ backgroundColor: '#237AFF10' }}>
        <p className="text-[10px] text-gray-400">MENU PRINCIPAL</p>
      </div>

      {/* Navigation */}
      <nav className="mt-2 flex-1 px-4 pb-4 overflow-y-auto">
        {menuItems.map((item) => {
          const IconComponent = item.icon;
          return (
            <a
              key={item.path}
              href={item.path}
              onClick={(e) => handleClick(e, item.path)}
              className={`flex items-center gap-3 w-full text-left px-4 py-2.5 rounded-lg mb-2 transition-all cursor-pointer ${
                isActive(item.path)
                  ? 'text-white shadow-md'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              style={isActive(item.path) ? { backgroundColor: '#237AFF' } : {}}
            >
              <IconComponent className="text-lg" />
              <span className="text-sm font-medium">{item.name}</span>
            </a>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t" style={{ borderColor: '#237AFF20' }}>
        <button
          onClick={onLogout}
          className="flex items-center gap-2 w-full px-4 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition-all"
        >
          <FiLogOut className="w-4 h-4" />
          Se déconnecter
        </button>
        <div className="text-center text-[10px] text-gray-400 mt-3">Version 1.0</div>
      </div>
    </div>
  );
};

export default SideBar;