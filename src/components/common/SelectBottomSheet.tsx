import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { X, Check, Search, ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
}

export interface SelectBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  options: Array<string | SelectOption>;
  selectedValue?: string | null;
  onSelect: (value: string) => void;
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyMessage?: string;
  id?: string;
}

/**
 * Global SelectBottomSheet Component
 * Provides an overlay modal bottom sheet replacing all native browser dropdowns.
 */
export const SelectBottomSheet: React.FC<SelectBottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  options,
  selectedValue,
  onSelect,
  searchable = false,
  searchPlaceholder = 'Cari pilihan...',
  emptyMessage = 'Tiada padanan dijumpai',
  id,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Normalize options to SelectOption[]
  const normalizedOptions: SelectOption[] = useMemo(() => {
    return options.map((opt) => {
      if (typeof opt === 'string') {
        return { value: opt, label: opt };
      }
      return opt;
    });
  }, [options]);

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return normalizedOptions;
    const q = searchQuery.toLowerCase().trim();
    return normalizedOptions.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        opt.value.toLowerCase().includes(q) ||
        opt.description?.toLowerCase().includes(q)
    );
  }, [normalizedOptions, searchQuery]);

  // Reset search and focus when opened
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      if (searchable) {
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 150);
      }
    }
  }, [isOpen, searchable]);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSelect = (value: string) => {
    onSelect(value);
    onClose();
  };

  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          id={id ? `${id}-overlay` : 'global-select-bottom-sheet'}
          className="fixed inset-0 z-50 flex items-end justify-center pointer-events-auto m-0 p-0 bottom-0"
        >
          {/* Backdrop */}
          <motion.div
            key="sheet-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs cursor-pointer m-0"
            aria-hidden="true"
          />

          {/* Bottom Sheet Modal Frame */}
          <motion.div
            key="sheet-frame"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="relative w-full max-w-[500px] max-h-[85vh] bg-[#FFFFFF] rounded-t-[16px] shadow-2xl flex flex-col z-10 overflow-hidden m-0 mb-0 bottom-0"
          >
            {/* Grabber Handle */}
            <div className="pt-3 pb-1 flex justify-center cursor-grab active:cursor-grabbing">
              <div className="w-12 h-1.5 bg-[#E4E5E8] rounded-full" />
            </div>

            {/* Header */}
            <div className="px-5 pt-2 pb-3 border-b border-[#E4E5E8] flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#17181B] tracking-tight">{title}</h3>
                {subtitle && <p className="text-xs text-[#686B73] mt-0.5">{subtitle}</p>}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-[#F7F7F8] hover:bg-[#E4E5E8] text-[#686B73] hover:text-[#17181B] flex items-center justify-center transition-colors focus:outline-none"
                aria-label="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Optional Search Input */}
            {searchable && (
              <div className="p-3 border-b border-[#E4E5E8] bg-[#F7F7F8]">
                <div className="relative flex items-center">
                  <Search className="w-4 h-4 text-[#686B73] absolute left-3.5 pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={searchPlaceholder}
                    className="w-full h-[44px] pl-10 pr-8 bg-[#FFFFFF] border border-[#E4E5E8] rounded-[12px] text-xs text-[#17181B] focus:outline-none focus:ring-2 focus:ring-[#E31B23] focus:border-transparent placeholder:text-[#686B73]"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 text-[#686B73] hover:text-[#17181B] p-0.5 rounded-full"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Scrollable Option List */}
            <div className="overflow-y-auto p-3 space-y-1.5 max-h-[55vh] overscroll-contain">
              {filteredOptions.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#686B73] space-y-1">
                  <p>{emptyMessage}</p>
                  {searchQuery && <p className="text-[11px] text-[#686B73]/70">"{searchQuery}"</p>}
                </div>
              ) : (
                filteredOptions.map((option) => {
                  const isSelected = selectedValue === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleSelect(option.value)}
                      className={`w-full px-4 py-3 rounded-[12px] text-left text-xs transition-all flex items-center justify-between active:scale-[0.99] ${
                        isSelected
                          ? 'bg-[#FDEBEC] text-[#E31B23] font-bold border border-[#E31B23]/30 shadow-2xs'
                          : 'bg-[#FFFFFF] hover:bg-[#F7F7F8] text-[#17181B] border border-transparent font-medium'
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0 pr-2">
                        {option.icon && <span className="shrink-0">{option.icon}</span>}
                        <div className="truncate">
                          <span className="block truncate text-sm">{option.label}</span>
                          {option.description && (
                            <span className="block text-[11px] text-[#686B73] font-normal mt-0.5">
                              {option.description}
                            </span>
                          )}
                        </div>
                      </div>
                      {isSelected && (
                        <span className="w-5 h-5 rounded-full bg-[#E31B23] text-white flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export interface SelectFieldProps {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<string | SelectOption>;
  placeholder?: string;
  title?: string;
  subtitle?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  error?: string | null;
}

/**
 * SelectField: Standard Form Field Trigger + BottomSheet Overlay
 */
export const SelectField: React.FC<SelectFieldProps> = ({
  id,
  label,
  value,
  onChange,
  options,
  placeholder = 'Pilih salah satu',
  title,
  subtitle,
  searchable,
  searchPlaceholder,
  emptyMessage,
  disabled = false,
  required = false,
  className = '',
  error,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Derive label of current selected value
  const selectedOption = useMemo(() => {
    for (const opt of options) {
      if (typeof opt === 'string') {
        if (opt === value) return { value: opt, label: opt };
      } else if (opt.value === value) {
        return opt;
      }
    }
    return null;
  }, [options, value]);

  const displayLabel = selectedOption?.label || value || '';

  return (
    <div className={`${label ? 'space-y-1.5' : ''} m-0 mb-0 ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-semibold text-[#17181B]"
        >
          {label} {required && <span className="text-[#D92D20]">*</span>}
        </label>
      )}

      <button
        type="button"
        id={id}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!disabled) setIsOpen(true);
        }}
        disabled={disabled}
        className={`w-full h-[52px] px-4 bg-[#FFFFFF] border rounded-[12px] text-sm transition-colors flex items-center justify-between text-left m-0 mb-0 focus:outline-none focus:ring-2 focus:ring-[#E31B23] disabled:opacity-50 disabled:cursor-not-allowed ${
          error
            ? 'border-[#D92D20] bg-[#FDEBEC]/30'
            : isOpen
            ? 'border-[#E31B23] ring-2 ring-[#E31B23]/20 bg-[#FFFFFF]'
            : 'border-[#E4E5E8] hover:border-[#686B73]/40'
        }`}
      >
        <span className={displayLabel ? 'text-[#17181B] font-medium' : 'text-[#686B73]'}>
          {displayLabel || placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-[#686B73] transition-transform shrink-0 ml-2 ${
            isOpen ? 'rotate-180 text-[#E31B23]' : ''
          }`}
        />
      </button>

      {error && <p className="text-[11px] text-[#D92D20] mt-1">{error}</p>}

      <SelectBottomSheet
        id={id}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={title || label || 'Pilih Pilihan'}
        subtitle={subtitle}
        options={options}
        selectedValue={value}
        onSelect={onChange}
        searchable={searchable}
        searchPlaceholder={searchPlaceholder}
        emptyMessage={emptyMessage}
      />
    </div>
  );
};
