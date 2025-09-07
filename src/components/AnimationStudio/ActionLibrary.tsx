import React from 'react';
import { ActionBlockDefinition } from './types';

interface ActionLibraryProps {
  actions: ActionBlockDefinition[];
  onDragStart: (action: ActionBlockDefinition) => void;
  onAddAction: (action: ActionBlockDefinition) => void;
}

const ActionLibrary: React.FC<ActionLibraryProps> = ({ actions, onDragStart, onAddAction }) => {
  const categories = ['movement', 'combat', 'special'] as const;

  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <h3 className="text-white font-bold mb-4">Action Library</h3>
      <div className="space-y-4">
        {categories.map(category => (
          <div key={category}>
            <h4 className="text-gray-400 text-sm font-semibold uppercase mb-2">
              {category}
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {actions
                .filter(action => action.category === category)
                .map(action => (
                  <div
                    key={action.id}
                    draggable
                    onDragStart={() => onDragStart(action)}
                    onClick={() => onAddAction(action)}
                    className="bg-gray-700 p-3 rounded cursor-move hover:bg-gray-600 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{action.icon}</span>
                      <div>
                        <div className="text-white text-sm font-medium">
                          {action.name}
                        </div>
                        <div className="text-gray-400 text-xs">
                          {action.defaultDuration}ms
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActionLibrary;