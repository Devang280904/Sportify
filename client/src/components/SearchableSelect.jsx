import { useState, useRef, useEffect } from 'react';
import { HiOutlineSearch, HiOutlineChevronDown, HiOutlineCheck } from 'react-icons/hi';

const SearchableSelect = ({ options, value, onChange, placeholder, getOptionLabel, getOptionSublabel, isDisabled, error }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef(null);

  const selectedOption = options.find(opt => opt._id === value);
  
  const filteredOptions = options.filter(opt => 
    getOptionLabel(opt).toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (option) => {
    onChange(option._id);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        onClick={() => !isDisabled && setIsOpen(!isOpen)}
        className={`input flex items-center justify-between cursor-pointer transition-all duration-200 ${
          isOpen ? 'ring-2 ring-primary/20 border-primary' : ''
        } ${isDisabled ? 'opacity-50 cursor-not-allowed bg-surface' : ''} ${
          error ? 'border-danger' : ''
        }`}
      >
        <span className={`truncate font-bold ${!selectedOption ? 'text-txt-muted font-normal' : 'text-txt-primary'}`}>
          {selectedOption ? getOptionLabel(selectedOption) : placeholder}
        </span>
        <HiOutlineChevronDown className={`text-txt-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute z-[100] w-full mt-2 bg-surface-card border border-surface-border rounded-xl shadow-card-lg overflow-hidden animate-fade-in-down origin-top">
          <div className="p-2 border-b border-surface-border bg-surface/50">
            <div className="relative">
              <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-muted" />
              <input
                autoFocus
                type="text"
                className="w-full bg-surface border border-surface-border rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="Search teams..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          
          <div className="max-h-60 overflow-y-auto custom-scrollbar">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => {
                const isSelected = option._id === value;
                const sublabel = getOptionSublabel ? getOptionSublabel(option) : '';
                
                return (
                  <div
                    key={option._id}
                    onClick={() => handleSelect(option)}
                    className={`px-4 py-3 cursor-pointer flex items-center justify-between transition-colors ${
                      isSelected ? 'bg-primary/10' : 'hover:bg-surface-hover'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className={`text-sm font-bold ${isSelected ? 'text-primary' : 'text-txt-primary'}`}>
                        {getOptionLabel(option)}
                      </span>
                      {sublabel && (
                        <span className="text-[11px] font-black uppercase tracking-widest text-txt-muted mt-0.5">
                          {sublabel}
                        </span>
                      )}
                    </div>
                    {isSelected && <HiOutlineCheck className="text-primary text-lg" />}
                  </div>
                );
              })
            ) : (
              <div className="px-4 py-8 text-center text-txt-muted text-sm italic">
                No results found for "{search}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
