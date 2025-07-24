import React from 'react';
import { PluginBuilder } from './PluginBuilder';

interface PluginComponentProps {
  pluginId: string;
  pluginName: string;
}

export const PluginComponent = ({ pluginId, pluginName }: PluginComponentProps) => {
  // Always show the Plugin Builder for both new and existing plugins
  return <PluginBuilder pluginName={pluginName} pluginId={pluginId} />;
}; 