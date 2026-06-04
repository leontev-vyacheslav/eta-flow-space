import './footer.scss';
import { useAppSettingsStore } from '../../contexts/app-settings-store';

export const Footer = ({ ...rest }) => {
    const isShowFooter = useAppSettingsStore((s) => s.appSettingsData.isShowFooter);
    return isShowFooter ? <footer className={'footer'} {...rest} /> : null;
};
