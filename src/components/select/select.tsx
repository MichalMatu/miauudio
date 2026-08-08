import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useCallback, useEffect, useState } from 'react';
import { IoCheckmark, IoChevronDown } from 'react-icons/io5';

import { cn } from '@/helpers/styles';

import styles from './select.module.css';

export interface SelectOption<Value extends string = string> {
  label: string;
  value: Value;
}

interface SelectProps<Value extends string> {
  ariaLabel: string;
  className?: string;
  id?: string;
  onValueChange: (value: Value) => void;
  options: ReadonlyArray<SelectOption<Value>>;
  value: Value;
}

export function Select<Value extends string>({
  ariaLabel,
  className,
  id,
  onValueChange,
  options,
  value,
}: SelectProps<Value>) {
  const [open, setOpen] = useState(false);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(
    null,
  );
  const selectedOption = options.find(option => option.value === value);
  const selectedLabel = selectedOption?.label ?? value;

  const setTriggerRef = useCallback((trigger: HTMLButtonElement | null) => {
    if (!trigger) return;

    setPortalContainer(
      trigger.closest<HTMLElement>('[data-modal-root]') ?? document.body,
    );
  }, []);

  const handleValueChange = (nextValue: string) => {
    const option = options.find(option => option.value === nextValue);
    if (option) onValueChange(option.value);
  };

  useEffect(() => {
    if (!open) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;

      event.preventDefault();
      event.stopImmediatePropagation();
      setOpen(false);
    };

    document.addEventListener('keydown', closeOnEscape, { capture: true });

    return () =>
      document.removeEventListener('keydown', closeOnEscape, {
        capture: true,
      });
  }, [open]);

  return (
    <DropdownMenu.Root modal={false} open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger
        aria-label={`${ariaLabel}: ${selectedLabel}`}
        className={cn(styles.trigger, className)}
        id={id}
        ref={setTriggerRef}
        type="button"
      >
        <span className={styles.value}>{selectedLabel}</span>
        <IoChevronDown aria-hidden="true" className={styles.chevron} />
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal container={portalContainer ?? undefined}>
        <DropdownMenu.Content
          align="start"
          aria-label={`${ariaLabel} options`}
          className={styles.content}
          collisionPadding={12}
          data-app-layer="open"
          loop
          sideOffset={6}
        >
          <DropdownMenu.RadioGroup
            value={value}
            onValueChange={handleValueChange}
          >
            {options.map(option => (
              <DropdownMenu.RadioItem
                className={styles.item}
                key={option.value}
                value={option.value}
              >
                <span>{option.label}</span>
                <DropdownMenu.ItemIndicator className={styles.indicator}>
                  <IoCheckmark aria-hidden="true" />
                </DropdownMenu.ItemIndicator>
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
