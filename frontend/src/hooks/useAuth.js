import { shallowEqual, useSelector } from "react-redux";

// Read the logged-in user, token and login state from Redux
const useAuth = () => {
  const { user, token, isAuthenticated } = useSelector(
    (state) => state.auth,
    shallowEqual
  );

  return {
    user,
    token,
    isAuthenticated,
  };
};

export default useAuth;
