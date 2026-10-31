import useAuth from "../../hooks/useAuth";
import ChangePasswordPanel from "../../components/shared/ChangePasswordPanel"; // shared password change form
import AdminLayout from "../../layouts/AdminLayout"; // shared admin page frame

// Admin page for changing the password
const AdminChangePassword = () => {
  const { user } = useAuth(); // logged-in admin

  return (
    // admin page shell with title/subtitle
    <AdminLayout title="Reset Password" subtitle="Keep your admin account secure">
      {/* shared change password form, header hidden since page already has title */}
      <ChangePasswordPanel email={user?.email} hideHeader />
    </AdminLayout>
  );
};

export default AdminChangePassword;
