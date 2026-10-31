import ReturnPolicyContent from "../../../components/shared/ReturnPolicyContent"; // shared policy body

// The policy text itself lives in ReturnPolicyContent so the admin panel's "Return & Refund Policy" quick action shows the exact same rules.
const ReturnPolicyTab = () => <ReturnPolicyContent />;

export default ReturnPolicyTab;
