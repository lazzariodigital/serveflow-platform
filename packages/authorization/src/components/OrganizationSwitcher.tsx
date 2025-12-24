'use client';

import { useOrganization } from '../hooks/use-organization';
import type { OrganizationInfo } from '../types';

// ════════════════════════════════════════════════════════════════
// Organization Switcher
// ════════════════════════════════════════════════════════════════
// Dropdown component for switching between organizations.
// Shows "All locations" option if user has full access.
// ════════════════════════════════════════════════════════════════

export interface OrganizationSwitcherProps {
  /** Custom class name */
  className?: string;
  /** Label for "All locations" option */
  allLocationsLabel?: string;
  /** Placeholder when no organization selected */
  placeholder?: string;
  /** Show badge for primary organization */
  showPrimaryBadge?: boolean;
  /** Custom render for trigger */
  renderTrigger?: (props: {
    currentOrganization: OrganizationInfo | null;
    hasFullAccess: boolean;
    isLoading: boolean;
  }) => React.ReactNode;
  /** Custom render for option */
  renderOption?: (props: {
    organization: OrganizationInfo;
    isPrimary: boolean;
    isSelected: boolean;
  }) => React.ReactNode;
  /** Callback when organization changes */
  onOrganizationChange?: (organization: OrganizationInfo | null) => void;
}

/**
 * Headless Organization Switcher component.
 * This is a minimal implementation - you can use it directly or as a reference
 * to build a custom component with your UI library.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <OrganizationSwitcher />
 *
 * // With custom styling
 * <OrganizationSwitcher
 *   className="w-64"
 *   allLocationsLabel="Todas las sedes"
 *   onOrganizationChange={(org) => console.log('Selected:', org)}
 * />
 * ```
 */
export function OrganizationSwitcher({
  className = '',
  allLocationsLabel = 'All locations',
  placeholder = 'Select location',
  showPrimaryBadge = true,
  renderTrigger,
  renderOption,
  onOrganizationChange,
}: OrganizationSwitcherProps) {
  const {
    currentOrganization,
    organizations,
    hasFullAccess,
    primaryOrganizationId,
    isLoading,
    setCurrentOrganization,
  } = useOrganization();

  // Handle selection change
  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;

    if (value === '' || value === '__all__') {
      setCurrentOrganization(null);
      onOrganizationChange?.(null);
    } else {
      const org = organizations.find((o) => o.id === value);
      if (org) {
        setCurrentOrganization(org);
        onOrganizationChange?.(org);
      }
    }
  };

  // If only one organization and no full access, show static display
  if (!hasFullAccess && organizations.length === 1) {
    return (
      <div className={className}>
        <span>{organizations[0].name}</span>
      </div>
    );
  }

  // If no organizations, show nothing or placeholder
  if (organizations.length === 0) {
    return null;
  }

  // Custom trigger render
  if (renderTrigger) {
    return (
      <div className={className}>
        {renderTrigger({ currentOrganization, hasFullAccess, isLoading })}
      </div>
    );
  }

  // Default select implementation
  return (
    <select
      className={className}
      value={currentOrganization?.id ?? '__all__'}
      onChange={handleChange}
      disabled={isLoading}
      aria-label="Select organization"
    >
      {/* "All locations" option for users with full access */}
      {hasFullAccess && (
        <option value="__all__">{allLocationsLabel}</option>
      )}

      {/* Organization options */}
      {organizations.map((org) => {
        const isPrimary = org.id === primaryOrganizationId;
        const isSelected = currentOrganization?.id === org.id;

        if (renderOption) {
          return (
            <option key={org.id} value={org.id}>
              {renderOption({ organization: org, isPrimary, isSelected })}
            </option>
          );
        }

        return (
          <option key={org.id} value={org.id}>
            {org.name}
            {showPrimaryBadge && isPrimary ? ' (Primary)' : ''}
          </option>
        );
      })}
    </select>
  );
}

/**
 * Get display text for current organization selection.
 * Useful for custom trigger implementations.
 */
export function getOrganizationDisplayText(
  currentOrganization: OrganizationInfo | null,
  hasFullAccess: boolean,
  allLocationsLabel = 'All locations'
): string {
  if (currentOrganization) {
    return currentOrganization.name;
  }

  if (hasFullAccess) {
    return allLocationsLabel;
  }

  return 'Select location';
}
