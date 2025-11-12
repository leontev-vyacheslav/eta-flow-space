import './footer.scss';
import { useAppSettings } from '../../contexts/app-settings';

export const Footer = ({ ...rest }) => {
    const { appSettingsData: { isShowFooter: isShowFooter } } = useAppSettings();
    return isShowFooter ? <footer className={ 'footer' } { ...rest } /> : null;
};
