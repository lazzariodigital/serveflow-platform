import type { NavSectionProps, NavItemDataProps } from '../../../components/nav-section';

// ----------------------------------------------------------------------

// Simple flattenArray implementation
function flattenArray<T>(arr: T[]): T[] {
  return arr.reduce((acc: T[], val) => {
    if (Array.isArray(val)) {
      return acc.concat(flattenArray(val));
    }
    return acc.concat(val);
  }, []);
}

// ----------------------------------------------------------------------

type ItemProps = {
  group: string;
  title: string;
  path: string;
};

export function getAllItems({ data }: { data: NavSectionProps['data'] }) {
  const reduceItems = data.map((list) => handleLoop(list.items, list.subheader)).flat();

  const items = flattenArray(reduceItems).map((option) => {
    const group = splitPath(reduceItems, option.path);

    return {
      group: group && group.length > 1 ? group[0] : option.subheader,
      title: option.title,
      path: option.path,
    };
  });

  return items;
}

// ----------------------------------------------------------------------

type ApplyFilterProps = {
  inputData: ItemProps[];
  query: string;
};

export function applyFilter({ inputData, query }: ApplyFilterProps) {
  if (query) {
    inputData = inputData.filter(
      (item) =>
        item.title.toLowerCase().indexOf(query.toLowerCase()) !== -1 ||
        item.path.toLowerCase().indexOf(query.toLowerCase()) !== -1
    );
  }

  return inputData;
}

// ----------------------------------------------------------------------

export function splitPath(array: NavItemDataProps[], key: string) {
  let stack = array.map((item) => ({ path: [item.title], currItem: item }));

  while (stack.length) {
    const { path, currItem } = stack.pop() as {
      path: string[];
      currItem: NavItemDataProps;
    };

    if (currItem.path === key) {
      return path;
    }

    if (currItem.children?.length) {
      stack = stack.concat(
        currItem.children.map((item: NavItemDataProps) => ({
          path: path.concat(item.title),
          currItem: item,
        }))
      );
    }
  }
  return null;
}

// ----------------------------------------------------------------------

export function handleLoop(array: any, subheader?: string) {
  return array?.map((list: any) => ({
    subheader,
    ...list,
    ...(list.children && { children: handleLoop(list.children, subheader) }),
  }));
}

// ----------------------------------------------------------------------

type GroupsProps = {
  [key: string]: ItemProps[];
};

export function groupItems(array: ItemProps[]) {
  const group = array.reduce((groups: GroupsProps, item) => {
    groups[item.group] = groups[item.group] || [];

    groups[item.group].push(item);

    return groups;
  }, {});

  return group;
}
