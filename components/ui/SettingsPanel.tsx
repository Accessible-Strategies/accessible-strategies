'use client';

import { useTheme, type Theme } from '@/lib/ThemeContext';
import { useSettings }          from '@/lib/SettingsContext';
import Modal                    from '@/components/ui/Modal';

interface OptionRowProps {
  label:       string;
  description: string;
  options:     string[];
  value:       string;
  onChange:    (v: string) => void;
  name:        string;
}

// Was hardcoded to exactly two options (optionA/optionB) — generalised to a
// list so Theme can offer a third choice (High Contrast) without a separate
// row component. Every existing two-option row below just passes a
// two-item array now, so nothing else about their behaviour changes.
function OptionRow({ label, description, options, value, onChange, name }: OptionRowProps) {
  return (
    <div className="settings-row">
      <div className="settings-row__label">{label}</div>
      <p className="settings-row__desc">{description}</p>
      <div className="settings-row__options" role="radiogroup" aria-label={label}>
        {options.map(opt => (
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

const THEME_LABEL: Record<Theme, string> = {
  dark:  'Dark',
  light: 'Light',
  hc:    'High Contrast',
};

const LABEL_TO_THEME: Record<string, Theme> = {
  'Dark':          'dark',
  'Light':         'light',
  'High Contrast': 'hc',
};

export default function SettingsPanel({ onClose, anchor }: SettingsPanelProps) {
  const { theme, setTheme }                                       = useTheme();
  const { externalLinks, internalLinks, focusAssistance,
          setExternalLinks, setInternalLinks, setFocusAssistance } = useSettings();

  return (
    <Modal onClose={onClose} anchor={anchor} title="Settings">

      <OptionRow
        name="theme"
        label="Theme"
        description="Choose how the site looks. Dark mode reduces screen brightness; light mode may be easier to read in bright environments; High Contrast maximizes contrast between text and background for low vision."
        options={['Dark', 'Light', 'High Contrast']}
        value={THEME_LABEL[theme]}
        onChange={v => setTheme(LABEL_TO_THEME[v])}
      />

      <OptionRow
        name="external-links"
        label="External Links"
        description="Controls whether links to other websites open in a new tab or replace the current page."
        options={['New tab', 'Same tab']}
        value={externalLinks === 'new-tab' ? 'New tab' : 'Same tab'}
        onChange={v => setExternalLinks(v === 'New tab' ? 'new-tab' : 'same-tab')}
      />

      <OptionRow
        name="internal-links"
        label="Internal Links"
        description="Controls whether links within this site open in a new tab or navigate within the current tab."
        options={['Same tab', 'New tab']}
        value={internalLinks === 'same-tab' ? 'Same tab' : 'New tab'}
        onChange={v => setInternalLinks(v === 'Same tab' ? 'same-tab' : 'new-tab')}
      />

      <OptionRow
        name="focus-assistance"
        label="Focus Assistance"
        description="Dims and blurs background content when menus, popups, or modals are open, helping you focus on what's active."
        options={['Enabled', 'Disabled']}
        value={focusAssistance ? 'Enabled' : 'Disabled'}
        onChange={v => setFocusAssistance(v === 'Enabled')}
      />

    </Modal>
  );
}