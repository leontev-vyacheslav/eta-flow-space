export const MapNoDataOverlay = () => {
    return (
        <div className="leaflet-middle leaflet-center leaflet-control"
            style={{
                position: 'absolute',
                zIndex: 1000,
                pointerEvents: 'none',
                top: '50%',
                left: '50%',
                fontSize: `14px`,
                transform: 'translate(-50%, -50%)',
                background: 'rgba(255, 255, 255, 0.9)',
                padding: '20px 50px',
            }}>
            <div className="leaflet-control leaflet-bar" style={{ border: 'none' }}>Нет данных</div>
        </div>
    );
};
