import AppConstants from '../../constants/app-constants';
import { ErrorIcon } from '../../constants/app-icons';
import PageHeader from '../../components/page-header/page-header';

export const NotFoundPage = () => {
    return (
        <>
            <PageHeader caption={ 'Страница не найдена' }>
                <ErrorIcon size={ AppConstants.headerIconSize } />
            </PageHeader>
            <div className={ 'content-block' }>
                <div className={ 'dx-card responsive-paddings' } style={ { minHeight: '300px' } }>
                    <p>Страница не существует или была удалена.</p>
                </div>
            </div>
        </>
    );
};
