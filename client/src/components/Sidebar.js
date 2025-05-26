import { React, useState, useEffect } from "react";
import { useMsal } from "@azure/msal-react";
import { NavLink, useLocation } from "react-router-dom";
import { Home, FileUp, Table, Mail, Menu, LogOut } from "lucide-react";

function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(true);
  const { instance } = useMsal();
  const location = useLocation();

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 425) {
        setIsExpanded(false);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleSidebar = () => {
    setIsExpanded(!isExpanded);
  };

  const handleLogout = () => {
    sessionStorage.clear();
    window.location.reload();
  };

  const menuItems = [
    {
      id: "home",
      path: "/home",
      label: "Home",
      icon: <Home size={20} />,
    },
    {
      id: "upload-template",
      path: "/upload-template",
      label: "Upload Template",
      icon: <FileUp size={20} />,
    },
    {
      id: "upload-excel",
      path: "/upload-excel",
      label: "Generate Documents",
      icon: <Table size={20} />,
    },
    {
      id: "send-email",
      path: "/send-email",
      label: "Send Email",
      icon: <Mail size={20} />,
    },
  ];

  return (
    <div
      className={`bg-blue-900 text-white shadow-lg transition-all duration-300 ${
        isExpanded ? "xl:w-58" : "w-20"
      } flex flex-col`}
    >
      {/* Menu Items */}
      <nav className="flex-1">
        <ul>
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;

            return (
              <li key={item.id} className="mb-2">
                <NavLink
                  to={item.path}
                  className={`flex items-center w-full px-4 py-3 text-left ${
                    isActive
                      ? "bg-green-100 text-green-600 border-r-4 border-green-700"
                      : "text-white"
                  }`}
                >
                  <span className="mr-3">{item.icon}</span>
                  {isExpanded && <span>{item.label}</span>}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 flex items-center justify-between border-b">
        <button
          onClick={() => handleLogout()}
          className="flex items-center w-full py-2 text-left"
        >
          <span>
            <LogOut className="mr-4" size={20} />
          </span>
          {isExpanded && <span>Logout</span>}
        </button>
      </div>

      <div className="p-4 max-[425px]:hidden">
        <button onClick={toggleSidebar}>
          <Menu size={22} />
        </button>
      </div>
    </div>
  );
}

export default Sidebar;
