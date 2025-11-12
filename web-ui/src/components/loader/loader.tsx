import  ProgressGear  from '../../assets/progress-gears.svg?react';
import LoadPanel from 'devextreme-react/load-panel';
import './loader.scss';

const Loader = () => {
    return (
        <LoadPanel
            id='app-loader'
            visible={true}
            position={{ of: 'body', offset: { x: 0, y: -50 } }}
            showPane={true}
            shading={true}
            width={200}
            height={70}
            // minWidth={ 200 }
            maxWidth={undefined}
            maxHeight={70}
            shadingColor={'rgba(0, 0, 0, 0.15)'}
        >
            <ProgressGear />
            <span>Загрузка...</span>
        </LoadPanel>
    );
};

export default Loader;
