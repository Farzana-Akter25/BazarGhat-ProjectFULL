import { Home } from "lucide-react"; // home link icon
import { Link } from "react-router-dom"; // client side navigation
import PanelSidebarToggle, { PANEL_CONTROL_CLASS } from "./PanelSidebarToggle"; // sidebar show/hide button

// Top controls shared by the admin, customer and delivery man panels: hide/show the panel nav, and leave the panel for the public home page.
const PanelTopBar = ({ isOpen, onToggle, className = "" }) => {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {/* sidebar show/hide */}
      <PanelSidebarToggle isOpen={isOpen} onToggle={onToggle} />

      {/* back to the public site */}
      <Link to="/" title="Go to Home page" className={PANEL_CONTROL_CLASS}>
        <Home size={16} />
        Home
      </Link>
    </div>
  );
};

export default PanelTopBar;
