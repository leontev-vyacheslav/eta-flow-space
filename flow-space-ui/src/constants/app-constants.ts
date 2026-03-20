const APP_VERSION = 'v.0.0.1.20260128-151745';

const AppConstants = {
    appInfo: {
        companyName: 'Инженерный Центр Энерготехаудит©',
        title: 'FlowSpace ETA24™',
        version: APP_VERSION
    },

    noDataLongText: 'Нет данных для отображения',
    loadingDelay: 500,
    headerIconSize: 26,
    colors: {
        companyColor: '#2c394c',
        companyColorHighlight: '#e0e6eb',
        companyColorDarkHighlight: '#b1c1cd',
        companyMetroHover: '#0072C6',
        borderGreyColor: '#a3a3a3',
        themeBaseAccent: '#FF5722',
        baseDarkgreyTextColor: '#464646',

        normalDeviceStateColor: '#4CAF50',
        emergencyWarningColor: '#FFC107',
        emergencyCriticalColor: '#F44336',

    },
    identifiers: {
        connectionEmergencyReasonId: 100
    },
    mapDefaultZoom: 14,
    mapDefaultCenter: [51.50853, -0.12574] as [number, number],
    mapDefaultBoundsSetting: {
        padding: [40, 40],
        maxZoom: 14,
    },
    pageHeight: '75vh',
    formHeight: '65vh',
    chartHeight: '50vh'
};

export default AppConstants;
