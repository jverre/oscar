/**
 * Utilities for handling file name conflicts and auto-numbering
 */

export interface FileNameParts {
  base: string;
  extension: string;
  number?: number;
}

/**
 * Extracts the base name, extension, and existing number from a file name
 * Examples:
 * - "document.chat" → { base: "document", extension: ".chat" }
 * - "document (2).chat" → { base: "document", extension: ".chat", number: 2 }
 * - "folder/file.chat" → { base: "folder/file", extension: ".chat" }
 */
export function extractFileNameParts(fileName: string): FileNameParts {
  // Find the last dot for extension
  const lastDotIndex = fileName.lastIndexOf('.');
  
  let base: string;
  let extension: string;
  
  if (lastDotIndex === -1) {
    // No extension
    base = fileName;
    extension = "";
  } else {
    base = fileName.substring(0, lastDotIndex);
    extension = fileName.substring(lastDotIndex);
  }
  
  // Check if base ends with a number in parentheses like " (2)"
  const numberMatch = base.match(/^(.+)\s+\((\d+)\)$/);
  
  if (numberMatch) {
    return {
      base: numberMatch[1],
      extension,
      number: parseInt(numberMatch[2], 10)
    };
  }
  
  return { base, extension };
}

/**
 * Finds the next available number for a file name
 * Example: if "document.chat" and "document (2).chat" exist, returns 3
 */
export function findNextAvailableNumber(
  baseName: string, 
  extension: string, 
  existingNames: string[]
): number {
  let number = 2; // Start with (2)
  
  while (true) {
    const candidateName = `${baseName} (${number})${extension}`;
    
    if (!existingNames.includes(candidateName)) {
      return number;
    }
    
    number++;
    
    // Safety check to prevent infinite loops
    if (number > 1000) {
      throw new Error("Too many file name conflicts - unable to generate unique name");
    }
  }
}

/**
 * Generates a unique file name by auto-numbering if conflicts exist
 * Examples:
 * - generateUniqueFileName("document.chat", ["other.chat"]) → "document.chat"
 * - generateUniqueFileName("document.chat", ["document.chat"]) → "document (2).chat"
 * - generateUniqueFileName("document.chat", ["document.chat", "document (2).chat"]) → "document (3).chat"
 */
export function generateUniqueFileName(
  desiredName: string, 
  existingNames: string[]
): string {
  // If the desired name doesn't conflict, use it as-is
  if (!existingNames.includes(desiredName)) {
    return desiredName;
  }
  
  // Extract parts from the desired name
  const parts = extractFileNameParts(desiredName);
  
  // If the desired name already has a number, use the base name for numbering
  const baseForNumbering = parts.base;
  
  // Find the next available number
  const nextNumber = findNextAvailableNumber(
    baseForNumbering, 
    parts.extension, 
    existingNames
  );
  
  return `${baseForNumbering} (${nextNumber})${parts.extension}`;
}

/**
 * Validates a file name for basic requirements
 * Returns an error message if invalid, null if valid
 */
export function validateFileName(fileName: string): string | null {
  if (!fileName || fileName.trim().length === 0) {
    return "File name cannot be empty";
  }
  
  const trimmed = fileName.trim();
  
  // Check for invalid characters (basic validation)
  const invalidChars = /[<>:"|?*\x00-\x1f]/;
  if (invalidChars.test(trimmed)) {
    return "File name contains invalid characters";
  }
  
  // Check for reserved names (Windows reserved names)
  const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)/i;
  if (reservedNames.test(trimmed)) {
    return "File name is a reserved system name";
  }
  
  // Check length (reasonable limit)
  if (trimmed.length > 255) {
    return "File name is too long (maximum 255 characters)";
  }
  
  return null;
}

/**
 * Checks if two file names would be considered duplicates
 * (case-insensitive comparison)
 */
export function areFileNamesDuplicate(name1: string, name2: string): boolean {
  return name1.toLowerCase() === name2.toLowerCase();
}

/**
 * Filters out duplicate names from an array (case-insensitive)
 */
export function findDuplicateNames(names: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  
  names.forEach(name => {
    const lowerName = name.toLowerCase();
    if (seen.has(lowerName)) {
      duplicates.add(name);
    } else {
      seen.add(lowerName);
    }
  });
  
  return Array.from(duplicates);
}