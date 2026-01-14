/**
 * Normalize labels for better clarity
 * Replaces generic/ambiguous labels with explicit, human-readable ones
 */

export function normalizeExperienceLevel(level: string | null | undefined): string {
  if (!level || !level.trim()) {
    return 'Not specified';
  }
  
  const normalized = level.trim();
  
  // Replace ambiguous labels
  if (normalized.toLowerCase() === 'any') {
    return 'Not specified';
  }
  
  if (normalized.toLowerCase() === 'unknown') {
    return 'Unspecified experience';
  }
  
  return normalized;
}

export function normalizeEmploymentType(type: string | null | undefined): string {
  if (!type || !type.trim()) {
    return 'Not specified';
  }
  
  const normalized = type.trim();
  
  if (normalized.toLowerCase() === 'unknown') {
    return 'Not specified';
  }
  
  return normalized;
}

export function normalizeWorkMode(mode: string | null | undefined): string {
  if (!mode || !mode.trim()) {
    return 'Not specified';
  }
  
  const normalized = mode.trim();
  
  if (normalized.toLowerCase() === 'unknown') {
    return 'Not specified';
  }
  
  return normalized;
}

/**
 * Normalize all labels in a record
 */
export function normalizeLabels(
  data: Record<string, number>,
  normalizer: (label: string) => string
): Record<string, number> {
  const normalized: Record<string, number> = {};
  
  Object.entries(data).forEach(([key, value]) => {
    const normalizedKey = normalizer(key);
    normalized[normalizedKey] = (normalized[normalizedKey] || 0) + value;
  });
  
  return normalized;
}
