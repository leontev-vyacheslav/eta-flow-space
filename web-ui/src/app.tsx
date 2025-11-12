import 'devextreme/dist/css/dx.common.css';
import './themes/generated/theme.base.css';
import './themes/generated/theme.additional.css';
import './dx-styles.scss';

import { HashRouter as BrowserRouter } from 'react-router-dom';
import { NavigationProvider } from './contexts/navigation';
import { AuthProvider, useAuth } from './contexts/auth';
import { useScreenSizeClass } from './utils/media-query';
import { AppSettingsProvider } from './contexts/app-settings';
import { AppDataProvider } from './contexts/app-data/app-data';
import { SharedAreaProvider } from './contexts/shared-area';
import ruMessages from 'devextreme/localization/messages/ru.json';
import { locale, loadMessages } from 'devextreme/localization';
import ContentAuth from './content-auth';
import ContentNonAuth from './content-non-auth';
import { WorkdatePickerProvider } from './contexts/workdate-context';
import Loader from './components/loader/loader';


function App() {
    const { user } = useAuth();

    if (user === undefined) {
        return null;
    }

    loadMessages(ruMessages);
    loadMessages({
        'ru': {
            'validation-compare-supply-temperature-return-temperature': 'Значение Тп всегда больше Тo',
            'validation-value-already-existed': 'Значение уже существует',
            'validation-range-formatted-with-values': 'Допустимые значения в диапазоне от {0} до {1}',
            'validation-range-overlapped': 'Перекрытие диапазонов',
            'confirm-dialog-delete-all-schedules': 'Удалить все дни?',
            'confirm-dialog-delete-all-schedule-windows': 'Удалить все окна?',
            'confirm-dialog-delete-all-points': 'Удалить все точки?',
            'confirm-dialog-reset-heating-circuit-settings': 'Сбросить настройки текущего контура?',
            'confirm-dialog-change-heating-circuit-type': 'Изменить тип контура и применить настройки по-умолчанию в соответствии с выбранным типом?',
            'confirm-dialog-system-reboot-request': 'Внимание! Действительно хотите выполнить перезапуск устройства!',
            'menu-item-delete-all-schedules': 'Удалить все дни...',
            'menu-item-delete-all-schedule-windows': 'Удалить все окна...',
            'menu-item-delete-all-points': 'Удалить все точки...',
            'menu-item-add-schedule-window': 'Добавить окно...',
            'menu-item-add-point': 'Добавить точку...',
            'menu-item-help': 'Справка...',
            'confirm-title': 'Подтвердить',
            'temperature-graph-title': 'Температурный график',
            'archives-graphs': 'Температурные графики',
            'schedule-windows-title': 'Временные окна',
            'schedules-title': 'Дни недели',
            'dxDataGrid-noDataText': 'Нет данных для отображения',

            'app-outdoor-temperature': 'Температура наружного воздуха, °C',
            'app-media-temperature': 'Температура носителя, °C',
            'app-measurement-time': 'Время измерения',
            'app-temperatures': 'Температуры, °C',

            'app-remote-connector-settings-applying': 'Изменения будут применены после перезапуска системы!'
        }
    });
    locale('ru-RU');

    return user === null ? <ContentNonAuth /> : <ContentAuth />
}

function Main() {
    const screenSizeClass = useScreenSizeClass();

    return (
        <BrowserRouter>
            <AuthProvider>
                <SharedAreaProvider>
                    <AppDataProvider>
                        <AppSettingsProvider>
                            <WorkdatePickerProvider>
                                <NavigationProvider>
                                    <div className={`app ${screenSizeClass}`}>
                                        <App />
                                        <Loader />
                                    </div>
                                </NavigationProvider>
                            </WorkdatePickerProvider>
                        </AppSettingsProvider>
                    </AppDataProvider>
                </SharedAreaProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default Main;
