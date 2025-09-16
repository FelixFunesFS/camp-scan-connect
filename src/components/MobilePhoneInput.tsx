import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPhoneNumberPartial } from "@/lib/phoneUtils";

interface MobilePhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  onSubmit?: () => void;
}

export function MobilePhoneInput({ value, onChange, disabled, onSubmit }: MobilePhoneInputProps) {
  const [displayValue, setDisplayValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let input = e.target.value.replace(/\D/g, '');
    
    // Limit to 10 digits
    if (input.length > 10) {
      input = input.slice(0, 10);
    }
    
    // Update raw value for parent
    onChange(input);
    
    // Update formatted display value
    setDisplayValue(formatPhoneNumberPartial(input));
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && value.length === 10 && onSubmit) {
      onSubmit();
    }
  };

  return (
    <div className="space-y-3">
      <Label htmlFor="mobile-phone" className="text-base font-medium">
        Enter your phone number
      </Label>
      <Input
        id="mobile-phone"
        ref={inputRef}
        type="tel"
        placeholder="(555) 123-4567"
        value={displayValue}
        onChange={handleInputChange}
        onKeyPress={handleKeyPress}
        disabled={disabled}
        className="h-14 text-lg text-center tracking-wider font-mono"
        autoComplete="tel"
        inputMode="numeric"
      />
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Enter the phone number used during registration
        </p>
        {value.length > 0 && (
          <div className="mt-2 flex justify-center">
            <div className="flex space-x-1">
              {[...Array(10)].map((_, i) => (
                <div
                  key={i}
                  className={`w-3 h-1 rounded-full transition-colors ${
                    i < value.length 
                      ? 'bg-primary' 
                      : 'bg-muted'
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}