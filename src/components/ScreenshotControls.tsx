import type { ScreenshotSettings } from './ScreenshotPreview';

interface Preset {
  name: string;
  settings: Partial<ScreenshotSettings>;
  colors: string[];
}

const PRESETS: Preset[] = [
  { name: 'Instagram Dark', settings: { bgType: 'gradient', gradientStart: '#833ab4', gradientEnd: '#fd1d1d', gradientAngle: 135, padding: 48, borderRadius: 16 }, colors: ['#833ab4', '#fd1d1d'] },
  { name: 'LinkedIn Light', settings: { bgType: 'solid', bgColor: '#f3f2ef', padding: 40, borderRadius: 8 }, colors: ['#f3f2ef'] },
  { name: 'Blog Minimal', settings: { bgType: 'solid', bgColor: '#ffffff', padding: 32, borderRadius: 4 }, colors: ['#ffffff'] },
  { name: 'Twitter Native', settings: { bgType: 'solid', bgColor: '#000000', padding: 24, borderRadius: 0 }, colors: ['#000000'] },
  { name: 'Gradient Purple', settings: { bgType: 'gradient', gradientStart: '#667eea', gradientEnd: '#764ba2', gradientAngle: 135, padding: 48, borderRadius: 16 }, colors: ['#667eea', '#764ba2'] },
];

interface Props {
  settings: ScreenshotSettings;
  tweetTheme: 'dark' | 'light';
  hideActions: boolean;
  activePreset: number | null;
  onSettingsChange: (settings: Partial<ScreenshotSettings>) => void;
  onThemeChange: (theme: 'dark' | 'light') => void;
  onHideActionsChange: (hide: boolean) => void;
  onPresetSelect: (index: number) => void;
  onDownload: () => void;
  onCopy: () => void;
  canCopy: boolean;
}

export function ScreenshotControls({
  settings,
  tweetTheme,
  hideActions,
  activePreset,
  onSettingsChange,
  onThemeChange,
  onHideActionsChange,
  onPresetSelect,
  onDownload,
  onCopy,
  canCopy,
}: Props) {
  return (
    <div className="screenshot-controls">
      <div className="screenshot-controls-section">
        <h4>Tweet Theme</h4>
        <div className="screenshot-toggle-group">
          <button className={`screenshot-toggle ${tweetTheme === 'dark' ? 'active' : ''}`} onClick={() => onThemeChange('dark')}>Dark</button>
          <button className={`screenshot-toggle ${tweetTheme === 'light' ? 'active' : ''}`} onClick={() => onThemeChange('light')}>Light</button>
        </div>
      </div>

      <div className="screenshot-controls-section">
        <h4>Clean Mode</h4>
        <div className="screenshot-toggle-group">
          <button className={`screenshot-toggle ${hideActions ? 'active' : ''}`} onClick={() => onHideActionsChange(true)}>Hide Actions</button>
          <button className={`screenshot-toggle ${!hideActions ? 'active' : ''}`} onClick={() => onHideActionsChange(false)}>Show Actions</button>
        </div>
      </div>

      <div className="screenshot-controls-section">
        <h4>Presets</h4>
        <div className="screenshot-preset-grid">
          {PRESETS.map((preset, i) => (
            <button
              key={preset.name}
              className={`screenshot-preset-btn ${activePreset === i ? 'active' : ''}`}
              onClick={() => onPresetSelect(i)}
            >
              <span className="preset-swatches">
                {preset.colors.map((c, j) => (
                  <span key={j} className="preset-swatch" style={{ background: c }} />
                ))}
              </span>
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      <div className="screenshot-controls-section">
        <h4>Background</h4>
        <div className="screenshot-toggle-group">
          <button className={`screenshot-toggle ${settings.bgType === 'solid' ? 'active' : ''}`} onClick={() => onSettingsChange({ bgType: 'solid' })}>Solid</button>
          <button className={`screenshot-toggle ${settings.bgType === 'gradient' ? 'active' : ''}`} onClick={() => onSettingsChange({ bgType: 'gradient' })}>Gradient</button>
        </div>
        {settings.bgType === 'solid' ? (
          <div className="screenshot-color-picker">
            <label>Color</label>
            <input type="color" value={settings.bgColor} onChange={(e) => onSettingsChange({ bgColor: e.target.value })} />
          </div>
        ) : (
          <>
            <div className="screenshot-color-picker">
              <label>Start</label>
              <input type="color" value={settings.gradientStart} onChange={(e) => onSettingsChange({ gradientStart: e.target.value })} />
            </div>
            <div className="screenshot-color-picker">
              <label>End</label>
              <input type="color" value={settings.gradientEnd} onChange={(e) => onSettingsChange({ gradientEnd: e.target.value })} />
            </div>
            <div className="screenshot-slider">
              <label>Angle: {settings.gradientAngle}°</label>
              <input type="range" min="0" max="360" value={settings.gradientAngle} onChange={(e) => onSettingsChange({ gradientAngle: Number(e.target.value) })} />
            </div>
          </>
        )}
      </div>

      <div className="screenshot-controls-section">
        <h4>Layout</h4>
        <div className="screenshot-slider">
          <label>Padding: {settings.padding}px</label>
          <input type="range" min="0" max="80" value={settings.padding} onChange={(e) => onSettingsChange({ padding: Number(e.target.value) })} />
        </div>
        <div className="screenshot-slider">
          <label>Border Radius: {settings.borderRadius}px</label>
          <input type="range" min="0" max="32" value={settings.borderRadius} onChange={(e) => onSettingsChange({ borderRadius: Number(e.target.value) })} />
        </div>
        <div className="screenshot-slider">
          <label>Scale: {settings.scale.toFixed(1)}x</label>
          <input type="range" min="0.5" max="2" step="0.1" value={settings.scale} onChange={(e) => onSettingsChange({ scale: Number(e.target.value) })} />
        </div>
      </div>

      <div className="screenshot-controls-section">
        <h4>Aspect Ratio</h4>
        <div className="screenshot-aspect-btns">
          {(['auto', '1:1', '9:16', '16:9'] as const).map((ar) => (
            <button key={ar} className={`screenshot-toggle ${settings.aspectRatio === ar ? 'active' : ''}`} onClick={() => onSettingsChange({ aspectRatio: ar })}>
              {ar === 'auto' ? 'Auto' : ar}
            </button>
          ))}
        </div>
      </div>

      <div className="screenshot-actions">
        <button className="screenshot-download-btn" onClick={onDownload}>Download PNG</button>
        {canCopy && <button className="screenshot-copy-btn" onClick={onCopy}>Copy to Clipboard</button>}
      </div>
    </div>
  );
}

export { PRESETS };
