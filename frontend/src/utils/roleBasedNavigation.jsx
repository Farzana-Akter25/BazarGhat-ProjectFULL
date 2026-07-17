import { LayoutDashboard, UserCheck } from "lucide-react";

// Define all possible navigation items with support for submenus
export const ALL_NAVIGATION_ITEMS = {
  dashboard: {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["admin"],
  },
  userManagement: {
    name: "User Management",
    icon: UserCheck,
    roles: ["admin"],
    subMenu: [
      {
        name: "All Users",
        href: "/user-management/all-users",
      },
      {
        name: "Roles & Permissions",
        href: "/user-management/roles-permissions",
      },
    ],
  },
};

// Role-based navigation configuration
export const ROLE_NAVIGATION = {
  admin: ["dashboard", "userManagement"],
  user: ["dashboard"],
};

export const getNavigationItemsByRole = (userRole) => {
  if (!userRole || !ROLE_NAVIGATION[userRole]) {
    // Default fallback - only dashboard and settings
    return [ALL_NAVIGATION_ITEMS.dashboard, ALL_NAVIGATION_ITEMS.settings];
  }

  const allowedItems = ROLE_NAVIGATION[userRole];
  return allowedItems
    .map((itemKey) => ALL_NAVIGATION_ITEMS[itemKey])
    .filter(Boolean);
};

export const hasAccessToRoute = (route, userRole) => {
  if (!userRole) return false;

  const navigationItems = getNavigationItemsByRole(userRole);
  return navigationItems.some((item) => {
    if (item.href === route) return true;
    if (item.subMenu && Array.isArray(item.subMenu)) {
      return item.subMenu.some((sub) => sub.href === route);
    }
    return false;
  });
};

export const getRoleDisplayName = (role) => {
  const roleNames = {
    admin: "Administrator",
    user: "User",
  };

  return roleNames[role] || "Undefined";
};
