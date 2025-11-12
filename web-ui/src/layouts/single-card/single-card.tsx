import ScrollView from 'devextreme-react/scroll-view';
import AppLogo from '../../assets/app-logo.svg?react';
import AppConstants from '../../constants/app-constants';
import './single-card.scss';
import { type SingleCardProps } from '../../models/single-card-props';

export const SingleCard = ({ title, description, children }: SingleCardProps) => (
    <ScrollView height={ '100vh' } width={ '100%' } className={ 'with-footer single-card' }>
        <div className={ 'dx-card content' }>
            <div className={ 'header' }>
                <div className={ 'header-title-logo-container' }>
                    <AppLogo width={ 60 }/>
                    <div>{ AppConstants.appInfo.title }</div>
                </div>
                <div className={ 'title' }>{ title }</div>
                <div className={ 'description' }>{ description }</div>
            </div>
            { children }
        </div>
    </ScrollView>
);
