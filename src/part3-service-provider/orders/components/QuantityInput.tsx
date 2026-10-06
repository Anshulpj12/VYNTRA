/**
 * VYNTRA — Quantity Stepper Input Component
 * Minimum 48px touch targets for rapid, error-free resource count adjustment.
 */

interface QuantityInputProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (newValue: number) => void;
}

export default function QuantityInput({
  value,
  min = 1,
  max = 9999,
  step = 5,
  onChange,
}: QuantityInputProps) {
  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(Math.max(min, value - step));
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(Math.min(max, value + step));
  };

  return (
    <div className="quantity-stepper">
      <button
        type="button"
        className="quantity-btn"
        onClick={handleDecrement}
        disabled={value <= min}
        aria-label="Decrease quantity"
      >
        −
      </button>
      <span className="quantity-value">{value}</span>
      <button
        type="button"
        className="quantity-btn"
        onClick={handleIncrement}
        disabled={value >= max}
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  );
}
