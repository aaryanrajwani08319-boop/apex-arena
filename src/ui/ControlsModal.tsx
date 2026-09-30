import React from 'react';
import { Keyboard, Mouse, Smartphone, X } from 'lucide-react';

interface ControlsModalProps {
  onClose: () => void;
}

export const ControlsModal: React.FC<ControlsModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl p-6 sm:p-8 flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <Keyboard className="w-5 h-5 text-cyan-400" />
            <h2 className="text-xl font-bold font-display text-slate-100 tracking-wide">
              FIELD CONTROLS & KEYBINDS
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="py-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Desktop Controls */}
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 uppercase tracking-wider mb-3">
              <Mouse className="w-4 h-4" /> DESKTOP (KEYBOARD & MOUSE)
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex items-center justify-between p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-slate-300 font-medium">Movement</span>
                <span className="font-mono bg-slate-800 px-2.5 py-1 rounded text-cyan-300 font-bold">
                  W / A / S / D
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-slate-300 font-medium">Look / Aim</span>
                <span className="font-mono bg-slate-800 px-2.5 py-1 rounded text-cyan-300 font-bold">
                  Mouse Movement
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-slate-300 font-medium">Primary Fire</span>
                <span className="font-mono bg-slate-800 px-2.5 py-1 rounded text-cyan-300 font-bold">
                  Left Mouse Button
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-slate-300 font-medium">Aim Down Sights (ADS)</span>
                <span className="font-mono bg-slate-800 px-2.5 py-1 rounded text-cyan-300 font-bold">
                  Right Mouse Button
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-slate-300 font-medium">Reload Weapon</span>
                <span className="font-mono bg-slate-800 px-2.5 py-1 rounded text-cyan-300 font-bold">
                  R
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-slate-300 font-medium">Jump (or Use Jump Pad)</span>
                <span className="font-mono bg-slate-800 px-2.5 py-1 rounded text-cyan-300 font-bold">
                  Space
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-slate-300 font-medium">Sprint (Accelerate)</span>
                <span className="font-mono bg-slate-800 px-2.5 py-1 rounded text-cyan-300 font-bold">
                  Shift
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-slate-300 font-medium">Crouch / Slide</span>
                <span className="font-mono bg-slate-800 px-2.5 py-1 rounded text-cyan-300 font-bold">
                  Ctrl or C
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-slate-300 font-medium">Switch Weapon Slot</span>
                <span className="font-mono bg-slate-800 px-2.5 py-1 rounded text-cyan-300 font-bold">
                  1 / 2 or Q
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-slate-300 font-medium">Tactical (Stim / EMP)</span>
                <span className="font-mono bg-slate-800 px-2.5 py-1 rounded text-cyan-300 font-bold">
                  G
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-950/60 rounded-xl border border-slate-800 sm:col-span-2">
                <span className="text-slate-300 font-medium">Pause Menu / Scoreboard</span>
                <span className="font-mono bg-slate-800 px-2.5 py-1 rounded text-cyan-300 font-bold">
                  Esc
                </span>
              </div>
            </div>
          </div>

          {/* Mobile / Touch Controls */}
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 uppercase tracking-wider mb-3">
              <Smartphone className="w-4 h-4" /> MOBILE & TOUCH CONTROLS
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-slate-300 font-semibold block mb-1">Left Virtual Joystick</span>
                <p className="text-slate-400 text-[11px]">
                  Touch and drag on bottom-left screen to move in 360 degrees.
                </p>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-slate-300 font-semibold block mb-1">Swipe Look Zone</span>
                <p className="text-slate-400 text-[11px]">
                  Swipe anywhere on the right half of the screen to aim your crosshair.
                </p>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-slate-300 font-semibold block mb-1">FIRE Button (Red)</span>
                <p className="text-slate-400 text-[11px]">
                  Hold down the large red circular button to discharge your weapon.
                </p>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-slate-300 font-semibold block mb-1">ADS, Jump & Reload</span>
                <p className="text-slate-400 text-[11px]">
                  Dedicated buttons on bottom-right to toggle precision zoom, jump, and reload.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
};
