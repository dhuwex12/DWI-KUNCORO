
import React from 'react';
import { EditorState, Tool } from './ImageEditor';
import { BrushIcon } from './icons/BrushIcon';
import { EraserIcon } from './icons/EraserIcon';
import { UndoIcon } from './icons/UndoIcon';
import { RedoIcon } from './icons/RedoIcon';
import { ZoomInIcon } from './icons/ZoomInIcon';
import { ZoomOutIcon } from './icons/ZoomOutIcon';

interface ToolbarProps {
  editorState: EditorState;
  setEditorState: React.Dispatch<React.SetStateAction<EditorState>>;
  availableTools: Tool[];
  showBrushSize?: boolean;
  showUndoRedo?: boolean;
  showZoom?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
}

const ToolButton: React.FC<{
  label: string;
  toolName: Tool;
  currentTool: Tool;
  onClick: (tool: Tool) => void;
  children: React.ReactNode;
}> = ({ label, toolName, currentTool, onClick, children }) => (
  <button
    title={label}
    onClick={() => onClick(toolName)}
    className={`p-2 rounded-lg transition-colors ${
      currentTool === toolName
        ? 'bg-indigo-600 text-white'
        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
    }`}
  >
    {children}
  </button>
);

const ActionButton: React.FC<{
  label: string;
  onClick?: () => void;
  children: React.ReactNode;
}> = ({ label, onClick, children }) => (
    <button
        title={label}
        onClick={onClick}
        className="p-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
    >
        {children}
    </button>
);

const Toolbar: React.FC<ToolbarProps> = ({
  editorState,
  setEditorState,
  availableTools,
  showBrushSize,
  showUndoRedo,
  showZoom,
  onUndo, onRedo, onZoomIn, onZoomOut
}) => {
    
  const handleToolChange = (tool: Tool) => {
    setEditorState(prev => ({ ...prev, tool }));
  };
  
  const handleBrushSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditorState(prev => ({ ...prev, brushSize: parseInt(e.target.value, 10) }));
  };

  const toolMap: Record<Tool, { label: string, icon: React.ReactNode }> = {
      brush: { label: 'Pertahankan (Hijau)', icon: <BrushIcon /> },
      eraser: { label: 'Hapus (Merah)', icon: <EraserIcon /> },
      refine: { label: 'Pulihkan', icon: <BrushIcon /> },
      erase: { label: 'Hapus', icon: <EraserIcon /> },
  }

  return (
    <div className="bg-gray-800/50 p-2 rounded-lg border border-gray-700 flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-2">
        {availableTools.map(tool => (
            <ToolButton
                key={tool}
                label={toolMap[tool].label}
                toolName={tool}
                currentTool={editorState.tool}
                onClick={handleToolChange}
            >
                {toolMap[tool].icon}
            </ToolButton>
        ))}
      </div>
      
      {showBrushSize && (
        <div className="flex items-center gap-2 flex-1 min-w-[150px]">
          <input
            type="range"
            min="5"
            max="100"
            value={editorState.brushSize}
            onChange={handleBrushSizeChange}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-sm font-mono text-white w-8 text-center">{editorState.brushSize}</span>
        </div>
      )}
      
      <div className="flex items-center gap-2">
        {showUndoRedo && (
          <>
            <ActionButton label="Urungkan" onClick={onUndo}><UndoIcon /></ActionButton>
            <ActionButton label="Ulangi" onClick={onRedo}><RedoIcon /></ActionButton>
          </>
        )}
        {showZoom && (
          <>
            <ActionButton label="Perbesar" onClick={onZoomIn}><ZoomInIcon /></ActionButton>
            <ActionButton label="Perkecil" onClick={onZoomOut}><ZoomOutIcon /></ActionButton>
          </>
        )}
      </div>
    </div>
  );
};

export default Toolbar;
