import React from "react";
import useUserProfile from "../hooks/useUserProfile";

const Header = () => {
  const { profile, account } = useUserProfile();

  const userName = profile?.givenName ?? account?.name ?? "User";

  return (
    <header className="bg-white shadow-sm w-full p-0">
      <div className="mx-auto lg:px-6 flex justify-between items-center w-full">
        <div className="flex items-center">
          <img src="/Logo.jpg" alt="Company Logo" className="h-20" />
        </div>
        <h2 className="text-2xl font-bold mr-2 lg:mr-0">Hi, {userName}</h2>
      </div>
    </header>
  );
};

export default Header;
