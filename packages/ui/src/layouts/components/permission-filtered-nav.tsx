'use client';

import type { NavItemBaseProps } from '../../components/nav-section/types';
import { useMemo } from 'react';

// ----------------------------------------------------------------------

// Extended nav item with permission config
export interface NavItemWithPermission extends Omit<NavItemBaseProps, 'children'> {
  permission?: {
    resource: string;
    action: string;
  };
  children?: NavItemWithPermission[];
}

export interface NavGroupWithPermission {
  subheader?: string;
  items: NavItemWithPermission[];
}

// ----------------------------------------------------------------------

/**
 * Permission check function type.
 * Implement this in your app to check permissions.
 */
export type PermissionCheckFn = (resource: string, action: string) => boolean;

// ----------------------------------------------------------------------

interface PermissionFilteredNavProps {
  data: NavGroupWithPermission[];
  /**
   * Function to check if user has permission for a resource/action.
   * If not provided, all items will be shown.
   */
  hasPermission?: PermissionCheckFn;
  /**
   * Whether permissions are loading. If true, returns empty array.
   */
  loading?: boolean;
  children: (filteredData: { subheader?: string; items: NavItemBaseProps[] }[]) => React.ReactNode;
}

export function PermissionFilteredNav({
  data,
  hasPermission,
  loading = false,
  children
}: PermissionFilteredNavProps) {
  const filteredData = useMemo(() => {
    if (loading) return [];

    const filterNavItem = (item: NavItemWithPermission): NavItemBaseProps | null => {
      // If item has permission requirement and we have a check function, check it
      if (item.permission && hasPermission) {
        const hasAccess = hasPermission(
          item.permission.resource,
          item.permission.action
        );
        if (!hasAccess) return null;
      }

      // If item has children, filter them recursively
      if (item.children) {
        const filteredChildren = item.children
          .map(filterNavItem)
          .filter((child): child is NavItemBaseProps => child !== null);

        // If no children passed the filter, hide the parent too
        if (filteredChildren.length === 0) return null;

        // Return item with filtered children
        const { permission, ...baseItem } = item;
        return {
          ...baseItem,
          children: filteredChildren,
        };
      }

      // Return item without permission property
      const { permission, ...baseItem } = item;
      return baseItem;
    };

    const filterNavGroup = (group: NavGroupWithPermission): { subheader?: string; items: NavItemBaseProps[] } | null => {
      const filteredItems = group.items
        .map(filterNavItem)
        .filter((item): item is NavItemBaseProps => item !== null);

      // If no items in the group passed the filter, hide the group
      if (filteredItems.length === 0) return null;

      return {
        ...(group.subheader && { subheader: group.subheader }),
        items: filteredItems,
      };
    };

    return data
      .map(filterNavGroup)
      .filter((group): group is { subheader?: string; items: NavItemBaseProps[] } => group !== null);
  }, [data, hasPermission, loading]);

  return <>{children(filteredData)}</>;
}

// ----------------------------------------------------------------------

/**
 * Hook version for filtering nav data based on permissions.
 */
export function usePermissionFilteredNav(
  data: NavGroupWithPermission[],
  hasPermission?: PermissionCheckFn,
  loading?: boolean
): { subheader?: string; items: NavItemBaseProps[] }[] {
  return useMemo(() => {
    if (loading) return [];

    const filterNavItem = (item: NavItemWithPermission): NavItemBaseProps | null => {
      // If item has permission requirement and we have a check function, check it
      if (item.permission && hasPermission) {
        const hasAccess = hasPermission(
          item.permission.resource,
          item.permission.action
        );
        if (!hasAccess) return null;
      }

      // If item has children, filter them recursively
      if (item.children) {
        const filteredChildren = item.children
          .map(filterNavItem)
          .filter((child): child is NavItemBaseProps => child !== null);

        // If no children passed the filter, hide the parent too
        if (filteredChildren.length === 0) return null;

        // Return item with filtered children
        const { permission, ...baseItem } = item;
        return {
          ...baseItem,
          children: filteredChildren,
        };
      }

      // Return item without permission property
      const { permission, ...baseItem } = item;
      return baseItem;
    };

    const filterNavGroup = (group: NavGroupWithPermission): { subheader?: string; items: NavItemBaseProps[] } | null => {
      const filteredItems = group.items
        .map(filterNavItem)
        .filter((item): item is NavItemBaseProps => item !== null);

      // If no items in the group passed the filter, hide the group
      if (filteredItems.length === 0) return null;

      return {
        ...(group.subheader && { subheader: group.subheader }),
        items: filteredItems,
      };
    };

    return data
      .map(filterNavGroup)
      .filter((group): group is { subheader?: string; items: NavItemBaseProps[] } => group !== null);
  }, [data, hasPermission, loading]);
}
