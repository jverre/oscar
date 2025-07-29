"use client";

import React from "react";
import { AlertCircle } from "lucide-react";



export const PluginFileList = () => {
  return (
    <div className="flex items-center h-6 text-sm select-none text-orange-500" style={{ paddingLeft: `${2 * 12 + 4}px` }}>
      <AlertCircle className="h-3 w-3 mr-2" />
      <span className="text-xs">File browsing not yet implemented</span>
    </div>
  );
};