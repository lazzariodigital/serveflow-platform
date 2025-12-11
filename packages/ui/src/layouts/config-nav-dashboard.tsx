import { Iconify } from '../components/iconify';

// ----------------------------------------------------------------------

const icon = (name: string) => (
  <Iconify width={16} icon={name} />
);

export const ICONS = {
  dashboard: icon('solar:home-2-bold'),
  bookings: icon('solar:bookmark-bold-duotone'),
  calendar: icon('solar:calendar-mark-bold-duotone'),
  course: icon('solar:square-academic-cap-bold-duotone'),
  user: icon('solar:user-check-bold-duotone'),
  parameter: icon('solar:map-arrow-down-bold-duotone'),
  tour: icon('solar:map-arrow-down-bold-duotone'),
  invoice: icon('solar:wallet-money-bold-duotone'),
  job: icon('solar:pin-bold-duotone'),
  chat: icon('solar:chat-round-bold'),
  kanban: icon('solar:kanban-bold'),
  class: icon('solar:square-academic-cap-bold-duotone'),
  order: icon('solar:cart-large-2-bold-duotone'),
  payment: icon('solar:card-transfer-bold-duotone'),
  ranking: icon('solar:ranking-bold-duotone'),
  voucher: icon('solar:ticket-bold-duotone'),
  settings: icon('solar:settings-bold-duotone'),
  resource: icon('solar:layers-minimalistic-bold-duotone'),
  tournament: icon('solar:cup-bold-duotone'),
  discount: icon('solar:ticket-sale-bold-duotone'),
  external: icon('solar:external-link-bold-duotone'),
  accessControl: icon('solar:shield-user-bold-duotone'),
  roles: icon('solar:shield-user-bold'),
  teams: icon('solar:users-group-rounded-bold'),
  grants: icon('solar:key-bold')
};

// ----------------------------------------------------------------------

// Default empty nav data - apps should provide their own
export const navData: { subheader?: string; items: { title: string; path: string; icon?: React.ReactNode }[] }[] = [];
