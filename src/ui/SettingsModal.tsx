import React from 'react';
import { GraphicsSettings } from '../game/types';
import { soundManager } from '../game/audio/AudioSynthesizer';
import { Settings, Sliders, Volume2, Monitor, Eye, X } from 'lucide-react';

interface SettingsModalProps {
  settings: GraphicsSettings;
  onUpdateSettings: (newSettings: GraphicsSettings) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  onClose,
}) => {
  const handleQualityChange = (quality: 'low' | 'medium' | 'high') => {
    onUpdateSettings({ ...settings, quality });
    soundManager.playButtonClick();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl p-8 flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-cyan-400" />
            <h2 className="text-xl font-bold font-display text-slate-100 tracking-wide">
              SYSTEM & COMBAT SETTINGS
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="py-6 space-y-6">
          {/* Graphics Quality */}
          <div>
            <label className="text-xs font-mono text-slate-400 uppercase tracking-wider flex items-center gap-2 mb-2">
              <Monitor className="w-4 h-4 text-cyan-400" /> GRAPHICS FIDELITY
            </label>
            <div className="grid grid-cols-3 gap-2 p-1 bg-slate-950/60 rounded-xl border border-slate-800">
              {(['low', 'medium', 'high'] as const).map((q) => (
                <button
                  key={q}
                  onClick={() => handleQualityChange(q)}
                  className={`py-2 text-xs font-semibold rounded-lg capitalize transition-colors cursor-pointer ${
                    settings.quality === q
                      ? 'bg-cyan-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-100'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Mouse Sensitivity */}
          <div>
            <div className="flex items-center justify-between text-xs font-mono text-slate-300 mb-1">
              <span className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" /> MOUSE SENSITIVITY
              </span>
              <span className="tabular-nums font-bold">{settings.mouseSensitivity.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="3.0"
              step="0.1"
              value={settings.mouseSensitivity}
              onChange={(e) =>
                onUpdateSettings({ ...settings, mouseSensitivity: parseFloat(e.target.value) })
              }
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>

          {/* Field of View (FOV) */}
          <div>
            <div className="flex items-center justify-between text-xs font-mono text-slate-300 mb-1">
              <span className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-cyan-400" /> FIELD OF VIEW (FOV)
              </span>
              <span className="tabular-nums font-bold">{settings.fov}°</span>
            </div>
            <input
              type="range"
              min="65"
              max="105"
              step="1"
              value={settings.fov}
              onChange={(e) =>
                onUpdateSettings({ ...settings, fov: parseInt(e.target.value, 10) })
              }
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>

          {/* Audio Master Volume */}
          <div>
            <div className="flex items-center justify-between text-xs font-mono text-slate-300 mb-1">
              <span className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-cyan-400" /> MASTER AUDIO VOLUME
              </span>
              <span className="tabular-nums font-bold">
                {Math.round(settings.masterVolume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.masterVolume}
              onChange={(e) =>
                onUpdateSettings({ ...settings, masterVolume: parseFloat(e.target.value) })
              }
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>

          {/* SFX Volume */}
          <div>
            <div className="flex items-center justify-between text-xs font-mono text-slate-300 mb-1">
              <span>COMBAT SFX VOLUME</span>
              <span className="tabular-nums font-bold">
                {Math.round(settings.sfxVolume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.sfxVolume}
              onChange={(e) =>
                onUpdateSettings({ ...settings, sfxVolume: parseFloat(e.target.value) })
              }
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
};
