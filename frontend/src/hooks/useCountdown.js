import { useEffect, useState } from "react";

// Split the time left until a date into days, hours, minutes and seconds
const getRemaining = (targetDate) => {
  // Milliseconds and whole seconds left (never negative)
  const totalMs = targetDate ? new Date(targetDate).getTime() - Date.now() : 0;
  const totalSeconds = Math.max(0, Math.floor(totalMs / 1000));

  return {
    totalSeconds,
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    expired: totalSeconds <= 0,
  };
};

// Live countdown to a date that updates every second
export const useCountdown = (targetDate) => {
  // Time left right now
  const [remaining, setRemaining] = useState(() => getRemaining(targetDate));

  // Restart the timer whenever the target date changes
  useEffect(() => {
    setRemaining(getRemaining(targetDate));

    if (!targetDate) return undefined;

    // Update the time left every second
    const interval = setInterval(() => {
      setRemaining(getRemaining(targetDate));
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  return remaining;
};

// Add a leading zero, e.g. 7 -> "07"
export const pad2 = (n) => n.toString().padStart(2, "0");
