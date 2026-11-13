import { ChevronDown } from "lucide-react";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const MAX_SUGGESTIONS = 50;

interface CarNameComboboxProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
}

/**
 * Searchable car-name input: free text is always allowed, and a filtered
 * listbox suggests names from the dataset (client-side, case-insensitive).
 */
export function CarNameCombobox({
  id,
  value,
  onChange,
  onBlur,
  options,
  placeholder = "e.g. Maruti Swift Dzire VDI",
  disabled = false,
  invalid = false,
}: CarNameComboboxProps) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = useMemo(() => {
    const query = value.trim().toLowerCase();
    if (!query) return options.slice(0, MAX_SUGGESTIONS);
    const starts: string[] = [];
    const contains: string[] = [];
    for (const option of options) {
      const lower = option.toLowerCase();
      if (lower.startsWith(query)) starts.push(option);
      else if (lower.includes(query)) contains.push(option);
      if (starts.length >= MAX_SUGGESTIONS) break;
    }
    return [...starts, ...contains].slice(0, MAX_SUGGESTIONS);
  }, [options, value]);

  // Close when clicking anywhere outside the combobox.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [value, open]);

  const commit = (option: string) => {
    onChange(option);
    setOpen(false);
    inputRef.current?.focus();
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) setOpen(true);
      else setActiveIndex((index) => Math.min(index + 1, suggestions.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      if (open && suggestions[activeIndex]) {
        // Select the highlighted suggestion instead of submitting the form.
        event.preventDefault();
        commit(suggestions[activeIndex]);
      }
    } else if (event.key === "Escape") {
      if (open) {
        event.preventDefault();
        setOpen(false);
      }
    }
  };

  const showPanel = open && !disabled;

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Input
          id={id}
          ref={inputRef}
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            showPanel && suggestions[activeIndex]
              ? `${listId}-${activeIndex}`
              : undefined
          }
          aria-invalid={invalid || undefined}
          autoComplete="off"
          disabled={disabled}
          placeholder={placeholder}
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            window.setTimeout(() => setOpen(false), 120);
            onBlur?.();
          }}
          onKeyDown={onKeyDown}
          className="pr-9"
        />
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
      </div>

      {showPanel && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Car name suggestions"
          className="absolute z-30 mt-1.5 max-h-56 w-full overflow-auto rounded-xl border border-border/70 bg-popover p-1.5 text-sm shadow-lg scrollbar-thin animate-scale-in"
        >
          {suggestions.length === 0 && (
            <li className="px-3 py-2 text-xs text-muted-foreground">
              No dataset match — press Enter to keep “{value.trim() || "your text"}”.
            </li>
          )}
          {suggestions.map((option, index) => (
            <li
              key={option}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              onMouseDown={(event) => {
                // Keep focus on the input so the panel doesn't close first.
                event.preventDefault();
                commit(option);
              }}
              onMouseEnter={() => setActiveIndex(index)}
              className={cn(
                "cursor-pointer truncate rounded-md px-3 py-2 transition-colors",
                index === activeIndex && "bg-accent text-accent-foreground",
              )}
            >
              {option}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
