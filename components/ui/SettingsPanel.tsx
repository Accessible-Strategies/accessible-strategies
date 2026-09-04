'use client';

import { useTheme }    from '@/lib/ThemeContext';
import { useSettings } from '@/lib/SettingsContext';
import Modal from '@/components/ui/Modal';

interface OptionRowProps {
  label:       string;
  description: string;
  optionA:     string;
  optionB:     string;
  value:       string;
  onChange:    (v: string) => void;
  name:        string;
}

function OptionRow({ label, description, optionA, optionB, value, onChange, name }: OptionRowProps) {
  return (
    <div className="settings-row">
      <div className="settings-row__label">{label}</div>
      <p className="settings-row__desc">{description}</p>
      <div className="settings-row__options" role="radiogroup" aria-label={label}>
        {[optionA, optionB].map(opt => (
          <label key={opt} className={`settings-option${value === opt ? ' settings-option--active' : ''}`}>
            <input
              type="radio"
              name={name}
              value={opt}
              checked={value === opt}
              onChange={() => onChange(opt)}
              className="sr-only"
            />
            {opt}
          </label>
        ))}
      </div>
    </div>
  );
}

interface Anchor {
  top:   number;
  right: number;
}

interface SettingsPanelProps {
  onClose: () => void;
  anchor:  Anchor;
}

export default function SettingsPanel({ onClose, anchor }: SettingsPanelProps) {
  const { theme, toggleTheme }                                    = useTheme();
  const { externalLinks, internalLinks, focusAssistance,
          setExternalLinks, setInternalLinks, setFocusAssistance } = useSettings();

  return (
    <Modal onClose={onClose} anchor={anchor} title="Settings">

      <OptionRow
        name="theme"
        label="Theme"
        description="Choose how the site looks. Dark mode reduces screen brightness; light mode may be easier to read in bright environments."
        optionA="Dark"
        optionB="Light"
        value={theme === 'dark' ? 'Dark' : 'Light'}
        onChange={v => { if ((v === 'Dark') !== (theme === 'dark')) toggleTheme(); }}
      />

      <OptionRow
        name="external-links"
        label="External Links"
        description="Controls whether links to other websites open in a new tab or replace the current page."
        optionA="New tab"
        optionB="Same tab"
        value={externalLinks === 'new-tab' ? 'New tab' : 'Same tab'}
        onChange={v => setExternalLinks(v === 'New tab' ? 'new-tab' : 'same-tab')}
      />

      <OptionRow
        name="internal-links"
        label="Internal Links"
        description="Controls whether links within this site open in a new tab or navigate within the current tab."
        optionA="Same tab"
        optionB="New tab"
        value={internalLinks === 'same-tab' ? 'Same tab' : 'New tab'}
        onChange={v => setInternalLinks(v === 'Same tab' ? 'same-tab' : 'new-tab')}
      />

      <OptionRow
        name="focus-assistance"
        label="Focus Assistance"
        description="Dims and blurs background content when menus, popups, or modals are open, helping you focus on what's active."
        optionA="Enabled"
        optionB="Disabled"
        value={focusAssistance ? 'Enabled' : 'Disabled'}
        onChange={v => setFocusAssistance(v === 'Enabled')}
      />

    </Modal>
  );
}