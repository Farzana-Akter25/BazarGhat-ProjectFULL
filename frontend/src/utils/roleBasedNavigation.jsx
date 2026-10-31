import { LayoutDashboard, UserCheck } from "lucide-react"; // sidebar icons

// Define all possible navigation items with support for submenus
export const ALL_NAVIGATION_ITEMS = {
  dashboard: { // dashboard nav entry
    name: "Dashboard", // label shown in nav
    href: "/dashboard", // route it links to
    icon: LayoutDashboard, // icon component
    roles: ["admin"], // who can see this entry
  },
  userManagement: { // user management nav entry
    name: "User Management", // label shown in nav
    icon: UserCheck, // icon component
    roles: ["admin"], // who can see this entry
    subMenu: [ // nested nav items
      {
        name: "All Users", // submenu label
        href: "/user-management/all-users", // submenu route
      },
      {
        name: "Roles & Permissions", // submenu label
        href: "/user-management/roles-permissions", // submenu route
      },
    ],
  },
};

// Role-based navigation configuration
export const ROLE_NAVIGATION = {
  admin: ["dashboard", "userManagement"], // admin sees both entries
  user: ["dashboard"], // plain user sees dashboard only
};

export const getNavigationItemsByRole = (userRole) => { // look up nav items allowed for a role
  if (!userRole || !ROLE_NAVIGATION[userRole]) {
    // Default fallback - only dashboard and settings
    return [ALL_NAVIGATION_ITEMS.dashboard, ALL_NAVIGATION_ITEMS.settings]; // unknown role fallback
  }

  const allowedItems = ROLE_NAVIGATION[userRole]; // item keys for this role
  return allowedItems
    .map((itemKey) => ALL_NAVIGATION_ITEMS[itemKey]) // resolve keys to item objects
    .filter(Boolean); // drop any missing entries
};

// role -> allowed route check
export const hasAccessToRoute = (route, userRole) => { // used by RoleProtected guard
  if (!userRole) return false; // no role, no access

  
  if (route === "/notifications") {
    return true; // any authenticated role
  }

  if (userRole === "admin" && (route.startsWith("/admin") || route === "/admindashboard")) {
    return true; // admin can reach any /admin* route
  }

  if (userRole === "customer" && route === "/customer-dashboard") {
    return true; // customer dashboard access
  }

  if (userRole === "delivery" && route === "/deliverydashboard") {
    return true; // delivery dashboard access
  }

  const navigationItems = getNavigationItemsByRole(userRole); // remaining nav-based routes for this role
  return navigationItems.some((item) => {
    if (item.href === route) return true; // direct nav item match
    if (item.subMenu && Array.isArray(item.subMenu)) {
      return item.subMenu.some((sub) => sub.href === route); // submenu item match
    }
    return false;
  });
};
