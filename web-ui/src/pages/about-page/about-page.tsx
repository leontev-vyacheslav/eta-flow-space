import './about-page.scss';
import AppConstants from '../../constants/app-constants';
import { AboutIcon } from '../../constants/app-icons';
import PageHeader from '../../components/page-header/page-header';
import AppAbout  from '../../assets/app-about.svg?react'


export const AboutPage = () => {

    return (
        <>
            <PageHeader caption={ 'О программе' }>
                <AboutIcon size={ AppConstants.headerIconSize } />
            </PageHeader>
            <div className={ 'content-block' }>
                <div className={ 'dx-card responsive-paddings' }>
                    <div className={ 'about-app-info' } style={ { display: 'flex', flexDirection: 'row' } }>
                        <AppAbout />
                        <div>
                            <p className={ 'about-app-title' }>{`${AppConstants.appInfo.title}${AppConstants.appInfo.version}`}</p>
                            <p className={ 'about-app-company' }>{AppConstants.appInfo.companyName}</p>
                            <p>Все права сохранены.</p>
                        </div>
                    </div>
                    <div>
                        <p>ООО КФ {AppConstants.appInfo.companyName}</p>
                        <p>420124, г. Казань, ул. Меридианная, д.6</p>
                        <p>тел./факс +7(843)211–10–10</p>
                        <p>E-mail: kazan@ic-eta.ru</p>
                    </div>
                </div>
            </div>
        </>
    )
};

