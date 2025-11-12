import type { ClickEvent } from 'devextreme/ui/button';

export type HeaderProps = {
  title: string;

  menuToggleEnabled: boolean;

  toggleMenu:  ((e: ClickEvent) => void) | undefined;
}
