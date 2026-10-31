import toast from "react-hot-toast";
import Toast from "../components/shared/Toast"; // shared notification card

// how long each tone stays up — errors linger, confirmations get out of the way
const DURATIONS = {
  success: 2600,
  info: 2800,
  warning: 3200,
  error: 4000,
};

const MAX_LENGTH = 90; // a notification should be readable at a glance, not read

// collapse whitespace and cut anything too long down to one short line
const shorten = (text, fallback = "Something went wrong") => {
  const value = String(text ?? "").replace(/\s+/g, " ").trim() || fallback;
  return value.length > MAX_LENGTH ? `${value.slice(0, MAX_LENGTH - 1).trimEnd()}…` : value;
};

// single entry point, so tone, duration and de-duplication stay consistent app-wide
const show = (tone, message, options = {}) => {
  const text = shorten(message);
  return toast.custom((t) => <Toast t={t} tone={tone} message={text} />, {
    duration: DURATIONS[tone] ?? 3000,
    id: `${tone}:${text}`, // repeating the same message re-uses its toast instead of stacking
    ...options,
  });
};

// pull the shortest useful line out of an api failure (laravel validation, message, network)
const readApiError = (error, fallback) => {
  // Error body from the different error shapes
  const data = error?.data ?? error?.error?.data ?? error?.response?.data;
  const firstValidation = data?.errors
    ? Object.values(data.errors).flat().filter(Boolean)[0]
    : null;

  if (error?.status === "FETCH_ERROR") return "Network error. Check your connection.";

  return firstValidation || data?.message || fallback;
};

// project-wide notification api: import notify from "<path>/utils/notify"
// One method per tone
const notify = {
  success: (message, options) => show("success", message, options),
  error: (message, options) => show("error", message, options),
  warning: (message, options) => show("warning", message, options),
  info: (message, options) => show("info", message, options),

  // pending state for slower actions, stays until dismissed with the returned id
  loading: (message = "Working…", options) =>
    show("loading", message, { duration: Infinity, ...options }),

  // Close a toast by id
  dismiss: (id) => toast.dismiss(id),

  // failed request in, one short human line out
  apiError: (error, fallback = "Something went wrong") =>
    show("error", readApiError(error, fallback)),

  // loading -> success/error around a promise, for save and submit flows
  promise: async (promise, messages = {}) => {
    // Show the loading toast, then swap it for success or error
    const id = notify.loading(messages.loading);
    try {
      const result = await promise;
      toast.dismiss(id);
      notify.success(messages.success ?? "Done");
      return result;
    } catch (error) {
      toast.dismiss(id);
      notify.apiError(error, messages.error);
      throw error;
    }
  },
};

export default notify;
