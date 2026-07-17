import { shallowEqual, useSelector } from "react-redux";

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
