import { useEffect, useRef, useState } from "react";

// Row of single-digit boxes for typing an OTP code
const OtpInput = ({ length = 6, onComplete, disabled }) => {
  const [values, setValues] = useState(Array(length).fill("")); // one entry per digit box
  const inputsRef = useRef([]); // refs to each digit input, for focus control

  // focus first box on mount
  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  // fire onComplete when all digits filled
  const commitIfComplete = (next) => {
    if (next.every((d) => d !== "")) {
      onComplete(next.join(""));
    }
  };

  // move focus to next box on digit entry
  const handleChange = (index, e) => {
    const digit = e.target.value.replace(/\D/g, "").slice(-1); // keep last digit only
    // Put the typed digit in its box
    const next = [...values];
    next[index] = digit;
    setValues(next);

    if (digit && index < length - 1) {
      inputsRef.current[index + 1]?.focus(); // jump to next box
    }
    commitIfComplete(next);
  };

  // backspace moves focus back
  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !values[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  // spread pasted code across boxes
  const handlePaste = (e) => {
    e.preventDefault();
    // Digits from the pasted text, up to the number of boxes
    const digits = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, length)
      .split("");

    if (!digits.length) return; // nothing usable pasted

    // Fill the boxes with the pasted digits
    const next = Array(length).fill("");
    digits.forEach((d, i) => {
      next[i] = d;
    });
    setValues(next);

    const lastIndex = Math.min(digits.length, length) - 1; // focus last filled box
    inputsRef.current[lastIndex]?.focus();
    commitIfComplete(next);
  };

  return (
    // otp digit boxes
    <div className="flex justify-center gap-1.5" onPaste={handlePaste}>
      {/* one input per digit */}
      {values.map((val, i) => (
        <input
          key={i}
          ref={(el) => (inputsRef.current[i] = el)}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          value={val}
          disabled={disabled}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className="w-9 h-10 text-center text-base font-bold border rounded-lg bg-gray-50 focus:ring-2 focus:ring-orange-500 outline-none disabled:opacity-60"
        />
      ))}
    </div>
  );
};

export default OtpInput;
