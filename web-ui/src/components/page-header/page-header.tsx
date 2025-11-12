import type { PageHeaderProps } from '../../models/page-header-props';
import { MainMenu } from '../menu/main-menu/main-menu';

// Todo: css
const PageHeader = ({ caption, children, menuItems }: PageHeaderProps) => {
    return (
        <div style={ { color: 'rgba(0, 0, 0, 0.87)', display: 'flex', gap: 5, marginLeft: 15, marginRight: 15, marginTop: 10, alignItems: 'center' } }>
            { children }
            <h2 style={ { flex: 1 } }>{ typeof caption  === 'string' ? caption : caption()}</h2>
            { menuItems ? <MainMenu items={ menuItems } /> : null }
        </div>
    );
}

export default PageHeader;
