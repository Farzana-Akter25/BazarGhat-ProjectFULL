import ChangePasswordPanel from "../../../components/shared/ChangePasswordPanel"; // shared password change form
import useAuth from "../../../hooks/useAuth";

// Reset Password panel.
const PasswordTab = () => {
  const { user } = useAuth(); // logged-in rider

  return (
    // same narrow column as the profile card, so the two tabs line up
    <div className="mx-auto w-full max-w-2xl">
      <ChangePasswordPanel email={user?.email} />
    </div>
  );
};

export default PasswordTab;
