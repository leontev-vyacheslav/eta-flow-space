import type { IconTabProps } from '../../models/icon-tab-props';


const IconTab = ({ tab, icon }: IconTabProps ) => {
    return (
        <div style={ { display: 'flex', alignItems: 'center', gap: 5 } }>
            {icon}
            <span>{tab.title}</span>
        </div>
    );
}

export { IconTab };