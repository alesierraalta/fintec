"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CheckboxProps
    extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
    ({ className, checked, onCheckedChange, disabled, id, ...props }, ref) => {
        const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
            onCheckedChange?.(event.target.checked);
        };

        return (
            <div className="relative flex items-center">
                <input
                    type="checkbox"
                    id={id}
                    className="peer sr-only"
                    checked={checked}
                    onChange={handleChange}
                    disabled={disabled}
                    ref={ref}
                    {...props}
                />
                <div
                    className={cn(
                        "h-5 w-5 rounded border-2 border-primary/20 bg-background ring-offset-background transition-all peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
                        checked && "bg-primary border-primary text-primary-foreground",
                        className
                    )}
                >
                    <div
                        className={cn(
                            "flex h-full w-full items-center justify-center text-current",
                            checked ? "opacity-100" : "opacity-0"
                        )}
                    >
                        <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    </div>
                </div>
                {/* Invisible clickable overlay to ensure good touch target */}
                <label
                    htmlFor={id}
                    className="absolute inset-0 cursor-pointer"
                    aria-hidden="true"
                />
            </div>
        );
    }
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
