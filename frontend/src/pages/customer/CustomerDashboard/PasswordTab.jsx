import ChangePasswordPanel from "../../../components/shared/ChangePasswordPanel"; // shared password change form

// Reset Password panel.
const PasswordTab = ({ user }) => (
  // same narrow column as the profile form, so the two tabs line up
  <div className="mx-auto w-full max-w-2xl">
    <ChangePasswordPanel email={user?.email} />
  </div>
);

export default PasswordTab;
