export type TabItem = {
  href: string;
  label: string;
  icon: "home" | "calendar" | "message-circle" | "user";
};

export const tabs: TabItem[] = [
  {
    href: "/",
    label: "Home",
    icon: "home",
  },
  {
    href: "/calendar",
    label: "Calendar",
    icon: "calendar",
  },
  {
    href: "/chat",
    label: "Chat",
    icon: "message-circle",
  },
  {
    href: "/me",
    label: "Me",
    icon: "user",
  },
];
